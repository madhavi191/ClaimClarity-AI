import {
  LoanApplication,
  AuthorizedOfficer,
  UserProfile,
  VerificationResult,
  CalculationMetrics,
  ChatMessage,
} from './types';

export interface SystemStatus {
  geminiStatus: 'CONFIGURED' | 'NOT CONFIGURED';
  firestoreStatus: 'CONNECTED' | 'NOT CONFIGURED' | 'ERROR';
  databaseId: string;
  projectId: string;
  storageMode: string;
  storageLabel?: string;
  storageError?: string | null;
  models: {
    primary: string;
    fallback: string;
  };
}

export interface AdminDiagnostics {
  gemini: {
    status: 'CONFIGURED' | 'NOT CONFIGURED';
    primaryModel: string;
    fallbackModel: string;
    safetyFilterEnforced: boolean;
    guardrailSummary: string;
  };
  firestore: {
    status: 'CONNECTED' | 'NOT CONFIGURED' | 'ERROR';
    storageMode: string;
    storageLabel?: string;
    databaseId: string;
    projectId: string;
    error?: string | null;
  };
  auth: {
    status: string;
    adminEmail: string;
    enrolledOfficersCount: number;
    securityAlgorithm: string;
    mode: string;
  };
  cloudGate: {
    isProvisioned: boolean;
    requiresExplicitConfirmation: boolean;
    targetRegion: string;
    targetProject: string;
    costScope: string;
    safeguardsActive: boolean;
  };
  health: {
    service: string;
    status: string;
    uptimeSeconds: number;
    timestamp: string;
    activeApplicationsCount: number;
  };
}

export interface AcceptanceTestReport {
  success: boolean;
  summary: {
    total: number;
    passed: number;
    failed: number;
    results: {
      name: string;
      expected: string;
      actual: string;
      status: 'PASS' | 'FAIL';
      detail?: string;
    }[];
  };
}

export async function getAdminDiagnostics(token: string): Promise<AdminDiagnostics> {
  const res = await fetch('/api/admin/diagnostics', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch administrator diagnostics.');
  }
  return res.json();
}

export async function runAdminAcceptanceTests(token: string): Promise<AcceptanceTestReport> {
  const res = await fetch('/api/admin/diagnostics/tests', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to run acceptance tests.');
  }
  return res.json();
}

export async function getCurrentUser(token: string): Promise<UserProfile> {
  const res = await fetch('/api/me', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to authenticate user.');
  }
  return res.json();
}

export async function submitEnrollment(
  token: string,
  accessCode: string
): Promise<{ success: boolean; role: string; message: string }> {
  const res = await fetch('/api/enrollment', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ accessCode }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Enrollment failed.');
  }
  return data;
}

export async function fetchApplications(token: string): Promise<LoanApplication[]> {
  const res = await fetch('/api/applications', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Failed to retrieve applications.');
  }
  return data.applications || [];
}

export async function fetchApplicationDetails(
  token: string,
  id: string
): Promise<{ application: LoanApplication; metrics: CalculationMetrics }> {
  const res = await fetch(`/api/applications/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Failed to retrieve application details.');
  }
  return data;
}

export async function runVerification(
  token: string,
  id: string
): Promise<{ success: boolean; application: LoanApplication; verification: VerificationResult }> {
  const res = await fetch(`/api/applications/${id}/verify`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Verification analysis failed.');
  }
  return data;
}

export async function sendAssistantMessage(
  token: string,
  id: string,
  question: string,
  history: ChatMessage[]
): Promise<{ answer: string; model: string; advisory: string }> {
  const res = await fetch(`/api/applications/${id}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      question,
      history: history.map((h) => ({ role: h.role, content: h.content })),
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 503 || data.isUnavailable) {
      throw new Error(data.error || 'The AI assistant is temporarily unavailable. Please retry shortly.');
    }
    const rawMsg = data.error || 'The AI assistant is temporarily unavailable. Please retry shortly.';
    if (
      rawMsg.includes('503') ||
      rawMsg.includes('UNAVAILABLE') ||
      rawMsg.includes('{') ||
      rawMsg.includes('google.rpc') ||
      rawMsg.includes('ErrorInfo')
    ) {
      throw new Error('The AI assistant is temporarily unavailable. Please retry shortly.');
    }
    throw new Error(rawMsg);
  }
  return data;
}

export async function fetchOfficers(token: string): Promise<AuthorizedOfficer[]> {
  const res = await fetch('/api/admin/officers', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Failed to retrieve officer list.');
  }
  return data.officers || [];
}

export async function revokeOfficerAccess(token: string, uid: string): Promise<void> {
  const res = await fetch(`/api/admin/officers/${uid}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Failed to revoke officer access.');
  }
}

export async function createTestApplication(
  token: string,
  payload: Partial<LoanApplication>
): Promise<LoanApplication> {
  const res = await fetch('/api/admin/applications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Failed to create test application.');
  }
  return data.application;
}

export async function editTestApplication(
  token: string,
  id: string,
  payload: Partial<LoanApplication>
): Promise<LoanApplication> {
  const res = await fetch(`/api/admin/applications/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Failed to edit test application.');
  }
  return data.application;
}

export async function deleteTestApplication(
  token: string,
  id: string
): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`/api/admin/applications/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Failed to delete application ${id}.`);
  }
  return data;
}

export async function resetDemoApplications(token: string): Promise<LoanApplication[]> {
  const res = await fetch('/api/admin/reset-demo-data', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Failed to reset demo data.');
  }
  return data.applications || [];
}
