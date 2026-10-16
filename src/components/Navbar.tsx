import React from 'react';
import { UserProfile } from '../types';
import { ShieldCheck, User, LogOut, LayoutDashboard, Terminal } from 'lucide-react';

interface NavbarProps {
  user: UserProfile | null;
  activeNav: 'pipeline' | 'admin-console';
  onSelectNav: (nav: 'pipeline' | 'admin-console') => void;
  onSignOut: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  activeNav,
  onSelectNav,
  onSignOut,
}) => {
  const isAdmin = user?.role === 'admin';

  return (
    <header className="bg-[#0B192C] text-white border-b border-slate-800 shadow-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand & Wordmark */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-teal-500 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-teal-500/20">
            <ShieldCheck className="w-6 h-6 text-slate-900" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-lg tracking-tight text-white">ClaimClarity</span>
              <span className="bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs px-2 py-0.5 rounded font-mono font-bold">
                AI
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">BFSI Loan Document Verification & Risk Assistance</p>
          </div>
        </div>

        {/* Global Controls & Status */}
        <div className="flex items-center space-x-3">
          {/* Fictional Demo Badge (Always visible per prompt) */}
          <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-300 text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
            <span>Fictional Demo Data</span>
          </div>

          {/* Admin Navigation Switcher (Only visible to Administrators) */}
          {isAdmin && (
            <div className="hidden sm:flex items-center bg-slate-900/90 border border-slate-800 rounded-xl p-1 space-x-1">
              <button
                onClick={() => onSelectNav('pipeline')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeNav === 'pipeline'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Loan Pipeline</span>
              </button>

              <button
                onClick={() => onSelectNav('admin-console')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeNav === 'admin-console'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>Admin & Dev Console</span>
              </button>
            </div>
          )}

          {/* User Profile & Sign Out */}
          {user && (
            <div className="flex items-center space-x-2 pl-2 border-l border-slate-800">
              <div className="flex items-center space-x-2 bg-slate-900/90 px-3 py-1.5 rounded-lg border border-slate-800">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <div className="text-left hidden md:block">
                  <p className="text-xs font-semibold text-slate-200 max-w-[140px] truncate">{user.email}</p>
                  <p className="text-[10px] uppercase font-bold tracking-wider">
                    {user.role === 'admin' ? (
                      <span className="text-purple-400">Admin</span>
                    ) : user.role === 'officer' ? (
                      <span className="text-teal-400">Authorized Officer</span>
                    ) : (
                      <span className="text-amber-400">Pending Enrollment</span>
                    )}
                  </p>
                </div>
              </div>

              <button
                onClick={onSignOut}
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                title="Sign out from session"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Nav Switcher for Admin */}
      {isAdmin && (
        <div className="sm:hidden flex border-t border-slate-800 bg-slate-950 px-4 py-2 justify-around">
          <button
            onClick={() => onSelectNav('pipeline')}
            className={`flex items-center space-x-1.5 text-xs font-bold px-3 py-1 rounded-md ${
              activeNav === 'pipeline' ? 'text-teal-400 bg-slate-800' : 'text-slate-400'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Loan Pipeline</span>
          </button>
          <button
            onClick={() => onSelectNav('admin-console')}
            className={`flex items-center space-x-1.5 text-xs font-bold px-3 py-1 rounded-md ${
              activeNav === 'admin-console' ? 'text-purple-400 bg-slate-800' : 'text-slate-400'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Admin & Dev Console</span>
          </button>
        </div>
      )}
    </header>
  );
};
