import { Router, Request, Response } from 'express';
import { db, StorageConfigurationError } from './db.js';
import {
  authenticateToken,
  requireAuthorizedOfficerOrAdmin,
  requireAdmin,
  verifyAccessCodeConstantTime,
  checkEnrollmentRateLimit,
  recordFailedEnrollment,
  clearEnrollmentRateLimit,
  isProductionAuth,
} from './auth.js';
import {
  calculateMetrics,
  resolveFinalRisk,
  CalculationValidationError,
} from './calculations.js';
import { runGeminiVerification, askGeminiAssistant } from './gemini.js';
import { MANDATORY_DISCLAIMER } from './safety.js';
import { LoanApplication, VerificationResult } from '../src/types.js';
import { runAcceptanceTests } from './test-runner.js';

export const apiRouter = Router();

// Track in-flight verification requests to prevent race conditions & double-spend
const activeVerificationRuns = new Set<string>();

/**
 * GET /api/health
 * Public health check returning non-sensitive operational status and auth mode.
 */
apiRouter.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'ClaimClarity AI Verification Engine',
    authMode: isProductionAuth() ? 'PRODUCTION' : 'DEVELOPMENT',
  });
});

/**
 * GET /api/status
 * Administrator-only endpoint returning truthful system implementation status.
 * Ordinary officers are blocked with 403 Forbidden.
 */
apiRouter.get('/status', authenticateToken, requireAdmin, (_req: Request, res: Response) => {
  const dbStatus = db.getStatus();
  const hasGeminiKey = Boolean(
    process.env.GEMINI_API_KEY &&
      process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY' &&
      process.env.GEMINI_API_KEY !== 'your-gemini-api-key'
  );

  res.json({
    geminiStatus: hasGeminiKey ? 'CONFIGURED' : 'NOT CONFIGURED',
    firestoreStatus: dbStatus.isFirestoreConfigured
      ? 'CONNECTED'
      : dbStatus.activeStorageMode === 'ERROR'
      ? 'ERROR'
      : 'NOT CONFIGURED',
    databaseId: dbStatus.databaseId,
    projectId: dbStatus.projectId || 'Unlinked',
    storageMode: dbStatus.activeStorageMode,
    storageLabel: dbStatus.storageLabel,
    storageError: dbStatus.error || null,
    models: {
      primary: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
      fallback: process.env.GEMINI_FALLBACK_MODEL || 'gemini-3.1-flash-lite',
    },
  });
});

/**
 * GET /api/admin/diagnostics
 * Detailed administrator-only developer diagnostics & integration status without secret leakage.
 */
