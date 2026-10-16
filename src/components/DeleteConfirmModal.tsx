import React, { useState } from 'react';
import { LoanApplication } from '../types';
import { Trash2, AlertTriangle, X, ShieldAlert, RotateCw } from 'lucide-react';
import { deleteTestApplication } from '../api';
import { formatINR } from '../utils';

interface DeleteConfirmModalProps {
  token: string;
  isOpen: boolean;
  application: LoanApplication | null;
  onClose: () => void;
  onSuccess: (deletedId: string, message: string) => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  token,
  isOpen,
  application,
  onClose,
  onSuccess,
}) => {
  if (!isOpen || !application) return null;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSeedApp =
    application.isSeedRecord ||
    ['APP-1001', 'APP-1002', 'APP-1003'].includes(application.id);

  const handleConfirmDelete = async () => {
    if (isSeedApp) {
      setError('Cannot delete original seed demo applications: APP-1001, APP-1002, and APP-1003 are protected.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await deleteTestApplication(token, application.id);
      onSuccess(application.id, res.message || `Application ${application.id} was deleted successfully.`);
      onClose();
    } catch (err: any) {
      setError(err?.message || `Failed to delete application ${application.id}.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-rose-900 p-5 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Trash2 className="w-5 h-5 text-rose-300" />
            <div>
              <h2 className="text-base font-bold">Confirm Application Deletion</h2>
              <p className="text-xs text-rose-200">Permanent removal of test record</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1 rounded-lg text-rose-300 hover:text-white transition disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs">
          {/* Target Application Summary Card */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-mono font-black text-slate-900 text-sm">{application.id}</span>
              <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-semibold">
                {application.dataOrigin}
              </span>
            </div>
            <p className="font-bold text-slate-800 text-xs">{application.customer.name}</p>
            <p className="text-slate-500 text-[11px]">
              {application.loan.type} • {formatINR(application.loan.amount)} ({application.loan.tenureMonths} months)
            </p>
            <p className="text-slate-500 text-[11px]">
              Employer: {application.customer.employer} ({application.customer.city})
            </p>
          </div>

          {/* Seed Protection Warning */}
          {isSeedApp ? (
            <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-200 text-rose-900 flex items-start space-x-2.5">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Protected Seed Record</span>
                <span className="text-[11px] leading-relaxed block mt-0.5">
                  Original hackathon seed applications (APP-1001, APP-1002, and APP-1003) cannot be deleted. They are preserved to ensure consistent benchmark demonstrations.
                </span>
              </div>
            </div>
          ) : (
            <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 flex items-start space-x-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Permanent Deletion Warning</span>
                <span className="text-[11px] leading-relaxed block mt-0.5">
                  Are you sure you want to delete this fictional test application? This will remove the record from the pipeline and recalculate all dashboard KPI counts, risk distributions, and completeness metrics.
                </span>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              disabled={loading || isSeedApp}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition active:scale-[0.99] disabled:opacity-50 flex items-center space-x-1.5"
            >
              {loading ? (
                <>
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Confirm Delete</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
