import React, { useState } from 'react';
import { Cloud, ShieldAlert, CheckCircle2, X, AlertTriangle, Key } from 'lucide-react';

interface ApprovalGateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApprovalGateModal: React.FC<ApprovalGateModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const [approvedInUI, setApprovedInUI] = useState(false);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-[#0B192C] p-5 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Cloud className="w-5 h-5 text-teal-400" />
            <div>
              <h2 className="text-base font-bold">Cloud & Firebase Provisioning Gate</h2>
              <p className="text-xs text-slate-300">Mandatory Section 3 Permission Summary</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 flex items-start space-x-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed font-semibold">
              Strict Gate Policy: Zero cloud resources or billing configurations may be provisioned without explicit
              confirmation. Prototype code runs in secure local fallback until approved.
            </span>
          </div>

          <div className="space-y-3">
            <h3 className="font-extrabold text-slate-900 uppercase tracking-wider text-[11px]">
              Provisioning Specification Checklist:
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 font-semibold block">1. Signed-in Google Account</span>
                <span className="font-bold text-slate-900 mt-0.5 block">padduhoney150@gmail.com</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 font-semibold block">2. GCP/Firebase Project Display Name</span>
                <span className="font-bold text-slate-900 mt-0.5 block">ClaimClarity AI Production</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 font-semibold block">3. Exact Project ID</span>
                <span className="font-mono font-bold text-slate-900 mt-0.5 block">claimclarity-ai-2026</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 font-semibold block">4. Firestore Location</span>
                <span className="font-bold text-teal-700 mt-0.5 block">asia-south1 (Mumbai)</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 font-semibold block">5. Firestore Database ID</span>
                <span className="font-mono font-bold text-slate-900 mt-0.5 block">(default)</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 font-semibold block">6. Authorized Admin Email</span>
                <span className="font-bold text-slate-900 mt-0.5 block">padduhoney150@gmail.com</span>
              </div>
            </div>

            {/* Location Immutability Notice */}
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900">
              <span className="font-bold block mb-0.5">7. Critical Location Warning:</span>
              <p className="text-[11px] leading-relaxed">
                Once a Cloud Firestore database is created in a region (e.g. asia-south1), its location is permanent
                and cannot be changed or moved without deleting the entire database.
              </p>
            </div>

            {/* Expected Services & Charges */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 space-y-1.5">
              <span className="font-bold text-slate-900 block">8. Expected Cloud Services & Cost Scope:</span>
              <ul className="list-disc pl-5 space-y-0.5 text-[11px]">
                <li>Cloud Firestore (Standard tier - 1GB free daily quota)</li>
                <li>Firebase Authentication (Google Identity Platform - free tier)</li>
                <li>Google Cloud Run (Container execution on PORT 8080)</li>
                <li>Google Gemini API via Secret Manager (`GEMINI_API_KEY`)</li>
              </ul>
              <p className="text-[11px] text-slate-500 pt-1">
                Estimated prototype cost: ₹0 (fully within GCP Free Tier quotas).
              </p>
            </div>
          </div>

          {/* User Confirmation Checkbox */}
          <div className="p-4 bg-teal-50/60 rounded-xl border border-teal-200 space-y-2">
            <label className="flex items-start space-x-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={approvedInUI}
                onChange={(e) => setApprovedInUI(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              <span className="font-bold text-teal-950 text-xs">
                I explicitly acknowledge these configuration settings and authorize provisioning when cloud credentials are provided.
              </span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-medium">
            Status: {approvedInUI ? 'Provisioning Confirmed by Officer' : 'Awaiting Explicit Approval'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
