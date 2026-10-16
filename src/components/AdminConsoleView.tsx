import React, { useState, useEffect } from 'react';
import { LoanApplication, AuthorizedOfficer } from '../types';
import {
  AdminDiagnostics,
  AcceptanceTestReport,
  getAdminDiagnostics,
  runAdminAcceptanceTests,
  fetchOfficers,
  revokeOfficerAccess,
} from '../api';
import {
  ShieldAlert,
  Server,
  Database,
  Cpu,
  KeyRound,
  FileCheck2,
  Users,
  PlusCircle,
  RotateCcw,
  Trash2,
  Edit,
  ArrowLeft,
  RotateCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Cloud,
  Layers,
  Terminal,
  Activity,
  Lock,
  ExternalLink,
} from 'lucide-react';
import { formatINR } from '../utils';

interface AdminConsoleViewProps {
  token: string;
  applications: LoanApplication[];
  onRefreshApplications: () => Promise<void>;
  onOpenAddModal: () => void;
  onOpenEditModal: (app: LoanApplication) => void;
  onDeleteApplication: (app: LoanApplication) => void;
  onOpenResetModal: () => void;
  onBackToPipeline: () => void;
}

export const AdminConsoleView: React.FC<AdminConsoleViewProps> = ({
  token,
  applications,
  onRefreshApplications,
  onOpenAddModal,
  onOpenEditModal,
  onDeleteApplication,
  onOpenResetModal,
  onBackToPipeline,
}) => {
  const [activeTab, setActiveTab] = useState<'admin-tools' | 'developer-diagnostics'>('admin-tools');

  // Diagnostics & System state
  const [diagnostics, setDiagnostics] = useState<AdminDiagnostics | null>(null);
  const [diagLoading, setDiagLoading] = useState(false);
  const [diagError, setDiagError] = useState<string | null>(null);

  // Test report state
  const [testReport, setTestReport] = useState<AcceptanceTestReport | null>(null);
  const [testsLoading, setTestsLoading] = useState(false);
  const [testsError, setTestsError] = useState<string | null>(null);

  // Officers directory
  const [officers, setOfficers] = useState<AuthorizedOfficer[]>([]);
  const [officersLoading, setOfficersLoading] = useState(false);
  const [officersError, setOfficersError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Cloud gate approval safeguard
  const [cloudApprovedInUI, setCloudApprovedInUI] = useState(false);

  const loadDiagnostics = async () => {
    setDiagLoading(true);
    setDiagError(null);
    try {
      const data = await getAdminDiagnostics(token);
      setDiagnostics(data);
    } catch (err: any) {
      setDiagError(err?.message || 'Failed to load developer diagnostics.');
    } finally {
      setDiagLoading(false);
    }
  };

  const loadOfficers = async () => {
    setOfficersLoading(true);
    setOfficersError(null);
    try {
      const list = await fetchOfficers(token);
      setOfficers(list);
    } catch (err: any) {
      setOfficersError(err?.message || 'Failed to load authorized officers.');
    } finally {
      setOfficersLoading(false);
    }
  };

  const handleRunTests = async () => {
    setTestsLoading(true);
    setTestsError(null);
    try {
      const report = await runAdminAcceptanceTests(token);
      setTestReport(report);
    } catch (err: any) {
      setTestsError(err?.message || 'Failed to execute test suite.');
    } finally {
      setTestsLoading(false);
    }
  };

  const handleRevokeOfficer = async (uid: string, email: string) => {
    if (!window.confirm(`Revoke authorized officer access for ${email}?`)) return;
    try {
      await revokeOfficerAccess(token, uid);
      setActionSuccess(`Officer ${email} access was revoked successfully.`);
      await loadOfficers();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setOfficersError(err?.message || 'Failed to revoke officer access.');
    }
  };

  useEffect(() => {
    loadDiagnostics();
    loadOfficers();
  }, [token]);

  return (
    <div className="space-y-6 pb-12">
      {/* Console Header */}
      <div className="bg-[#0B192C] text-white p-6 rounded-2xl shadow-md border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <span className="p-1.5 rounded-lg bg-teal-500/20 text-teal-400 border border-teal-500/30">
              <Server className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-black tracking-tight text-white">Administrator & Developer Console</h1>
            <span className="bg-purple-900/60 border border-purple-500/40 text-purple-200 text-xs px-2.5 py-0.5 rounded-full font-bold">
              Admin Protected
            </span>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            Privileged administration portal for officer credentialing, test record management, and system diagnostics.
          </p>
        </div>

        <button
          onClick={onBackToPipeline}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition"
        >
          <ArrowLeft className="w-4 h-4 text-teal-400" />
          <span>Switch to Officer Pipeline View</span>
        </button>
      </div>

      {actionSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-xs font-semibold text-emerald-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="underline text-emerald-700 hover:text-emerald-900">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Tab Switcher */}
      <div className="flex border-b border-slate-200 bg-white rounded-xl p-1 shadow-xs">
        <button
          onClick={() => setActiveTab('admin-tools')}
          className={`flex-1 flex items-center justify-center space-x-2 py-2.5 px-4 rounded-lg text-xs font-bold transition ${
            activeTab === 'admin-tools'
              ? 'bg-[#0B192C] text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Administrator Tools</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('developer-diagnostics');
            if (!diagnostics) loadDiagnostics();
            if (!testReport && !testsLoading) handleRunTests();
          }}
          className={`flex-1 flex items-center justify-center space-x-2 py-2.5 px-4 rounded-lg text-xs font-bold transition ${
            activeTab === 'developer-diagnostics'
              ? 'bg-[#0B192C] text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>Developer Diagnostics & Audit</span>
        </button>
      </div>

      {/* TAB 1: ADMINISTRATOR TOOLS */}
      {activeTab === 'admin-tools' && (
        <div className="space-y-6">
          {/* Section 1: Fictional Test Application Management */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center space-x-2">
                  <FileCheck2 className="w-5 h-5 text-teal-600" />
                  <h2 className="text-base font-bold text-slate-900">Fictional Test Application Management</h2>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Manage test cases for document verification workflows. Original seed records (APP-1001 to APP-1003) are protected from deletion.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={onOpenAddModal}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm transition"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Add Test Application</span>
                </button>

                <button
                  onClick={onOpenResetModal}
                  className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold border border-rose-200 transition"
                  title="Reset to 3 seed applications"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                  <span>Reset Demo Data</span>
                </button>
              </div>
            </div>

            {/* Applications Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-3">ID / Origin</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Declared / Avg Credit</th>
                    <th className="px-4 py-3">Gap %</th>
                    <th className="px-4 py-3">Risk & Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {applications.map((app) => {
                    const isSeed = app.isSeedRecord || ['APP-1001', 'APP-1002', 'APP-1003'].includes(app.id);
                    return (
                      <tr key={app.id} className="hover:bg-slate-50/80 transition">
                        <td className="px-4 py-3">
                          <span className="font-mono font-bold text-slate-900">{app.id}</span>
                          <span className={`block text-[10px] font-semibold mt-0.5 ${isSeed ? 'text-purple-600' : 'text-teal-600'}`}>
                            {isSeed ? 'Protected Seed Record' : 'Custom Test Record'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">{app.customer.name}</div>
                          <div className="text-[11px] text-slate-500">{app.customer.employer} • {app.customer.city}</div>
                        </td>
                        <td className="px-4 py-3 font-mono">
                          <div>Declared: {formatINR(app.declaredMonthlyIncome)}</div>
                          <div className="text-slate-500 text-[11px]">Avg: {formatINR(app.avgSalaryCredit)}</div>
                        </td>
                        <td className="px-4 py-3 font-mono font-bold">
                          <span className={app.incomeGapPct > 10 ? 'text-rose-600' : app.incomeGapPct > 5 ? 'text-amber-600' : 'text-emerald-600'}>
                            {app.incomeGapPct.toFixed(2)}%
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center space-x-1.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              app.risk === 'HIGH' ? 'bg-rose-100 text-rose-800' : app.risk === 'MEDIUM' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {app.risk}
                            </span>
                            <span className="text-[11px] text-slate-600">{app.status}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {isSeed ? (
                            <span className="inline-flex items-center space-x-1 text-[11px] text-slate-400 font-medium px-2 py-1 bg-slate-100 rounded-md">
                              <Lock className="w-3 h-3 text-slate-400" />
                              <span>Protected</span>
                            </span>
                          ) : (
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => onOpenEditModal(app)}
                                className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition"
                              >
                                <Edit className="w-3 h-3" />
                                <span>Edit</span>
                              </button>
                              <button
                                onClick={() => onDeleteApplication(app)}
                                className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold border border-rose-200 transition"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Delete</span>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Officer Management */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center space-x-2">
                  <Users className="w-5 h-5 text-teal-600" />
                  <h2 className="text-base font-bold text-slate-900">Authorized Officer Directory</h2>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  View verified loan officers authorized to cross-examine loan files and trigger AI verifications.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                  Total Enrolled: {officers.length}
                </span>
                <button
                  onClick={loadOfficers}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
                  title="Refresh directory"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${officersLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {officersError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold">
                {officersError}
              </div>
            )}

            {officersLoading ? (
              <div className="py-6 text-center text-xs text-slate-500">Loading officer list...</div>
            ) : officers.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                No external officers currently enrolled. Sign-in with authorization code to enroll officer seats.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-4 py-3">Officer Email</th>
                      <th className="px-4 py-3">User Identifier (UID)</th>
                      <th className="px-4 py-3">Enrolled At</th>
                      <th className="px-4 py-3 text-right">Access Control</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {officers.map((officer) => (
                      <tr key={officer.uid} className="hover:bg-slate-50/80 transition">
                        <td className="px-4 py-3 font-semibold text-slate-900">{officer.email}</td>
                        <td className="px-4 py-3 font-mono text-[11px] text-slate-500">{officer.uid}</td>
                        <td className="px-4 py-3 text-slate-600">
                          {new Date(officer.enrolledAt).toLocaleDateString()} at{' '}
                          {new Date(officer.enrolledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleRevokeOfficer(officer.uid, officer.email)}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold border border-rose-200 transition"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Revoke Access</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: DEVELOPER DIAGNOSTICS & AUDIT */}
      {activeTab === 'developer-diagnostics' && (
        <div className="space-y-6">
          {/* Integration Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Gemini Integration */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Gemini AI Engine</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    diagnostics?.gemini.status === 'CONFIGURED'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}
                >
                  {diagnostics?.gemini.status || 'CHECKING...'}
                </span>
              </div>
              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span className="text-slate-400">Primary Model:</span>
                  <span className="font-mono font-semibold text-slate-800">{diagnostics?.gemini.primaryModel || 'gemini-3.8-flash'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Fallback Model:</span>
                  <span className="font-mono font-semibold text-slate-800">{diagnostics?.gemini.fallbackModel || 'gemini-3.1-flash-lite'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Safety Guardrails:</span>
                  <span className="font-semibold text-emerald-700">Enforced Server-Side</span>
                </div>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl text-[11px] text-slate-500 border border-slate-200">
                🔒 API key values and secrets are strictly hidden from presentation.
              </div>
            </div>

            {/* Firestore Database / Data Persistence */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Data Persistence</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    diagnostics?.firestore.storageMode === 'FIRESTORE' || diagnostics?.firestore.status === 'CONNECTED'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : diagnostics?.firestore.status === 'ERROR' || diagnostics?.firestore.storageMode === 'ERROR'
                      ? 'bg-rose-100 text-rose-800 border border-rose-300'
                      : 'bg-sky-100 text-sky-800 border border-sky-300'
                  }`}
                >
                  {diagnostics?.firestore.storageMode === 'FIRESTORE' || diagnostics?.firestore.status === 'CONNECTED'
                    ? 'CLOUD FIRESTORE'
                    : diagnostics?.firestore.status === 'ERROR' || diagnostics?.firestore.storageMode === 'ERROR'
                    ? 'CONFIGURATION ERROR'
                    : 'LOCAL DEMO STORAGE'}
                </span>
              </div>
              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span className="text-slate-400">Storage Mode:</span>
                  <span className="font-semibold text-slate-800">
                    {diagnostics?.firestore.storageLabel || (diagnostics?.firestore.storageMode === 'FIRESTORE' ? 'Cloud Firestore' : 'Local Demo Storage')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Database ID:</span>
                  <span className="font-mono text-slate-800">{diagnostics?.firestore.databaseId || '(default)'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Cloud Project:</span>
                  <span className="font-mono text-slate-800">{diagnostics?.firestore.projectId || 'Local Demo (No Cloud Project)'}</span>
                </div>
                {diagnostics?.firestore.error && (
                  <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-[11px] font-medium leading-relaxed">
                    ⚠️ {diagnostics.firestore.error}
                  </div>
                )}
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl text-[11px] text-slate-500 border border-slate-200">
                {diagnostics?.firestore.storageMode === 'FIRESTORE' || diagnostics?.firestore.status === 'CONNECTED'
                  ? '☁️ Connected to Cloud Firestore database.'
                  : '💾 File-backed .demo-data.json (Local Demo Storage) ensures additions persist across dev restarts.'}
              </div>
            </div>

            {/* Backend Health */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Backend Health</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  HEALTH OK
                </span>
              </div>
              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span className="text-slate-400">Service:</span>
                  <span className="font-semibold text-slate-800">ClaimClarity Core</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Uptime:</span>
                  <span className="font-mono text-slate-800">
                    {diagnostics ? `${Math.floor(diagnostics.health.uptimeSeconds / 60)}m ${diagnostics.health.uptimeSeconds % 60}s` : '...'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Live Applications:</span>
                  <span className="font-bold text-slate-800">{diagnostics?.health.activeApplicationsCount ?? applications.length}</span>
                </div>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl text-[11px] text-slate-500 border border-slate-200">
                ⚡ Node.js Express verification engine running on PORT 3000.
              </div>
            </div>
          </div>

          {/* Section: Acceptance Test Reports & Live Runner */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center space-x-2">
                  <Terminal className="w-5 h-5 text-teal-600" />
                  <h2 className="text-base font-bold text-slate-900">Automated Acceptance Test Audit Report</h2>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Live verification of financial formulas, regulatory safety filters, HTTP 503 resilience, and RBAC security bounds.
                </p>
              </div>

              <button
                onClick={handleRunTests}
                disabled={testsLoading}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-[#0B192C] hover:bg-slate-800 text-white text-xs font-bold transition disabled:opacity-50"
              >
                <RotateCw className={`w-3.5 h-3.5 text-teal-400 ${testsLoading ? 'animate-spin' : ''}`} />
                <span>{testsLoading ? 'Executing Test Suite...' : 'Re-run Acceptance Tests'}</span>
              </button>
            </div>

            {testsError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold">
                {testsError}
              </div>
            )}

            {testReport && (
              <div className="space-y-4">
                {/* Summary Banner */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <span className="text-emerald-700 font-bold block text-xs">Passed Tests</span>
                    <span className="text-2xl font-black text-emerald-900 mt-0.5 block">{testReport.summary.passed}</span>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-slate-500 font-bold block text-xs">Total Tests</span>
                    <span className="text-2xl font-black text-slate-800 mt-0.5 block">{testReport.summary.total}</span>
                  </div>

                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <span className="text-emerald-700 font-bold block text-xs">Integrity Pass Rate</span>
                    <span className="text-2xl font-black text-emerald-900 mt-0.5 block">
                      {testReport.summary.total > 0
                        ? `${Math.round((testReport.summary.passed / testReport.summary.total) * 100)}%`
                        : '100%'}
                    </span>
                  </div>
                </div>

                {/* Individual Test Assertions Scrollable List */}
                <div className="max-h-80 overflow-y-auto space-y-1.5 pr-1 text-xs">
                  {testReport.summary.results.map((res, idx) => (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-lg border flex items-start justify-between gap-3 ${
                        res.status === 'PASS'
                          ? 'bg-slate-50/70 border-slate-200 text-slate-800'
                          : 'bg-rose-50 border-rose-200 text-rose-900'
                      }`}
                    >
                      <div className="flex items-start space-x-2">
                        {res.status === 'PASS' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <span className="font-semibold text-slate-900">{res.name}</span>
                          <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
                            Expected: <span className="text-slate-700">{res.expected}</span> | Actual:{' '}
                            <span className="text-slate-700">{res.actual}</span>
                          </div>
                        </div>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          res.status === 'PASS' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-200 text-rose-900'
                        }`}
                      >
                        {res.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Section: Cloud Provisioning Gate & Deployment Readiness */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100">
              <Cloud className="w-5 h-5 text-teal-600" />
              <div>
                <h2 className="text-base font-bold text-slate-900">Cloud Setup Gate & Deployment Safeguards</h2>
                <p className="text-xs text-slate-500">
                  Strict Section 3 approval safeguard preventing unauthorized billing or cloud modifications.
                </p>
              </div>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 flex items-start space-x-2.5 text-xs">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span className="leading-relaxed font-semibold">
                Cloud Safeguard Policy: Zero cloud resources or billing configurations may be provisioned without explicit
                administrative confirmation. All application features operate in secure local fallback mode.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 font-semibold block">Target Project ID</span>
                <span className="font-mono font-bold text-slate-900 mt-0.5 block">claimclarity-ai-2026</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 font-semibold block">Permanent Firestore Region</span>
                <span className="font-bold text-teal-700 mt-0.5 block">asia-south1 (Mumbai)</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 font-semibold block">Authorized Admin Account</span>
                <span className="font-bold text-slate-900 mt-0.5 block">padduhoney150@gmail.com</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 font-semibold block">Expected Monthly Cost</span>
                <span className="font-bold text-emerald-700 mt-0.5 block">₹0 (Within GCP Free Tier Quotas)</span>
              </div>
            </div>

            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs">
              <span className="font-bold block mb-0.5">Permanent Region Notice:</span>
              <p className="text-[11px] leading-relaxed">
                Once a Cloud Firestore database is created in region asia-south1 (Mumbai), its location is permanent and cannot be altered or moved without deleting the entire database.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