apiRouter.get('/admin/diagnostics', authenticateToken, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const dbStatus = db.getStatus();
    const hasGeminiKey = Boolean(
      process.env.GEMINI_API_KEY &&
        process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY' &&
        process.env.GEMINI_API_KEY !== 'your-gemini-api-key'
    );

    let applications: LoanApplication[] = [];
    let officers: any[] = [];
    let dbError: string | null = dbStatus.error;

    try {
      applications = await db.getAllApplications();
      officers = await db.getAllAuthorizedOfficers();
    } catch (storageErr: any) {
      dbError = storageErr?.message || dbStatus.error;
    }

    res.json({
      gemini: {
        status: hasGeminiKey ? 'CONFIGURED' : 'NOT CONFIGURED',
        primaryModel: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
        fallbackModel: process.env.GEMINI_FALLBACK_MODEL || 'gemini-3.1-flash-lite',
        safetyFilterEnforced: true,
        guardrailSummary: 'Non-discretionary verification assistant; loan sanction/rejection recommendations prohibited',
      },
      firestore: {
        status: dbStatus.isFirestoreConfigured
          ? 'CONNECTED'
          : dbStatus.activeStorageMode === 'ERROR'
          ? 'ERROR'
          : 'NOT CONFIGURED',
        storageMode: dbStatus.activeStorageMode,
        storageLabel: dbStatus.storageLabel,
        databaseId: dbStatus.databaseId,
        projectId: dbStatus.projectId || (dbStatus.activeStorageMode === 'LOCAL_DEMO' ? 'Local Demo (No Cloud Project)' : 'Unlinked'),
        error: dbError || null,
      },
      auth: {
        status: 'CONFIGURED',
        adminEmail: process.env.ADMIN_EMAIL || 'padduhoney150@gmail.com',
        enrolledOfficersCount: officers.length,
        securityAlgorithm: 'SHA-256 constant-time comparison with 5-attempt rate limiter',
        mode: 'Firebase Auth + Local Fallback',
      },
      cloudGate: {
        isProvisioned: false,
        requiresExplicitConfirmation: true,
        targetRegion: 'asia-south1 (Mumbai)',
        targetProject: 'claimclarity-ai-2026',
        costScope: 'Zero-cost prototype guarantee within GCP Free Tier',
        safeguardsActive: true,
      },
      health: {
        service: 'ClaimClarity AI Verification Engine',
        status: 'ok',
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
        activeApplicationsCount: applications.length,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to generate developer diagnostics report.' });
  }
});

/**
 * GET /api/admin/diagnostics/tests
 * Administrator-only live test execution runner and audit report.
 */
apiRouter.get('/admin/diagnostics/tests', authenticateToken, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const summary = await runAcceptanceTests();
    res.json({
      success: true,
      summary,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to execute test suite.' });
  }
});

/**
 * GET /api/me
 * Returns current authenticated user's profile and RBAC role.
 */
apiRouter.get('/me', authenticateToken, (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  res.json({
    uid: req.user.uid,
    email: req.user.email,
    emailVerified: req.user.emailVerified,
    role: req.user.role,
  });
});

/**
 * POST /api/enrollment
 * Officer enrollment code validation with SHA-256 timingSafeEqual & rate limiter.
 */
apiRouter.post('/enrollment', authenticateToken, async (req: Request, res: Response) => {
  const user = req.user!;
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const accessCode = typeof body.accessCode === 'string' ? body.accessCode : '';

  // Enforce verified identity: unverified emails cannot enroll as credit verification officers
  if (user.emailVerified === false) {
    return res.status(403).json({
      error: 'Access denied: Email verification required. Please verify your Google account email before enrolling.',
      code: 'EMAIL_VERIFICATION_REQUIRED',
    });
  }

  // Check rate limit (max 5 failed attempts within 15 minutes)
  const rateLimit = checkEnrollmentRateLimit(user.uid);
  if (!rateLimit.allowed) {
    return res.status(429).json({
      error: `Too many failed enrollment attempts. Please try again in ${rateLimit.retryAfterSeconds} seconds.`,
      retryAfterSeconds: rateLimit.retryAfterSeconds,
    });
  }

  // Check if already authorized
  if (user.role === 'admin' || user.role === 'officer') {
    return res.json({
      success: true,
      role: user.role,
      message: 'User is already authorized.',
    });
  }

  // Constant-time hash verification
  const isValid = verifyAccessCodeConstantTime(accessCode);

  if (!isValid) {
    recordFailedEnrollment(user.uid);
    return res.status(401).json({
      error: 'Invalid authorization code. Please verify the code with your bank administrator.',
    });
  }

  // Successful enrollment
  clearEnrollmentRateLimit(user.uid);

  const officerRecord = {
    uid: user.uid,
    email: user.email,
    enrolledAt: new Date().toISOString(),
  };

  try {
    await db.enrollOfficer(officerRecord);
    return res.json({
      success: true,
      role: 'officer',
      message: 'Officer access enrolled successfully.',
    });
  } catch (err: any) {
    if (err instanceof StorageConfigurationError) {
      return res.status(500).json({ error: err.message, code: err.code });
    }
    return res.status(500).json({
      error: 'Failed to complete enrollment due to internal storage error.',
    });
  }
});

/**
 * GET /api/applications
 * Returns all fictional loan applications for authorized officers/admins.
 */
apiRouter.get(
  '/applications',
  authenticateToken,
  requireAuthorizedOfficerOrAdmin,
  async (_req: Request, res: Response) => {
    try {
      const applications = await db.getAllApplications();
      res.json({ applications });
    } catch (err: any) {
      if (err instanceof StorageConfigurationError) {
        return res.status(500).json({ error: err.message, code: err.code });
      }
      res.status(500).json({ error: 'Failed to retrieve applications.' });
    }
  }
);

/**
 * GET /api/applications/:id
 * Retrieves a single application record with recalculated metrics.
 */
apiRouter.get(
  '/applications/:id',
  authenticateToken,
  requireAuthorizedOfficerOrAdmin,
  async (req: Request, res: Response) => {
    try {
      const app = await db.getApplicationById(req.params.id);
      if (!app) {
        return res.status(404).json({ error: 'Application not found.' });
      }

      const metrics = calculateMetrics(app.declaredMonthlyIncome, app.salaryCredits, app.documents);
      res.json({ application: app, metrics });
    } catch (err: any) {
      if (err instanceof StorageConfigurationError) {
        return res.status(500).json({ error: err.message, code: err.code });
      }
      res.status(500).json({ error: 'Failed to retrieve application details.' });
    }
  }
);

/**
 * POST /api/applications/:id/verify
 * Executes server-side Gemini verification and persists the result.
 */
apiRouter.post(
  '/applications/:id/verify',
  authenticateToken,
  requireAuthorizedOfficerOrAdmin,
  async (req: Request, res: Response) => {
    const appId = req.params.id;

    if (activeVerificationRuns.has(appId)) {
      return res.status(409).json({
        error: 'Verification is currently in progress for this application. Please wait.',
      });
    }

    try {
      activeVerificationRuns.add(appId);

      const app = await db.getApplicationById(appId);
      if (!app) {
        return res.status(404).json({ error: 'Application not found.' });
      }

      // Calculate authoritative server-side baseline metrics
      const metrics = calculateMetrics(app.declaredMonthlyIncome, app.salaryCredits, app.documents);

      // Call Gemini with fallback and safety checks
      const { result: rawAi, modelUsed } = await runGeminiVerification(app);

      // Determine final risk: LOW < MEDIUM < HIGH, never lower than baseline
      const finalRisk = resolveFinalRisk(metrics.baselineRisk, rawAi.riskLevel);

      // Status rule: Verified only if finalRisk === 'LOW' AND all docs verified
      const allDocsVerified = metrics.pendingDocs === 0 && metrics.missingDocs === 0;
      const finalStatus = finalRisk === 'LOW' && allDocsVerified ? 'Verified' : 'Needs Review';

      const verificationResult: VerificationResult = {
        riskLevel: finalRisk,
        aiRiskLevel: rawAi.riskLevel,
        baselineRisk: metrics.baselineRisk,
        findings: rawAi.findings,
        discrepancies: rawAi.discrepancies,
        missingDocuments: rawAi.missingDocuments,
        verificationActions: rawAi.verificationActions,
        explanation: rawAi.explanation,
        advisory: MANDATORY_DISCLAIMER,
        model: modelUsed,
        verifiedBy: req.user!.email,
        verifiedAt: new Date().toISOString(),
        isStale: false,
      };

      const updatedApp: LoanApplication = {
        ...app,
        risk: finalRisk,
        status: finalStatus,
        verification: verificationResult,
        updatedAt: new Date().toISOString(),
      };

      // Persist updated application in database
      await db.saveApplication(updatedApp);

      res.json({
        success: true,
        application: updatedApp,
        verification: verificationResult,
      });
    } catch (err: any) {
      const errMsg = err?.message || 'Verification process encountered an unexpected failure.';
      if (errMsg.includes('GEMINI_NOT_CONFIGURED')) {
        res.status(400).json({
          error: 'Live Gemini verification is unconfigured. All baseline financial metrics, average salary credit comparisons, and document checks remain fully operational. To execute live AI audits, set GEMINI_API_KEY in the Secrets panel.',
          isUnconfigured: true,
        });
      } else {
        res.status(500).json({ error: errMsg });
      }
    } finally {
      activeVerificationRuns.delete(appId);
    }
  }
);

/**
 * POST /api/applications/:id/chat
 * Application-specific AI assistant querying application facts & saved verification results.
 */
apiRouter.post(
  '/applications/:id/chat',
  authenticateToken,
  requireAuthorizedOfficerOrAdmin,
  async (req: Request, res: Response) => {
    const appId = req.params.id;
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const question = typeof body.question === 'string' ? body.question : '';
    const history = Array.isArray(body.history) ? body.history : [];

    if (!question.trim()) {
      return res.status(400).json({ error: 'Question cannot be empty.' });
    }

    try {
      const app = await db.getApplicationById(appId);
      if (!app) {
        return res.status(404).json({ error: 'Application not found.' });
      }

      const { answer, modelUsed } = await askGeminiAssistant(app, question, history);

      res.json({
        answer,
        model: modelUsed,
        advisory: MANDATORY_DISCLAIMER,
      });
    } catch (err: any) {
      const errMsg = err?.message || 'Assistant failed to generate an answer.';
      if (errMsg.includes('GEMINI_NOT_CONFIGURED')) {
        return res.status(400).json({
          error: 'AI Assistant is unconfigured. All application records, metrics, and document statuses are available. To query the assistant, set GEMINI_API_KEY in the Secrets panel.',
          isUnconfigured: true,
        });
      }

      const isUnavailable =
        err?.statusCode === 503 ||
        err?.isUpstreamUnavailable ||
        errMsg.includes('503') ||
        errMsg.includes('temporarily unavailable') ||
        errMsg.includes('UNAVAILABLE') ||
        errMsg.includes('overloaded') ||
        errMsg.includes('429') ||
        errMsg.includes('RESOURCE_EXHAUSTED') ||
        errMsg.includes('timed out') ||
        errMsg.includes('fetch failed') ||
        errMsg.includes('ECONNRESET');

      if (isUnavailable) {
        return res.status(503).json({
          error: 'The AI assistant is temporarily unavailable. Please retry shortly.',
          isUnavailable: true,
        });
      }

      // Never expose raw JSON, stack traces, or internal provider errors
      let sanitized = 'The AI assistant is temporarily unavailable. Please retry shortly.';
      if (
        typeof errMsg === 'string' &&
        !errMsg.includes('{') &&
        !errMsg.includes('at ') &&
        !errMsg.includes('http') &&
        !errMsg.includes('google.rpc') &&
        !errMsg.includes('ErrorInfo') &&
        !errMsg.includes('GoogleGenAI')
      ) {
        sanitized = errMsg;
      }
      return res.status(500).json({ error: sanitized });
    }
  }
);

// ==========================================
// ADMINISTRATOR-ONLY ROUTES
// ==========================================

/**
 * GET /api/admin/officers
 * Lists all enrolled officers.
 */
apiRouter.get('/admin/officers', authenticateToken, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const officers = await db.getAllAuthorizedOfficers();
    res.json({ officers });
  } catch (err: any) {
    if (err instanceof StorageConfigurationError) {
      return res.status(500).json({ error: err.message, code: err.code });
    }
    res.status(500).json({ error: 'Failed to retrieve officer directory.' });
  }
});

