import React, { useState } from 'react';
import { KeyRound, AlertCircle, ShieldAlert, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { submitEnrollment } from '../api';

interface EnrollmentScreenProps {
  token: string;
  userEmail: string;
  onEnrollmentSuccess: () => void;
  onSignOut: () => void;
}

export const EnrollmentScreen: React.FC<EnrollmentScreenProps> = ({
  token,
  userEmail,
  onEnrollmentSuccess,
  onSignOut,
}) => {
  const [accessCode, setAccessCode] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessCode.trim()) return;

    setLoading(true);
    setError(null);

    try {
      await submitEnrollment(token, accessCode.trim());
      onEnrollmentSuccess();
    } catch (err: any) {
      setError(err?.message || 'Enrollment failed. Please verify code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-slate-100">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Banner */}
        <div className="bg-[#0B192C] p-6 text-white text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-500 mx-auto flex items-center justify-center shadow-lg shadow-amber-500/20 mb-3">
            <KeyRound className="w-7 h-7 text-slate-900" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">Officer Authorization Required</h2>
          <p className="text-xs text-slate-300 mt-1">
            Account <span className="font-semibold text-teal-400">{userEmail}</span> is not yet enrolled.
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <p className="text-xs text-slate-600 leading-relaxed">
            Please enter your authorized Bank / Hackathon Judge Access Code below to gain access to the
            verification dashboard. All enrollment attempts are monitored and rate-limited.
          </p>

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-3 text-rose-800 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Judge / Officer Access Code
            </label>
            <div className="relative">
              <input
                type={showCode ? 'text' : 'password'}
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                placeholder="Enter access code (e.g. CLAIM-VERIFY-2026)"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowCode(!showCode)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              Security Notice: Maximum 5 failed attempts per 15-minute window.
            </p>
          </div>

          <div className="space-y-2 pt-2">
            <button
              type="submit"
              disabled={loading || !accessCode.trim()}
              className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm shadow-sm transition active:scale-[0.99] disabled:opacity-50"
            >
              <span>{loading ? 'Verifying Code...' : 'Enroll Officer Access'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onSignOut}
              className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
            >
              Sign Out & Switch Account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
