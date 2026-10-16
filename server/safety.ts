/**
 * AI Safety rules engine for ClaimClarity AI.
 * Enforces strict compliance boundaries forbidding autonomous lending decisions,
 * approvals, rejections, eligibility determinations, sanctions, and creditworthiness claims.
 */

export const MANDATORY_DISCLAIMER =
  'AI-assisted document verification only. This system does not determine loan eligibility or approve or reject applications. All findings require human review.';

export const SAFE_REGULATORY_EXPLANATION =
  'ClaimClarity AI is an advisory tool for document verification and discrepancy cross-checking only. The system does not make lending decisions, evaluate credit eligibility, or recommend sanction or disbursement. All final decisions belong strictly to authorized human review officers.';

// Regular expression patterns targeting queries asking for loan approval, rejection, or sanction
const DECISION_QUERY_PATTERNS: RegExp[] = [
  /\b(?:approve|approved|approving|approval|reject|rejected|rejecting|rejection)\b/i,
  /\b(?:eligible|eligibility|qualify|qualifies|qualified|qualifying|ineligible)\b/i,
  /\b(?:sanction|sanctioned|sanctioning|disburse|disbursed|disbursing|disbursement)\b/i,
  /\b(?:grant|granted|granting|deny|denied|denying)\s+(?:the|this|a)?\s*(?:loan|application)\b/i,
  /\bcreditworthiness\b/i,
];

export function isDecisionOrApprovalQuery(query: string): boolean {
  if (!query || typeof query !== 'string') return false;
  return DECISION_QUERY_PATTERNS.some((pattern) => pattern.test(query));
}

// Regular expression patterns targeting prohibited lending decisions and eligibility declarations
const PROHIBITED_PATTERNS: RegExp[] = [
  /\b(?:approve|approving|approved|approval)\s+(?:the|this|a)?\s*(?:loan|application|borrower|applicant)\b/i,
  /\b(?:reject|rejecting|rejected|rejection)\s+(?:the|this|a)?\s*(?:loan|application|borrower|applicant)\b/i,
  /\b(?:recommend|suggest|advise)\s+(?:approval|rejection|approving|rejecting|sanction|sanctioning|disbursing)\b/i,
  /\b(?:eligible|qualifies|qualify|ineligible|disqualified)\s+for\s+(?:the|a)?\s*(?:loan|credit|borrowing)\b/i,
  /\b(?:grant|granting|sanction|sanctioning|disburse|disbursing)\s+(?:the|this|a)?\s*loan\b/i,
  /\b(?:deny|denying)\s+(?:the|this|a)?\s*(?:loan|application)\b/i,
  /\bcreditworthiness\s+(?:is|score|rating|decision|judgment)\b/i,
  /\b(?:proceed with|do not proceed with)\s+(?:lending|loan sanction|disbursement)\b/i,
];

export interface SafetyValidationResult {
  isSafe: boolean;
  violations: string[];
}

/**
 * Validates any generated text string against prohibited lending decision vocabulary.
 */
export function validateTextSafety(text: string): SafetyValidationResult {
  if (!text || typeof text !== 'string') {
    return { isSafe: true, violations: [] };
  }

  const violations: string[] = [];
  for (const pattern of PROHIBITED_PATTERNS) {
    if (pattern.test(text)) {
      violations.push(`Triggered prohibited lending decision pattern: ${pattern.toString()}`);
    }
  }

  return {
    isSafe: violations.length === 0,
    violations,
  };
}

/**
 * Enforces server-side safety boundaries on AI Assistant responses.
 * Guarantees that responses to loan approval/rejection queries or responses with
 * prohibited lending assertions are converted into compliant, safe explanations.
 */
export function enforceAssistantSafetyBoundary(
  rawAnswer: string,
  userQuestion: string,
  factualContextSnippet?: string
): { answer: string; isSafe: boolean; overridden: boolean } {
  const safety = validateTextSafety(rawAnswer);

  // If raw text violated prohibited lending decision patterns, override immediately
  if (!safety.isSafe) {
    return {
      answer: SAFE_REGULATORY_EXPLANATION,
      isSafe: true,
      overridden: true,
    };
  }

  // If user asked an approval/rejection/decision question, ensure regulatory disclaimer is present
  if (isDecisionOrApprovalQuery(userQuestion)) {
    const mentionsVerification =
      /document verification|advisory|verification only|cross-check/i.test(rawAnswer);
    const mentionsHumanReview =
      /human|officer|reviewer|underwriter|authorized/i.test(rawAnswer);

    if (!mentionsVerification || !mentionsHumanReview) {
      const groundedSuffix = factualContextSnippet ? ` ${factualContextSnippet}` : '';
      return {
        answer: `${SAFE_REGULATORY_EXPLANATION}${groundedSuffix}`,
        isSafe: true,
        overridden: true,
      };
    }
  }

  return {
    answer: rawAnswer,
    isSafe: true,
    overridden: false,
  };
}

/**
 * Validates the entire structured verification payload from Gemini.
 */
export function validateVerificationPayloadSafety(payload: {
  findings?: string[];
  discrepancies?: string[];
  missingDocuments?: string[];
  verificationActions?: string[];
  explanation?: string;
}): SafetyValidationResult {
  const violations: string[] = [];

  const checkArray = (arr: string[] | undefined, fieldName: string) => {
    if (!Array.isArray(arr)) return;
    for (const item of arr) {
      const res = validateTextSafety(item);
      if (!res.isSafe) {
        violations.push(...res.violations.map((v) => `[${fieldName}] ${v}`));
      }
    }
  };

  checkArray(payload.findings, 'findings');
  checkArray(payload.discrepancies, 'discrepancies');
  checkArray(payload.missingDocuments, 'missingDocuments');
  checkArray(payload.verificationActions, 'verificationActions');

  if (payload.explanation) {
    const res = validateTextSafety(payload.explanation);
    if (!res.isSafe) {
      violations.push(...res.violations.map((v) => `[explanation] ${v}`));
    }
  }

  return {
    isSafe: violations.length === 0,
    violations,
  };
}

export const STRICT_SYSTEM_SAFETY_INSTRUCTION = `
You are the ClaimClarity AI Document Verification & Risk Assistant engine for bank and NBFC verification officers.
Your sole mission is neutral, factual document-verification analysis and income discrepancy cross-checking.

CRITICAL REGULATORY AND ETHICAL BOUNDARIES (MANDATORY):
1. You are NOT a loan approval or rejection system.
2. You must NEVER decide, recommend, or suggest whether a customer should be approved, rejected, granted a loan, sanctioned, or disbursed.
3. You must NEVER determine loan eligibility or claim whether a customer qualifies for a loan.
4. You must NEVER tell an officer to proceed with or deny a loan.
5. All your findings are advisory assistance only and require human officer review.
6. Base all observations strictly on the factual customer and financial data provided.
7. Only suggest neutral, factual follow-up verification actions (e.g. "Request last 3 months verified bank statement", "Verify salary slip with employer HR").
8. Keep language professional, objective, and neutral.
`;
