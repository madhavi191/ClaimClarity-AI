import React, { useState } from 'react';
import { LoanApplication, RiskLevel, ApplicationStatus } from '../types';
import {
  Search,
  Filter,
  PlusCircle,
  RotateCcw,
  Users,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileQuestion,
  TrendingDown,
  Building2,
  Calendar,
  Layers,
  Trash2,
} from 'lucide-react';
import { formatINR } from '../utils';

interface DashboardViewProps {
  applications: LoanApplication[];
  isAdmin: boolean;
  onSelectApplication: (id: string) => void;
  onOpenAddModal: () => void;
  onOpenResetModal: () => void;
  onOpenOfficersModal: () => void;
  onDeleteApplication?: (app: LoanApplication) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  applications,
  isAdmin,
  onSelectApplication,
  onOpenAddModal,
  onOpenResetModal,
  onOpenOfficersModal,
  onDeleteApplication,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [riskFilter, setRiskFilter] = useState<string>('ALL');

  // Compute metrics
  const totalApps = applications.length;
  const needsReviewCount = applications.filter((a) => a.status === 'Needs Review').length;
  const processingCount = applications.filter((a) => a.status === 'Processing').length;
  const verifiedCount = applications.filter((a) => a.status === 'Verified').length;
  const missingDocsCount = applications.filter((a) =>
    a.documents.some((d) => d.status === 'Missing' || d.status === 'Pending')
  ).length;

  const lowRiskCount = applications.filter((a) => a.risk === 'LOW').length;
  const mediumRiskCount = applications.filter((a) => a.risk === 'MEDIUM').length;
  const highRiskCount = applications.filter((a) => a.risk === 'HIGH').length;

  // Filter applications
  const filtered = applications.filter((app) => {
    const matchesSearch =
      app.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.customer.employer.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || app.status === statusFilter;
    const matchesRisk = riskFilter === 'ALL' || app.risk === riskFilter;

    return matchesSearch && matchesStatus && matchesRisk;
  });