/**
 * DELETE /api/admin/officers/:uid
 * Revokes officer access.
 */
apiRouter.delete('/admin/officers/:uid', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const uid = req.params.uid;
    const success = await db.revokeOfficer(uid);
    res.json({ success, message: `Access for officer ${uid} has been revoked.` });
  } catch (err: any) {
    if (err instanceof StorageConfigurationError) {
      return res.status(500).json({ error: err.message, code: err.code });
    }
    res.status(500).json({ error: 'Failed to revoke officer access.' });
  }
});

/**
 * POST /api/admin/applications
 * Creates a new fictional test application.
 */
apiRouter.post('/admin/applications', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const { customer, loan, declaredMonthlyIncome, salaryCredits, documents } = body;

    // Validate customer details
    if (
      !customer ||
      typeof customer.name !== 'string' ||
      !customer.name.trim() ||
      typeof customer.age !== 'number' ||
      customer.age < 18 ||
      customer.age > 100 ||
      typeof customer.employer !== 'string' ||
      typeof customer.city !== 'string' ||
      typeof customer.employment !== 'string'
    ) {
      return res.status(400).json({
        error: 'Invalid customer details. Name, age (18-100), employer, city, and employment are required.',
      });
    }

    // Validate loan details
    if (
      !loan ||
      typeof loan.type !== 'string' ||
      typeof loan.amount !== 'number' ||
      loan.amount <= 0 ||
      typeof loan.tenureMonths !== 'number' ||
      loan.tenureMonths <= 0 ||
      typeof loan.purpose !== 'string'
    ) {
      return res.status(400).json({
        error: 'Invalid loan details. Type, positive amount, positive tenureMonths, and purpose are required.',
      });
    }

    // Calculate metrics and baseline risk
    const metrics = calculateMetrics(declaredMonthlyIncome, salaryCredits, documents);

    const newId = await db.getNextApplicationId();

    const newApp: LoanApplication = {
      id: newId,
      customer: {
        name: customer.name.trim(),
        age: customer.age,
        employer: customer.employer.trim(),
        city: customer.city.trim(),
        employment: customer.employment.trim(),
      },
      loan: {
        type: loan.type.trim(),
        amount: loan.amount,
        tenureMonths: loan.tenureMonths,
        purpose: loan.purpose.trim(),
      },
      declaredMonthlyIncome,
      salaryCredits,
      avgSalaryCredit: metrics.avgSalaryCredit,
      incomeGapPct: metrics.incomeGapPct,
      documents,
      status: 'Processing',
      risk: metrics.baselineRisk,
      verification: null,
      dataOrigin: 'Fictional Demo Data',
      isSeedRecord: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const saved = await db.saveApplication(newApp);
    res.status(201).json({ success: true, application: saved });
  } catch (err: any) {
    if (err instanceof CalculationValidationError) {
      return res.status(400).json({ error: err.message });
    }
    if (err instanceof StorageConfigurationError) {
      return res.status(500).json({ error: err.message, code: err.code });
    }
    res.status(500).json({ error: err?.message || 'Failed to create test application.' });
  }
});

