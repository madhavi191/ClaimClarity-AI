import { GoogleGenAI, Type } from '@google/genai';
import { LoanApplication, RiskLevel } from '../src/types.js';
import { calculateMetrics, formatINR } from './calculations.js';
import {
  STRICT_SYSTEM_SAFETY_INSTRUCTION,
  validateVerificationPayloadSafety,
  validateTextSafety,
  enforceAssistantSafetyBoundary,
  SAFE_REGULATORY_EXPLANATION,
  MANDATORY_DISCLAIMER,
} from './safety.js';

export class UpstreamServiceUnavailableError extends Error {
  public statusCode = 503;
  public isUpstreamUnavailable = true;
  constructor(message = 'The AI assistant is temporarily unavailable. Please retry shortly.') {
    super(message);
    this.name = 'UpstreamServiceUnavailableError';
  }
}

export interface RawAiVerificationResponse {
  riskLevel: RiskLevel;
  findings: string[];
  discrepancies: string[];
  missingDocuments: string[];
  verificationActions: string[];
  explanation: string;
}

const VERIFICATION_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    riskLevel: {
      type: Type.STRING,
      description: "Assessed risk level: LOW, MEDIUM, or HIGH",
    },
    findings: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "2 to 5 factual verification observations",
    },
    discrepancies: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of identified financial or documentation discrepancies",
    },
    missingDocuments: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of missing or pending documents requiring attention",
    },
    verificationActions: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "1 to 5 neutral verification follow-up checks for the officer",
    },
    explanation: {
      type: Type.STRING,
      description: "A concise 2 to 3 sentence factual explanation of the verification findings",
    },
  },
  required: [
    'riskLevel',
    'findings',
    'discrepancies',
    'missingDocuments',
    'verificationActions',
    'explanation',
  ],
};

function getGeminiClient(): { client: GoogleGenAI; primaryModel: string; fallbackModel?: string } {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey === 'MY_GEMINI_API_KEY' || apiKey === 'your-gemini-api-key') {
    throw new Error('GEMINI_NOT_CONFIGURED: Valid GEMINI_API_KEY environment variable is missing.');
  }

  const primaryModel = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
  const fallbackModel = process.env.GEMINI_FALLBACK_MODEL || 'gemini-3.1-flash-lite';

  const client = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  return { client, primaryModel, fallbackModel };
}

/**
 * Executes a call with a 30-second timeout
 */
async function withTimeout<T>(promise: Promise<T>, timeoutMs = 30000): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`Operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timer!);
  }
}

/**
 * Formats loan application facts into a structured prompt context
 */
function buildApplicationFacts(app: LoanApplication): string {
  const metrics = calculateMetrics(app.declaredMonthlyIncome, app.salaryCredits, app.documents);

  return `
APPLICATION RECORD:
- Application ID: ${app.id}
- Customer Name: ${app.customer.name} (Fictional Demo Applicant)
- Age: ${app.customer.age}
- Employer: ${app.customer.employer}
- City: ${app.customer.city}
- Employment Type: ${app.customer.employment}
- Loan Type: ${app.loan.type}
- Loan Amount: ${formatINR(app.loan.amount)}
- Tenure: ${app.loan.tenureMonths} months
- Purpose: ${app.loan.purpose}

FINANCIAL DATA:
- Declared Monthly Income: ${formatINR(app.declaredMonthlyIncome)}
- Observed Salary Credits: [${app.salaryCredits.map((c) => formatINR(c)).join(', ')}]
- Calculated Average Salary Credit: ${formatINR(Math.round(metrics.avgSalaryCredit))} (Exact: ${metrics.avgSalaryCredit.toFixed(2)})
- Income Discrepancy Gap: ${metrics.incomeGapPct.toFixed(2)}% (${metrics.isSurplus ? 'Salary credit surplus' : 'Salary credit shortfall'})

DOCUMENT CHECKLIST:
${app.documents.map((d) => `- ${d.name}: ${d.status}`).join('\n')}