  const getStatusBadge = (status: ApplicationStatus) => {
    switch (status) {
      case 'Verified':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
            Verified
          </span>
        );
      case 'Needs Review':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <AlertTriangle className="w-3.5 h-3.5 mr-1 text-amber-600" />
            Needs Review
          </span>
        );
      case 'Processing':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-100 text-sky-800 border border-sky-200">
            <Clock className="w-3.5 h-3.5 mr-1 text-sky-600" />
            Processing
          </span>
        );
    }
  };

  const getRiskBadge = (risk: RiskLevel) => {
    switch (risk) {
      case 'LOW':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">
            LOW RISK
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-300">
            MEDIUM RISK
          </span>
        );
      case 'HIGH':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-300">
            HIGH RISK
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Loan Verification Pipeline</h1>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Cross-examine declared incomes, salary credit histories, and required documentation.
          </p>
        </div>

        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onOpenAddModal}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-sm transition active:scale-[0.99]"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add Test Application</span>
            </button>

            <button
              onClick={onOpenOfficersModal}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-300 transition"
            >
              <Users className="w-4 h-4 text-slate-600" />
              <span>Manage Officers</span>
            </button>

            <button
              onClick={onOpenResetModal}
              className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold border border-rose-200 transition"
              title="Restore original 3 seed records"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
              <span>Reset Demo Data</span>
            </button>
          </div>
        )}
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Pipeline</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{totalApps}</p>
          <div className="mt-2 text-[11px] text-slate-400 font-medium">Fictional Demo Applications</div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-amber-200 bg-amber-50/20">
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Needs Review</p>
          <p className="text-2xl font-black text-amber-900 mt-1">{needsReviewCount}</p>
          <div className="mt-2 text-[11px] text-amber-700 font-medium">Income gaps or flags</div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-sky-200 bg-sky-50/20">
          <p className="text-xs font-semibold text-sky-700 uppercase tracking-wider">Processing</p>
          <p className="text-2xl font-black text-sky-900 mt-1">{processingCount}</p>
          <div className="mt-2 text-[11px] text-sky-700 font-medium">Pending doc verification</div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-emerald-200 bg-emerald-50/20">
          <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Verified</p>
          <p className="text-2xl font-black text-emerald-900 mt-1">{verifiedCount}</p>
          <div className="mt-2 text-[11px] text-emerald-700 font-medium">Docs complete & low gap</div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 col-span-2 md:col-span-1">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Docs</p>
          <p className="text-2xl font-black text-slate-800 mt-1">{missingDocsCount}</p>
          <div className="mt-2 text-[11px] text-slate-500 font-medium">Awaiting paperwork</div>
        </div>
      </div>

      {/* Risk Distribution Breakdown Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <Layers className="w-4 h-4 text-teal-600" />
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Baseline Risk Profile</span>
        </div>
        <div className="flex items-center space-x-3 text-xs">
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
            <span className="font-semibold text-slate-700">Low: {lowRiskCount}</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-500"></span>
            <span className="font-semibold text-slate-700">Medium: {mediumRiskCount}</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-500"></span>
            <span className="font-semibold text-slate-700">High: {highRiskCount}</span>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Application ID (e.g. APP-1001), Customer Name, or Employer..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-sm"
          />
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex-1 md:flex-none px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-sm"
          >
            <option value="ALL">All Statuses</option>
            <option value="Needs Review">Needs Review</option>
            <option value="Processing">Processing</option>
            <option value="Verified">Verified</option>
          </select>

          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="flex-1 md:flex-none px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-sm"
          >
            <option value="ALL">All Risk Levels</option>
            <option value="LOW">Low Risk</option>
            <option value="MEDIUM">Medium Risk</option>
            <option value="HIGH">High Risk</option>
          </select>
        </div>
      </div>

      {/* Applications Table / Cards */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <FileQuestion className="w-12 h-12 mx-auto text-slate-400 mb-3" />
            <p className="text-sm font-semibold text-slate-700">No applications match your filter criteria.</p>
            <p className="text-xs text-slate-400 mt-1">Try adjusting your search terms or clearing filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Application ID
                  </th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Applicant & Employer
                  </th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Loan Details
                  </th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Income & Gap
                  </th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Risk Assessment
                  </th>
                  <th className="px-5 py-3.5 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100 text-sm">
                {filtered.map((app) => (
                  <tr
                    key={app.id}
                    onClick={() => onSelectApplication(app.id)}
                    className="hover:bg-teal-50/40 cursor-pointer transition"
                  >
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-slate-900">{app.id}</span>
                        {app.isSeedRecord && (
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                            Seed
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap">
                      <div>
                        <p className="font-bold text-slate-900">{app.customer.name}</p>
                        <p className="text-xs text-slate-500 flex items-center space-x-1 mt-0.5">
                          <Building2 className="w-3 h-3 text-slate-400" />
                          <span>
                            {app.customer.employer} ({app.customer.city})
                          </span>
                        </p>
                      </div>
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap">
                      <div>
                        <p className="font-semibold text-slate-900">{app.loan.type}</p>
                        <p className="text-xs text-slate-500">
                          {formatINR(app.loan.amount)} • {app.loan.tenureMonths} mos
                        </p>
                      </div>
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap">
                      <div>
                        <p className="text-xs font-semibold text-slate-800">
                          Dec: {formatINR(app.declaredMonthlyIncome)}
                        </p>
                        <p className="text-xs text-slate-500">
                          Avg: {formatINR(Math.round(app.avgSalaryCredit))}
                          <span
                            className={`ml-1 font-bold ${
                              app.incomeGapPct > 10
                                ? 'text-rose-600'
                                : app.incomeGapPct > 5
                                ? 'text-amber-600'
                                : 'text-emerald-600'
                            }`}
                          >
                            ({app.incomeGapPct.toFixed(1)}%)
                          </span>
                        </p>
                      </div>
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap">{getStatusBadge(app.status)}</td>

                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="flex flex-col space-y-1">
                        <div>{getRiskBadge(app.risk)}</div>
                        {app.verification && (
                          <span className="text-[10px] text-teal-700 font-semibold flex items-center space-x-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
                            <span>AI Verified</span>
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap text-right">
                      <div className="inline-flex items-center space-x-1.5 justify-end">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectApplication(app.id);
                          }}
                          className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-semibold transition"
                        >
                          <span>Inspect</span>
                          <ChevronRight className="w-3.5 h-3.5 text-teal-600" />
                        </button>
                        {isAdmin && !app.isSeedRecord && !['APP-1001', 'APP-1002', 'APP-1003'].includes(app.id) && onDeleteApplication && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteApplication(app);
                            }}
                            className="inline-flex items-center p-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition"
                            title={`Delete application ${app.id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