/**
 * PATCH /api/admin/applications/:id
 * Edits an existing fictional application and invalidates any stale verification.
 */
apiRouter.patch('/admin/applications/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const existing = await db.getApplicationById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Application not found.' });
    }

    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const declaredMonthlyIncome =
      typeof body.declaredMonthlyIncome === 'number'
        ? body.declaredMonthlyIncome
        : existing.declaredMonthlyIncome;
    const salaryCredits = Array.isArray(body.salaryCredits)
      ? body.salaryCredits
      : existing.salaryCredits;
    const documents = Array.isArray(body.documents) ? body.documents : existing.documents;

    // Recalculate metrics
    const metrics = calculateMetrics(declaredMonthlyIncome, salaryCredits, documents);

    // Merge updates
    const updated: LoanApplication = {
      ...existing,
      customer: body.customer ? { ...existing.customer, ...body.customer } : existing.customer,
      loan: body.loan ? { ...existing.loan, ...body.loan } : existing.loan,
      declaredMonthlyIncome,
      salaryCredits,
      documents,
      avgSalaryCredit: metrics.avgSalaryCredit,
      incomeGapPct: metrics.incomeGapPct,
      risk: metrics.baselineRisk,
      // Mark old verification as stale if data changed
      verification: existing.verification
        ? {
            ...existing.verification,
            isStale: true,
          }
        : null,
      updatedAt: new Date().toISOString(),
    };

    const saved = await db.saveApplication(updated);
    res.json({ success: true, application: saved });
  } catch (err: any) {
    if (err instanceof CalculationValidationError) {
      return res.status(400).json({ error: err.message });
    }
    if (err instanceof StorageConfigurationError) {
      return res.status(500).json({ error: err.message, code: err.code });
    }
    res.status(500).json({ error: err?.message || 'Failed to update test application.' });
  }
});

