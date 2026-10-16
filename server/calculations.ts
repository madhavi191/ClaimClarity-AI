import { RiskLevel, DocumentItem, CalculationMetrics } from '../src/types.js';

export class CalculationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CalculationValidationError';
  }
}

/**
 * Validates and calculates all financial and documentation metrics for a loan application.
 */
export function calculateMetrics(
  declaredMonthlyIncome: number,
  salaryCredits: number[],
  documents: DocumentItem[]
): CalculationMetrics {
  // Validate declaredMonthlyIncome
  if (
    typeof declaredMonthlyIncome !== 'number' ||
    !Number.isFinite(declaredMonthlyIncome) ||
    declaredMonthlyIncome <= 0
  ) {
    throw new CalculationValidationError(
      'Declared monthly income must be a positive finite number greater than zero.'
    );
  }

  // Validate salaryCredits array
  if (!Array.isArray(salaryCredits) || salaryCredits.length === 0) {
    throw new CalculationValidationError(
      'Salary credits must be a non-empty array of positive numbers.'
    );
  }

  for (let i = 0; i < salaryCredits.length; i++) {
    const credit = salaryCredits[i];
    if (typeof credit !== 'number' || !Number.isFinite(credit) || credit < 0) {
      throw new CalculationValidationError(
        `Salary credit at index ${i} (${credit}) must be a non-negative finite number.`
      );
    }
  }

  // Calculate average salary credit with full internal numeric precision
  const sum = salaryCredits.reduce((acc, curr) => acc + curr, 0);
  const avgSalaryCredit = sum / salaryCredits.length;

  // Calculate income gap percentage
  // positive = shortfall (declared > actual), negative = surplus (actual > declared)
  const incomeGapPct = ((declaredMonthlyIncome - avgSalaryCredit) / declaredMonthlyIncome) * 100;
  const isSurplus = avgSalaryCredit > declaredMonthlyIncome;

  // Validate and count documents
  if (!Array.isArray(documents) || documents.length === 0) {
    throw new CalculationValidationError(
      'Documents must be a non-empty list of verification checklist items.'
    );
  }

  let verifiedDocs = 0;
  let pendingDocs = 0;
  let missingDocs = 0;

  for (const doc of documents) {
    if (!doc.name || typeof doc.name !== 'string') {
      throw new CalculationValidationError('Each document must have a valid string name.');
    }
    if (doc.status === 'Verified') {
      verifiedDocs++;
    } else if (doc.status === 'Pending') {
      pendingDocs++;
    } else if (doc.status === 'Missing') {
      missingDocs++;
    } else {
      throw new CalculationValidationError(
        `Invalid document status "${doc.status}". Must be Verified, Pending, or Missing.`
      );
    }
  }

  const totalDocs = documents.length;
  const completenessPct = (verifiedDocs / totalDocs) * 100;

  // Baseline risk rules
  const baselineRisk = determineBaselineRisk(incomeGapPct, pendingDocs, missingDocs);

  return {
    avgSalaryCredit,
    incomeGapPct,
    isSurplus,
    totalDocs,
    verifiedDocs,
    pendingDocs,
    missingDocs,
    completenessPct,
    baselineRisk,
  };
}

/**
 * Deterministic baseline risk rules:
 * - HIGH: gap > 15%, OR (gap >= 10% and one or more docs pending/missing)
 * - MEDIUM: (gap >= 5% and gap <= 15%), OR (one or more docs pending/missing)
 * - LOW: gap < 5% and all required docs verified (no pending, no missing)
 */
export function determineBaselineRisk(
  incomeGapPct: number,
  pendingDocs: number,
  missingDocs: number
): RiskLevel {
  const hasIncompleteDocs = pendingDocs > 0 || missingDocs > 0;

  // Highest risk condition checked first
  if (incomeGapPct > 15 || (incomeGapPct >= 10 && hasIncompleteDocs)) {
    return 'HIGH';
  }

  // Medium risk condition
  if (incomeGapPct >= 5 || hasIncompleteDocs) {
    return 'MEDIUM';
  }

  // Low risk condition (gap < 5% and all documents verified)
  return 'LOW';
}

/**
 * Ensures Gemini assessed risk never lowers final risk below deterministic baseline.
 * Risk priority order: LOW < MEDIUM < HIGH
 */
export function resolveFinalRisk(baselineRisk: RiskLevel, aiRisk: RiskLevel): RiskLevel {
  const riskWeights: Record<RiskLevel, number> = {
    LOW: 1,
    MEDIUM: 2,
    HIGH: 3,
  };

  const baselineWeight = riskWeights[baselineRisk] || 2;
  const aiWeight = riskWeights[aiRisk] || 2;

  // Max of baseline and AI
  return aiWeight >= baselineWeight ? aiRisk : baselineRisk;
}

/**
 * Format currency in Indian Rupees notation (e.g. ₹8,50,000)
 */
export function formatINR(val: number): string {
  if (!Number.isFinite(val)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val);
}
