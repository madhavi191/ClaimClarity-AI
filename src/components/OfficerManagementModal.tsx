import React, { useEffect, useState } from 'react';
import { AuthorizedOfficer } from '../types';
import { X, Users, UserX, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { fetchOfficers, revokeOfficerAccess } from '../api';

interface OfficerManagementModalProps {
  token: string;
  isOpen: boolean;
  onClose: () => void;
}

export const OfficerManagementModal: React.FC<OfficerManagementModalProps> = ({
  token,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const [officers, setOfficers] = useState<AuthorizedOfficer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revokingUid, setRevokingUid] = useState<string | null>(null);
  const [confirmUid, setConfirmUid] = useState<string | null>(null);

  const loadOfficers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchOfficers(token);
      setOfficers(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load enrolled officers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOfficers();
  }, [isOpen]);

  const handleRevoke = async (uid: string) => {
    setRevokingUid(uid);
    try {
      await revokeOfficerAccess(token, uid);
      setOfficers(officers.filter((o) => o.uid !== uid));
      setConfirmUid(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to revoke officer access.');
    } finally {
      setRevokingUid(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-[#0B192C] p-5 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Users className="w-5 h-5 text-teal-400" />
            <div>
              <h2 className="text-base font-bold">Authorized Officers Directory</h2>
              <p className="text-xs text-slate-300">Inspect and revoke access for enrolled officers</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="p-8 text-center text-slate-400">Loading authorized officers...</div>
          ) : officers.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <p className="font-semibold text-slate-600">No external officers currently enrolled.</p>
              <p className="text-[11px] mt-1">Officers will appear here once they complete the enrollment code flow.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {officers.map((officer) => (
                <div key={officer.uid} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-900">{officer.email}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                      UID: {officer.uid.substring(0, 16)}... • Enrolled: {new Date(officer.enrolledAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div>
                    {confirmUid === officer.uid ? (
                      <div className="flex items-center space-x-1.5">
                        <button
                          onClick={() => handleRevoke(officer.uid)}
                          disabled={revokingUid === officer.uid}
                          className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded text-[11px] transition"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setConfirmUid(null)}
                          className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-[11px]"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmUid(officer.uid)}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold border border-rose-200 transition"
                      >
                        <UserX className="w-3.5 h-3.5" />
                        <span>Revoke</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
