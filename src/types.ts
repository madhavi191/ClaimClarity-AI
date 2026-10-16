export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type ApplicationStatus = 'Needs Review' | 'Verified' | 'Processing';
export type DocumentStatus = 'Verified' | 'Pending' | 'Missing';

export interface DocumentItem {
  name: string;
  status: DocumentStatus;
}

export interface CustomerDetails {
  name: string;
  age: number;
  employer: string;
  city: string;
  employment: string;
}

export interface LoanDetails {
  type: string;
  amount: number;
  tenureMonths: number;
  purpose: string;
}

export interface VerificationResult {
  riskLevel: RiskLevel; // Final risk (never lower than baseline)
  aiRiskLevel: RiskLevel; // Gemini-assessed risk
  baselineRisk: RiskLevel; // Deterministic baseline risk
  findings: string[];
  discrepancies: string[];
  missingDocuments: string[];
  verificationActions: string[];
  explanation: string;
  advisory: string;
  model: string;
  verifiedBy: string;
  verifiedAt: string;
  isStale?: boolean;
}

export interface LoanApplication {
  id: string;
  customer: CustomerDetails;
  loan: LoanDetails;
  declaredMonthlyIncome: number;
  salaryCredits: number[];
  avgSalaryCredit: number;
  incomeGapPct: number;
  documents: DocumentItem[];
  status: ApplicationStatus;
  risk: RiskLevel;
  verification: VerificationResult | null;
  dataOrigin: 'Fictional Demo Data';
  isSeedRecord?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CalculationMetrics {
  avgSalaryCredit: number;
  incomeGapPct: number;
  isSurplus: boolean;
  totalDocs: number;
  verifiedDocs: number;
  pendingDocs: number;
  missingDocs: number;
  completenessPct: number;
  baselineRisk: RiskLevel;
}

export interface AuthorizedOfficer {
  uid: string;
  email: string;
  enrolledAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  emailVerified: boolean;
  displayName: string | null;
  photoURL: string | null;
  role: 'admin' | 'officer' | 'unauthorized';
}

export interface CloudSetupProposal {
  userEmail: string;
  projectDisplayName: string;
  projectId: string;
  firestoreRegion: string;
  databaseId: string;
  adminEmail: string;
  locationWarning: string;
  expectedServices: string[];
  billingNotice: string;
  remainingSteps: string[];
}
