import React, { useState } from 'react';
import {
  LoanApplication,
  CalculationMetrics,
  VerificationResult,
  ChatMessage,
  RiskLevel,
} from '../types';
import {
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Bot,
  Send,
  Sparkles,
  Info,
  Calendar,
  Building,
  User,
  CreditCard,
  FileCheck,
  ExternalLink,
  Trash2,
  Edit,
  RotateCw,
  AlertCircle,
} from 'lucide-react';
import { formatINR } from '../utils';
import { runVerification, sendAssistantMessage } from '../api';

interface ApplicationDetailViewProps {
  application: LoanApplication;
  metrics: CalculationMetrics;
  token: string;
  isAdmin: boolean;
  onBack: () => void;
  onRefresh: () => void;
  onOpenEditModal: (app: LoanApplication) => void;
  onDeleteApplication: (app: LoanApplication) => void;
}

export const ApplicationDetailView: React.FC<ApplicationDetailViewProps> = ({
  application,
  metrics,
  token,
  isAdmin,
  onBack,
  onRefresh,
  onOpenEditModal,
  onDeleteApplication,
}) => {
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // AI Assistant state (in-memory only, not stored in localStorage)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [questionInput, setQuestionInput] = useState('');
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [assistantError, setAssistantError] = useState<string | null>(null);

  const handleRunVerification = async () => {
    setVerifying(true);
    setVerifyError(null);

    try {
      await runVerification(token, application.id);
      onRefresh();
    } catch (err: any) {
      setVerifyError(err?.message || 'Verification process encountered an unexpected error.');
    } finally {
      setVerifying(false);
    }
  };

  const handleSendQuestion = async (customText?: string) => {
    const textToSend = customText || questionInput;
    if (!textToSend.trim() || assistantLoading) return;

    if (textToSend.length > 500) {
      setAssistantError('Question cannot exceed 500 characters.');
      return;
    }

    const trimmed = textToSend.trim();
    const lastMsg = chatMessages[chatMessages.length - 1];
    let newHistory = chatMessages;

    // Only append user bubble if not retrying the exact current last user question
    if (!lastMsg || lastMsg.role !== 'user' || lastMsg.content !== trimmed) {
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: trimmed,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      newHistory = [...chatMessages, userMsg];
      setChatMessages(newHistory);
    }

    setQuestionInput('');
    setAssistantLoading(true);
    setAssistantError(null);

    try {
      const response = await sendAssistantMessage(token, application.id, trimmed, newHistory);
      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages([...newHistory, assistantMsg]);
      setAssistantError(null);
    } catch (err: any) {
      setAssistantError(err?.message || 'The AI assistant is temporarily unavailable. Please retry shortly.');
    } finally {
      setAssistantLoading(false);
    }
  };

  const getDocStatusIcon = (status: string) => {
    switch (status) {
      case 'Verified':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'Pending':
        return <Clock className="w-4 h-4 text-amber-500" />;
      case 'Missing':
        return <AlertTriangle className="w-4 h-4 text-rose-500" />;
      default:
        return null;
    }
  };

  const getRiskColor = (risk: RiskLevel) => {
    switch (risk) {
      case 'LOW':
        return 'bg-emerald-50 text-emerald-800 border-emerald-300';
      case 'MEDIUM':
        return 'bg-amber-50 text-amber-800 border-amber-300';
      case 'HIGH':
        return 'bg-rose-50 text-rose-800 border-rose-300';
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 transition"
            title="Back to pipeline"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono font-extrabold text-lg text-slate-900">{application.id}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">
                {application.dataOrigin}
              </span>
              {application.verification?.isStale && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold border border-amber-300">
                  Verification Stale
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Customer: <span className="font-bold text-slate-800">{application.customer.name}</span> •{' '}
              {application.loan.type}
            </p>
          </div>
        </div>

        {/* Admin Controls */}
        {isAdmin && !application.isSeedRecord && !['APP-1001', 'APP-1002', 'APP-1003'].includes(application.id) && (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onOpenEditModal(application)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition"
            >
              <Edit className="w-3.5 h-3.5" />
              <span>Edit Record</span>
            </button>
            <button
              onClick={() => onDeleteApplication(application)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold shadow-sm transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Customer, Loan, and Financial Analysis */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer & Loan Overview */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-5">
            <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
              <User className="w-4 h-4 text-teal-600" />
              <span>Applicant & Loan Specifications</span>
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 font-semibold block">Full Name</span>
                <span className="font-bold text-slate-900 mt-0.5 block">{application.customer.name}</span>
                <span className="text-slate-500 text-[11px]">Age: {application.customer.age} yrs</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 font-semibold block">Employer & City</span>
                <span className="font-bold text-slate-900 mt-0.5 block">{application.customer.employer}</span>
                <span className="text-slate-500 text-[11px]">{application.customer.city}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 font-semibold block">Loan Facility</span>
                <span className="font-bold text-slate-900 mt-0.5 block">{application.loan.type}</span>
                <span className="text-slate-500 text-[11px]">{formatINR(application.loan.amount)}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 font-semibold block">Tenure & Purpose</span>
                <span className="font-bold text-slate-900 mt-0.5 block">{application.loan.tenureMonths} Months</span>
                <span className="text-slate-500 text-[11px] truncate block" title={application.loan.purpose}>
                  {application.loan.purpose}
                </span>
              </div>
            </div>
          </div>

          {/* Income Comparison Matrix */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-5">
            <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
              <CreditCard className="w-4 h-4 text-teal-600" />
              <span>Income Verification & Discrepancy Matrix</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-xs font-semibold text-slate-500">Declared Monthly Income</p>
                <p className="text-xl font-black text-slate-900 mt-1">
                  {formatINR(application.declaredMonthlyIncome)}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">As stated on loan application</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-xs font-semibold text-slate-500">Average Salary Credit</p>
                <p className="text-xl font-black text-slate-900 mt-1">
                  {formatINR(Math.round(metrics.avgSalaryCredit))}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Exact: ₹{metrics.avgSalaryCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
              </div>

              <div
                className={`p-4 rounded-xl border ${
                  metrics.incomeGapPct > 10
                    ? 'bg-rose-50 border-rose-200 text-rose-900'
                    : metrics.incomeGapPct > 5
                    ? 'bg-amber-50 border-amber-200 text-amber-900'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                }`}
              >
                <p className="text-xs font-semibold opacity-80">Income Discrepancy Gap</p>
                <p className="text-xl font-black mt-1">
                  {metrics.incomeGapPct.toFixed(2)}%
                </p>
                <p className="text-[11px] font-medium mt-0.5">
                  {metrics.isSurplus ? 'Credits exceed declared' : 'Declared exceeds observed credits'}
                </p>
              </div>
            </div>

            {/* Monthly Salary Credits Breakdown */}
            <div>
              <p className="text-xs font-semibold text-slate-700 mb-2">
                Observed Monthly Salary Credits ({application.salaryCredits.length} Months Verified):
              </p>
              <div className="flex flex-wrap gap-2">
                {application.salaryCredits.map((credit, idx) => (
                  <div
                    key={idx}
                    className="px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800"
                  >
                    Month {idx + 1}: {formatINR(credit)}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Document Checklist */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
                <FileCheck className="w-4 h-4 text-teal-600" />
                <span>Required Document Checklist</span>
              </h2>
              <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200">
                {metrics.verifiedDocs}/{metrics.totalDocs} Verified ({metrics.completenessPct.toFixed(0)}%)
              </span>
            </div>

            {/* Completeness Bar */}
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full transition-all ${
                  metrics.completenessPct === 100
                    ? 'bg-emerald-500'
                    : metrics.completenessPct >= 50
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
                }`}
                style={{ width: `${metrics.completenessPct}%` }}
              ></div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {application.documents.map((doc, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50"
                >
                  <span className="text-xs font-bold text-slate-800">{doc.name}</span>
                  <div className="flex items-center space-x-1.5 text-xs font-semibold">
                    {getDocStatusIcon(doc.status)}
                    <span
                      className={
                        doc.status === 'Verified'
                          ? 'text-emerald-700'
                          : doc.status === 'Pending'
                          ? 'text-amber-700'
                          : 'text-rose-700'
                      }
                    >
                      {doc.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Prominent Run AI Verification Action (Mandatory Placement) */}
          <div className="bg-gradient-to-r from-[#0B192C] to-[#1E3E62] p-6 rounded-2xl text-white shadow-md space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-base font-bold flex items-center space-x-2">
                  <Sparkles className="w-5 h-5 text-teal-400" />
                  <span>Gemini AI Verification Engine</span>
                </h3>
                <p className="text-xs text-slate-300 mt-1 max-w-xl">
                  Executes server-side Gemini multi-factor cross-verification against declared incomes,
                  salary credits, and document completeness with automated regulatory safety checks.
                </p>
              </div>

              <button
                onClick={handleRunVerification}
                disabled={verifying}
                className="inline-flex items-center justify-center space-x-2 px-6 py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold text-sm shadow-lg shadow-teal-500/20 transition active:scale-[0.98] disabled:opacity-50 shrink-0"
              >
                {verifying ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" />
                    <span>Gemini is analysing...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Run AI Verification</span>
                  </>
                )}
              </button>
            </div>

            {verifyError && (
              <div
                className={`p-3.5 rounded-xl border text-xs flex items-start space-x-2.5 ${
                  verifyError.includes('unconfigured')
                    ? 'bg-amber-500/20 border-amber-400/40 text-amber-200'
                    : 'bg-rose-500/20 border-rose-400/40 text-rose-200'
                }`}
              >
                {verifyError.includes('unconfigured') ? (
                  <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                )}
                <span className="leading-relaxed">{verifyError}</span>
              </div>
            )}
          </div>

          {/* Screen 5: Verification Summary */}
          {application.verification ? (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
                    <CheckCircle2 className="w-5 h-5 text-teal-600" />
                    <span>Verification Summary & Audit Report</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Analyzed by <span className="font-mono font-semibold text-slate-800">{application.verification.model}</span> •{' '}
                    {new Date(application.verification.verifiedAt).toLocaleString()}
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Final Risk Rating</span>
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-black border ${getRiskColor(
                        application.verification.riskLevel
                      )}`}
                    >
                      {application.verification.riskLevel}
                    </span>
                  </div>
                </div>
              </div>

              {/* Risk Transparency Breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 font-semibold block">Deterministic Baseline</span>
                  <span className="font-bold text-slate-800 mt-0.5 block">{application.verification.baselineRisk}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block">Gemini-Assessed Risk</span>
                  <span className="font-bold text-slate-800 mt-0.5 block">{application.verification.aiRiskLevel}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block">Enforced Floor Rule</span>
                  <span className="font-semibold text-teal-700 mt-0.5 block">Final ≥ Baseline</span>
                </div>
              </div>

              {/* Findings */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Verification Findings</h4>
                <ul className="space-y-1.5 text-xs text-slate-700">
                  {application.verification.findings.map((f, i) => (
                    <li key={i} className="flex items-start space-x-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-600 mt-1.5 shrink-0"></span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Discrepancies */}
              {application.verification.discrepancies.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                    Identified Discrepancies
                  </h4>
                  <ul className="space-y-1.5 text-xs text-amber-900 bg-amber-50/50 p-3 rounded-xl border border-amber-200">
                    {application.verification.discrepancies.map((d, i) => (
                      <li key={i} className="flex items-start space-x-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
                        <span>{d}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommended Verification Actions */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Recommended Follow-Up Verification Actions
                </h4>
                <div className="space-y-1.5">
                  {application.verification.verificationActions.map((a, i) => (
                    <div
                      key={i}
                      className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-800 flex items-start space-x-2"
                    >
                      <span className="font-bold text-teal-700">{i + 1}.</span>
                      <span>{a}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Explanation */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Officer Summary</h4>
                <p className="text-xs text-slate-600 leading-relaxed italic bg-slate-50 p-3 rounded-xl border border-slate-200">
                  "{application.verification.explanation}"
                </p>
              </div>

              {/* Mandatory Regulatory Disclaimer */}
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                <p className="text-[11px] text-amber-900 leading-relaxed font-medium">
                  {application.verification.advisory}
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center text-slate-500">
              <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-700">No AI verification has been run for this application yet.</p>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                Click "Run AI Verification" above to trigger real server-side analysis of declared income, salary credits,
                and document validity.
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Screen 6 AI Assistant */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[650px]">
            {/* Assistant Header */}
            <div className="bg-[#0B192C] p-4 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center text-slate-950 font-bold">
                  <Bot className="w-5 h-5 text-slate-900" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Verification AI Assistant</h3>
                  <p className="text-[10px] text-slate-300">Contextual to {application.id}</p>
                </div>
              </div>
            </div>

            {/* Chat Body */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50 text-xs">
              {chatMessages.length === 0 ? (
                <div className="p-4 text-center text-slate-400 space-y-3">
                  <Bot className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="font-medium text-slate-600">Ask any question regarding this applicant's documentation or income history.</p>

                  <div className="pt-2 text-left space-y-1.5">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Suggested Questions:</p>
                    <button
                      onClick={() => handleSendQuestion('Why was this application flagged?')}
                      className="w-full text-left p-2 rounded-lg bg-white border border-slate-200 hover:border-teal-400 text-slate-700 text-xs transition"
                    >
                      • Why was this application flagged?
                    </button>
                    <button
                      onClick={() => handleSendQuestion('Which documents need attention?')}
                      className="w-full text-left p-2 rounded-lg bg-white border border-slate-200 hover:border-teal-400 text-slate-700 text-xs transition"
                    >
                      • Which documents need attention?
                    </button>
                    <button
                      onClick={() => handleSendQuestion('What income discrepancy was identified?')}
                      className="w-full text-left p-2 rounded-lg bg-white border border-slate-200 hover:border-teal-400 text-slate-700 text-xs transition"
                    >
                      • What income discrepancy was identified?
                    </button>
                    <button
                      onClick={() => handleSendQuestion('What should the officer verify next?')}
                      className="w-full text-left p-2 rounded-lg bg-white border border-slate-200 hover:border-teal-400 text-slate-700 text-xs transition"
                    >
                      • What should the officer verify next?
                    </button>
                  </div>
                </div>
              ) : (
                chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[85%] p-3 rounded-2xl ${
                        msg.role === 'user'
                          ? 'bg-teal-600 text-white rounded-br-none'
                          : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none shadow-sm'
                      }`}
                    >
                      <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    </div>
                    <span className="text-[9px] text-slate-400 mt-1 px-1">{msg.timestamp}</span>
                  </div>
                ))
              )}

              {assistantLoading && (
                <div className="flex items-center space-x-2 p-3 bg-white border border-slate-200 rounded-2xl w-fit shadow-sm">
                  <RotateCw className="w-3.5 h-3.5 text-teal-600 animate-spin" />
                  <span className="text-slate-600 italic">Thinking and analyzing application facts...</span>
                </div>
              )}

              {assistantError && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-center justify-between gap-2 shadow-xs">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>{assistantError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const lastUserMsg = [...chatMessages].reverse().find((m) => m.role === 'user');
                      if (lastUserMsg) {
                        handleSendQuestion(lastUserMsg.content);
                      }
                    }}
                    disabled={assistantLoading}
                    className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-[11px] transition shrink-0 disabled:opacity-50"
                  >
                    <RotateCw className={`w-3 h-3 ${assistantLoading ? 'animate-spin' : ''}`} />
                    <span>Retry</span>
                  </button>
                </div>
              )}
            </div>

            {/* Input Form */}
            <div className="p-3 bg-white border-t border-slate-200 space-y-2">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendQuestion();
                }}
                className="flex items-center space-x-2"
              >
                <input
                  type="text"
                  maxLength={500}
                  value={questionInput}
                  onChange={(e) => setQuestionInput(e.target.value)}
                  placeholder="Ask a question (under 500 characters)..."
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <button
                  type="submit"
                  disabled={!questionInput.trim() || assistantLoading}
                  className="p-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white disabled:opacity-50 transition"
                  title="Send message"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>

              <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
                <span>{questionInput.length}/500 chars</span>
                <span>Factual answers strictly under 120 words</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