DETERMINISTIC BASELINE RISK ENGINE:
- Baseline Risk Assessment: ${metrics.baselineRisk}
- Verified Documents: ${metrics.verifiedDocs}/${metrics.totalDocs} (${metrics.completenessPct.toFixed(0)}%)
- Pending Documents: ${metrics.pendingDocs}
- Missing Documents: ${metrics.missingDocs}
`;
}

/**
 * Live Gemini verification analysis for a loan application.
 */
export async function runGeminiVerification(
  app: LoanApplication,
  retryCount = 0
): Promise<{ result: RawAiVerificationResponse; modelUsed: string }> {
  const { client, primaryModel, fallbackModel } = getGeminiClient();
  const modelsToTry = [primaryModel];
  if (fallbackModel && fallbackModel !== primaryModel) {
    modelsToTry.push(fallbackModel);
  }
  modelsToTry.push('gemini-flash-latest');

  const appFacts = buildApplicationFacts(app);
  const prompt = `
Analyze the following fictional loan application record for document verification and income consistency:
${appFacts}

TASK:
1. Compare declared monthly income with actual salary credits. Note any discrepancy or shortfall.
2. Review document verification statuses (Verified, Pending, Missing).
3. Provide objective verification findings and list missing or pending documents.
4. Recommend neutral follow-up verification actions for the reviewing human officer.
5. Provide a 2-3 sentence factual explanation.
6. Assess advisory riskLevel as LOW, MEDIUM, or HIGH based on document completeness and income discrepancy.
`;

  let lastError: Error | null = null;
  let modelUsed = primaryModel;

  for (const model of modelsToTry) {
    try {
      modelUsed = model;
      const apiCall = client.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction: STRICT_SYSTEM_SAFETY_INSTRUCTION,
          temperature: 0.1,
          responseMimeType: 'application/json',
          responseSchema: VERIFICATION_RESPONSE_SCHEMA,
        },
      });

      const response = await withTimeout(apiCall, 30000);
      const text = response.text?.trim();
      if (!text) {
        throw new Error('Gemini returned an empty response.');
      }

      const parsed: RawAiVerificationResponse = JSON.parse(text);

      // Validate schema values strictly
      if (!['LOW', 'MEDIUM', 'HIGH'].includes(parsed.riskLevel)) {
        throw new Error(`Invalid riskLevel "${parsed.riskLevel}" returned by model.`);
      }
      if (!Array.isArray(parsed.findings) || parsed.findings.length < 2 || parsed.findings.length > 5) {
        throw new Error('findings must contain between 2 and 5 items.');
      }
      if (!Array.isArray(parsed.verificationActions) || parsed.verificationActions.length < 1) {
        throw new Error('verificationActions must contain at least 1 item.');
      }

      // Check for safety violations
      const safetyResult = validateVerificationPayloadSafety(parsed);
      if (!safetyResult.isSafe) {
        if (retryCount === 0) {
          // Regenerate once with strict safety reminder
          return runGeminiVerification(app, 1);
        }
        throw new Error(
          `AI Safety Filter: Output contained prohibited lending decision statements: ${safetyResult.violations.join('; ')}`
        );
      }

      return { result: parsed, modelUsed };
    } catch (err: any) {
      lastError = err;
      // If error is transient, continue to next model in ladder
      const errMsg = err?.message || String(err);
      if (
        errMsg.includes('503') ||
        errMsg.includes('429') ||
        errMsg.includes('500') ||
        errMsg.includes('timed out') ||
        errMsg.includes('fetch failed')
      ) {
        continue;
      }
      // For non-transient schema/safety errors, break or rethrow
      if (errMsg.includes('AI Safety Filter') || errMsg.includes('GEMINI_NOT_CONFIGURED')) {
        throw err;
      }
    }
  }

  throw lastError || new Error('Gemini verification failed across all configured models.');
}

/**
 * Answers questions about the application and its verified data using Gemini.
 */
export async function askGeminiAssistant(
  app: LoanApplication,
  userQuestion: string,
  chatHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
): Promise<{ answer: string; modelUsed: string }> {
  const { client, primaryModel, fallbackModel } = getGeminiClient();

  if (!userQuestion || typeof userQuestion !== 'string' || userQuestion.trim().length === 0) {
    throw new Error('Question cannot be empty.');
  }

  if (userQuestion.length > 500) {
    throw new Error('Question must be 500 characters or less.');
  }

  const metrics = calculateMetrics(app.declaredMonthlyIncome, app.salaryCredits, app.documents);
  const appFacts = buildApplicationFacts(app);
  const verificationContext = app.verification
    ? `