/**
 * DELETE /api/admin/applications
 * Handle missing application ID
 */
apiRouter.delete('/admin/applications', authenticateToken, requireAdmin, (_req: Request, res: Response) => {
  res.status(400).json({ error: 'Application ID is required.' });
});

/**
 * DELETE /api/admin/applications/:id
 * Deletes an additional fictional test application.
 */
apiRouter.delete('/admin/applications/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const rawId = req.params.id;
    const id = typeof rawId === 'string' ? rawId.trim() : '';

    if (!id) {
      return res.status(400).json({ error: 'Application ID is required.' });
    }

    if (['APP-1001', 'APP-1002', 'APP-1003'].includes(id)) {
      return res.status(403).json({
        error: 'Cannot delete original seed demo applications: APP-1001, APP-1002, and APP-1003 are protected.',
      });
    }

    const success = await db.deleteApplication(id);
    if (!success) {
      return res.status(404).json({ error: `Application not found: ${id}` });
    }
    res.json({ success: true, message: `Application ${id} deleted successfully.` });
  } catch (err: any) {
    if (err instanceof StorageConfigurationError) {
      return res.status(500).json({ error: err.message, code: err.code });
    }
    res.status(400).json({ error: err?.message || 'Failed to delete application.' });
  }
});

/**
 * POST /api/admin/reset-demo-data
 * Resets application records back to the 3 original seed records and clears verification results.
 */
apiRouter.post('/admin/reset-demo-data', authenticateToken, requireAdmin, async (_req: Request, res: Response) => {
  try {
    await db.resetDemoData();
    const freshApps = await db.getAllApplications();
    res.json({
      success: true,
      message: 'Demo applications have been restored to their original seed state.',
      applications: freshApps,
    });
  } catch (err: any) {
    if (err instanceof StorageConfigurationError) {
      return res.status(500).json({ error: err.message, code: err.code });
    }
    res.status(500).json({ error: err?.message || 'Failed to reset demo records.' });
  }
});
