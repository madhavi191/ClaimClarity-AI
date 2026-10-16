import React, { useState } from 'react';
import { AlertTriangle, RotateCcw, X } from 'lucide-react';
import { resetDemoApplications } from '../api';

interface ResetConfirmModalProps {
  token: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ResetConfirmModal: React.FC<ResetConfirmModalProps> = ({
  token,
  isOpen,
  onClose,
  onSuccess,
}) => {
  if (!isOpen) return null;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirmReset = async () => {
    setLoading(true);
    setError(null);
    try {
      await resetDemoApplications(token);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to reset demo data.');
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
            <RotateCcw className="w-5 h-5 text-rose-300" />
            <h2 className="text-base font-bold">Reset Demo Data Confirmation</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-rose-300 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs">
          <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 flex items-start space-x-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span className="font-semibold leading-relaxed">
              This action will reset the application dataset back to its original hackathon baseline.
            </span>
          </div>

          <div className="space-y-2 text-slate-700">
            <p className="font-bold text-slate-900">The reset operation will perform the following:</p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600">
              <li>Restore the three original seed applications (APP-1001, APP-1002, APP-1003) to original values.</li>
              <li>Remove all additional fictional test applications created during testing.</li>
              <li>Clear saved Gemini verification results from all applications.</li>
              <li>Reset derived statuses and risk ratings to baseline values.</li>
              <li>
                <strong className="text-slate-900">Untouched:</strong> Firebase Authentication accounts and authorized
                officers directory will remain intact.
              </li>
            </ul>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800">
              {error}
            </div>
          )}

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-2">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmReset}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition active:scale-[0.99] disabled:opacity-50"
            >
              {loading ? 'Resetting Data...' : 'Confirm Reset Demo Data'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
