import React, { useState, useEffect } from 'react';
import { ShieldCheck, AlertCircle, ArrowRight, UserCheck, Play, Key } from 'lucide-react';
import {
  signInWithGoogle,
  signInAsTestOfficer,
  isRealFirebaseConfigured,
  formatAuthErrorMessage,
} from '../firebase';

interface LoginScreenProps {
  onLoginSuccess: (token: string) => void;
  redirectError?: string | null;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess, redirectError }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(redirectError || null);

  useEffect(() => {
    if (redirectError) {
      setError(redirectError);
    }
  }, [redirectError]);

  const handleEnterDemoMode = () => {
    if (isRealFirebaseConfigured || (import.meta as any).env?.PROD) {
      setError(
        'Live Firebase Google Sign-In is enabled in this environment. Please click "Sign in with Google" with your authorized Google account.'
      );
      return;
    }
    // Immediate zero-setup demo mode entry for offline development
    const email = 'padduhoney150@gmail.com';
    const uid = 'demo-admin-session';
    const token = `mock-token:${email}:${uid}`;
    onLoginSuccess(token);
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await signInWithGoogle();
      if (res?.token) {
        onLoginSuccess(res.token);
      }
    } catch (err: any) {
      setError(formatAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleTestOfficerSignIn = async () => {
    if (isRealFirebaseConfigured || (import.meta as any).env?.PROD) {
      setError(
        'Live Firebase Google Sign-In is enabled in this environment. Please sign in with your Google account.'
      );
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { token } = await signInAsTestOfficer();
      onLoginSuccess(token);
    } catch (err: any) {
      setError(err?.message || 'Officer sign-in failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-slate-100">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Header Banner */}
        <div className="bg-[#0B192C] p-8 text-center text-white relative">
          <div className="w-16 h-16 rounded-2xl bg-teal-500 mx-auto flex items-center justify-center shadow-lg shadow-teal-500/30 mb-4">
            <ShieldCheck className="w-9 h-9 text-slate-900" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">ClaimClarity AI</h1>
          <p className="text-sm text-slate-300 mt-1 font-medium">
            BFSI Loan Document Verification & Risk Assistance
          </p>
          <div className="mt-4 inline-flex items-center space-x-1.5 px-3 py-1 bg-amber-500/20 border border-amber-400/30 rounded-full text-amber-200 text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            <span>Fictional Demo Environment</span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-8 space-y-6">
          <div className="text-center text-slate-600 text-sm">
            <p>
              An intelligent assistant for authorized bank and NBFC credit verification officers to cross-examine
              fictional customer records, verify salary credits, detect discrepancies, and inspect documentation.
            </p>
          </div>

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-3 text-rose-800 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-3">
            {isRealFirebaseConfigured ? (
              <>
                {/* Primary Google Sign-In with Real Firebase Auth */}
                <button
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full flex items-center justify-center space-x-3 py-3.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-sm shadow-md shadow-teal-600/20 transition active:scale-[0.99] disabled:opacity-50"
                >
                  <svg className="w-5 h-5 bg-white rounded-full p-0.5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>{loading ? 'Authenticating with Google...' : 'Sign in with Google'}</span>
                </button>
                <p className="text-[11px] text-center text-teal-800 font-medium">
                  Genuine Google identity token verified by Firebase Admin.
                </p>
              </>
            ) : (
              <>
                {/* Primary Demo Access Button: No Cloud Setup or Credentials Required */}
                <button
                  onClick={handleEnterDemoMode}
                  className="w-full flex items-center justify-center space-x-2.5 py-3.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-sm shadow-md shadow-teal-600/20 transition active:scale-[0.99]"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Explore Fictional Demo (No Setup Required)</span>
                </button>
                <p className="text-[11px] text-center text-slate-500 font-medium">
                  Immediate access to APP-1001, APP-1002, APP-1003, calculations, and admin tools.
                </p>

                <div className="relative py-2 text-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200"></div>
                  </div>
                  <span className="relative bg-white px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Or Sign In With Credentials
                  </span>
                </div>

                {/* Google Sign-In with Firebase Auth */}
                <button
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full flex items-center justify-center space-x-3 py-2.5 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-semibold text-xs shadow-xs transition active:scale-[0.99] disabled:opacity-50"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>{loading ? 'Redirecting...' : 'Sign in with Google'}</span>
                </button>

                {/* Test Officer Flow Button for Hackathon Judges */}
                <button
                  onClick={handleTestOfficerSignIn}
                  disabled={loading}
                  className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 transition"
                >
                  <Key className="w-3.5 h-3.5 text-amber-600" />
                  <span>Test Rate-Limited Officer Enrollment Flow</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </>
            )}
          </div>

          {/* Mandatory Regulatory Disclaimer */}
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
            <p className="text-[11px] text-amber-900 leading-relaxed font-medium text-center">
              AI-assisted document verification only. This system does not determine loan eligibility or approve or
              reject applications. All findings require human review.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