SAVED VERIFICATION RESULT:
- Final Risk: ${app.verification.riskLevel} (AI Assessed: ${app.verification.aiRiskLevel}, Baseline: ${app.verification.baselineRisk})
- Findings: ${app.verification.findings.join(' | ')}
- Discrepancies: ${app.verification.discrepancies.join(' | ') || 'None'}
- Missing/Pending Docs: ${app.verification.missingDocuments.join(' | ') || 'None'}
- Recommended Actions: ${app.verification.verificationActions.join(' | ')}
- Verified By: ${app.verification.verifiedBy} at ${app.verification.verifiedAt}
`
    : `
SAVED VERIFICATION RESULT:
No AI verification has been run for this application yet.
`;

  const assistantSystemInstruction = `
${STRICT_SYSTEM_SAFETY_INSTRUCTION}

You are assisting an authorized human verification officer reviewing this specific loan application.
You have access to the factual application records, calculated metrics, and saved verification results.

STRICT RESPONSE RULES:
1. Base your answer STRICTLY on the facts provided below.
2. If information is unavailable or unverified, explicitly state that it is unavailable.
3. NEVER invent or assume facts.
4. Keep answers concise, factual, and strictly UNDER 120 WORDS.
5. Plain text only.

CRITICAL REGULATORY BOUNDARY FOR APPROVAL/REJECTION/ELIGIBILITY INQUIRIES:
- If asked whether this loan should be approved, rejected, sanctioned, or disbursed, or asked about borrower eligibility:
  You MUST decline to make any lending decision or recommendation.
  You MUST state that ClaimClarity AI supports document verification and discrepancy cross-checking only, and that all final lending decisions belong strictly to authorized human review officers.
  You may summarize the verified facts (e.g. document checklist status and income discrepancy percentage) for the human officer's reference, but NEVER recommend or state an approval or rejection decision.
`;

  const formattedHistory = chatHistory.slice(-6).map((turn) => ({
    role: turn.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: turn.content }],
  }));

  const userTurnText = `
FACTUAL CONTEXT:
${appFacts}
${verificationContext}

OFFICER QUESTION:
${userQuestion}
`;

  // Resilient model fallback ladder
  const modelsToTry = [
    primaryModel,
    fallbackModel,
    'gemini-flash-latest',
    'gemini-3.7-flash',
  ].filter((m, idx, arr) => Boolean(m) && arr.indexOf(m) === idx) as string[];

  let lastError: Error | null = null;

  for (const model of modelsToTry) {
    try {
      const response = await withTimeout(
        client.models.generateContent({
          model,
          contents: [
            ...formattedHistory,
            { role: 'user', parts: [{ text: userTurnText }] },
          ],
          config: {
            systemInstruction: assistantSystemInstruction,
            temperature: 0.2,
          },
        }),
        30000
      );

      const rawAnswer = response.text?.trim() || '';
      if (!rawAnswer) {
        throw new Error('Assistant returned an empty answer.');
      }

      // Enforce server-side safety and regulatory boundaries
      const factualSnippet = `For this record, declared monthly income is ${formatINR(app.declaredMonthlyIncome)} compared to average salary credits of ${formatINR(Math.round(metrics.avgSalaryCredit))}.`;
      const safetyResult = enforceAssistantSafetyBoundary(rawAnswer, userQuestion, factualSnippet);

      return { answer: safetyResult.answer, modelUsed: model };
    } catch (err: any) {
      lastError = err;
      if (err?.message?.includes('GEMINI_NOT_CONFIGURED')) {
        throw err;
      }
      // Continue to next model in fallback ladder
      continue;
    }
  }

  // If all models failed, classify the error
  const lastMsg = lastError?.message || String(lastError || '');
  if (
    lastMsg.includes('503') ||
    lastMsg.includes('UNAVAILABLE') ||
    lastMsg.includes('overloaded') ||
    lastMsg.includes('500') ||
    lastMsg.includes('429') ||
    lastMsg.includes('RESOURCE_EXHAUSTED') ||
    lastMsg.includes('timed out') ||
    lastMsg.includes('fetch failed') ||
    lastMsg.includes('ECONNRESET') ||
    lastMsg.includes('ETIMEDOUT')
  ) {
    throw new UpstreamServiceUnavailableError();
  }

  throw lastError || new UpstreamServiceUnavailableError();
}
