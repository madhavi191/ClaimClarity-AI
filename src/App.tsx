import React, { useState, useEffect } from 'react';
import { UserProfile, LoanApplication, CalculationMetrics } from './types';
import {
  getCurrentUser,
  fetchApplications,
  fetchApplicationDetails,
} from './api';
import { signOutUser } from './firebase';
import { Navbar } from './components/Navbar';
import { LoginScreen } from './components/LoginScreen';
import { EnrollmentScreen } from './components/EnrollmentScreen';
import { DashboardView } from './components/DashboardView';
import { ApplicationDetailView } from './components/ApplicationDetailView';
import { AdminConsoleView } from './components/AdminConsoleView';
import { AddApplicationModal } from './components/AddApplicationModal';
import { OfficerManagementModal } from './components/OfficerManagementModal';
import { ResetConfirmModal } from './components/ResetConfirmModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { RotateCw, AlertCircle, CheckCircle2 } from 'lucide-react';

export function App() {
  // Session authentication state (strictly IN-MEMORY only - no localStorage/sessionStorage)
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Navigation state (for Administrators: toggle between Officer Pipeline and Admin/Dev Console)
  const [activeNav, setActiveNav] = useState<'pipeline' | 'admin-console'>('pipeline');

  // Application state
  const [applications, setApplications] = useState<LoanApplication[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [selectedAppDetail, setSelectedAppDetail] = useState<{
    application: LoanApplication;
    metrics: CalculationMetrics;
  } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Status banners
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Modal states for Admin operations
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<LoanApplication | null>(null);
  const [deletingApp, setDeletingApp] = useState<LoanApplication | null>(null);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isOfficersModalOpen, setIsOfficersModalOpen] = useState(false);

  // When token changes, fetch user profile and application data
  useEffect(() => {
    if (!token) {
      setUser(null);
      setApplications([]);
      setSelectedAppId(null);
      setSelectedAppDetail(null);
      setActiveNav('pipeline');
      return;
    }

    setAuthLoading(true);
    getCurrentUser(token)
      .then((profile) => {
        setUser(profile);
        if (profile.role === 'admin' || profile.role === 'officer') {
          return fetchApplications(token).then((apps) => setApplications(apps));
        }
      })
      .catch((err) => {
        console.error('Authentication check failed:', err);
        setErrorBanner(err?.message || 'Authentication error occurred.');
        setToken(null);
      })
      .finally(() => setAuthLoading(false));
  }, [token]);

  // When selectedAppId changes, fetch fresh details and metrics
  useEffect(() => {
    if (!token || !selectedAppId) {
      setSelectedAppDetail(null);
      return;
    }

    setDetailLoading(true);
    fetchApplicationDetails(token, selectedAppId)
      .then((data) => setSelectedAppDetail(data))
      .catch((err) => {
        setErrorBanner(`Failed to load details for ${selectedAppId}: ${err?.message}`);
        setSelectedAppId(null);
      })
      .finally(() => setDetailLoading(false));
  }, [token, selectedAppId]);

  const handleSignOut = async () => {
    await signOutUser();
    // Complete in-memory state wipe
    setToken(null);
    setUser(null);
    setApplications([]);
    setSelectedAppId(null);
    setSelectedAppDetail(null);
    setErrorBanner(null);
    setSuccessBanner(null);
    setDeletingApp(null);
    setActiveNav('pipeline');
  };

  const reloadApplications = async () => {
    if (!token) return;
    try {
      const apps = await fetchApplications(token);
      setApplications(apps);
      if (selectedAppId) {
        const detail = await fetchApplicationDetails(token, selectedAppId);
        setSelectedAppDetail(detail);
      }
    } catch (err: any) {
      setErrorBanner(err?.message || 'Failed to refresh application list.');
    }
  };

  const handleDeleteRequested = (app: LoanApplication) => {
    setErrorBanner(null);
    setSuccessBanner(null);
    setDeletingApp(app);
  };

  const handleDeleteSuccess = async (deletedId: string, message: string) => {
    setDeletingApp(null);
    setErrorBanner(null);
    if (selectedAppId === deletedId) {
      setSelectedAppId(null);
      setSelectedAppDetail(null);
    }
    setSuccessBanner(message || `Application ${deletedId} was deleted successfully.`);
    await reloadApplications();
  };

  const isAdmin = user?.role === 'admin';

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans">
      <Navbar
        user={user}
        activeNav={activeNav}
        onSelectNav={(nav) => {
          setActiveNav(nav);
          if (nav === 'admin-console') {
            setSelectedAppId(null);
            setSelectedAppDetail(null);
          }
        }}
        onSignOut={handleSignOut}
      />

      {errorBanner && (
        <div className="bg-rose-600 text-white px-4 py-2.5 text-xs font-semibold flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-2 max-w-7xl mx-auto w-full">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorBanner}</span>
            <button
              onClick={() => setErrorBanner(null)}
              className="ml-auto underline hover:text-rose-200"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {successBanner && (
        <div className="bg-emerald-600 text-white px-4 py-2.5 text-xs font-semibold flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-2 max-w-7xl mx-auto w-full">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successBanner}</span>
            <button
              onClick={() => setSuccessBanner(null)}
              className="ml-auto underline hover:text-emerald-200"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {authLoading ? (
          <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-3">
            <RotateCw className="w-8 h-8 text-teal-600 animate-spin" />
            <p className="text-sm font-semibold text-slate-600">Verifying security credentials...</p>
          </div>
        ) : !token ? (
          /* Screen 1: Login */
          <LoginScreen onLoginSuccess={(newToken) => setToken(newToken)} />
        ) : user?.role === 'unauthorized' ? (
          /* Screen 2: Officer Enrollment */
          <EnrollmentScreen
            token={token}
            userEmail={user.email}
            onEnrollmentSuccess={() => {
              getCurrentUser(token).then((profile) => {
                setUser(profile);
                if (profile.role === 'officer' || profile.role === 'admin') {
                  fetchApplications(token).then((apps) => setApplications(apps));
                }
              });
            }}
            onSignOut={handleSignOut}
          />
        ) : isAdmin && activeNav === 'admin-console' ? (
          /* Separate Administrator & Developer Console */
          <AdminConsoleView
            token={token}
            applications={applications}
            onRefreshApplications={reloadApplications}
            onOpenAddModal={() => {
              setEditingApp(null);
              setIsAddModalOpen(true);
            }}
            onOpenEditModal={(app) => {
              setEditingApp(app);
              setIsAddModalOpen(true);
            }}
            onDeleteApplication={handleDeleteRequested}
            onOpenResetModal={() => setIsResetModalOpen(true)}
            onBackToPipeline={() => setActiveNav('pipeline')}
          />
        ) : selectedAppDetail ? (
          /* Officer Application Detail & Verification View */
          detailLoading ? (
            <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-3">
              <RotateCw className="w-8 h-8 text-teal-600 animate-spin" />
              <p className="text-sm font-semibold text-slate-600">Loading loan application records...</p>
            </div>
          ) : (
            <ApplicationDetailView
              application={selectedAppDetail.application}
              metrics={selectedAppDetail.metrics}
              token={token}
              isAdmin={isAdmin}
              onBack={() => {
                setSelectedAppId(null);
                setSelectedAppDetail(null);
              }}
              onRefresh={reloadApplications}
              onOpenEditModal={(app) => {
                setEditingApp(app);
                setIsAddModalOpen(true);
              }}
              onDeleteApplication={handleDeleteRequested}
            />
          )
        ) : (
          /* Officer Pipeline Dashboard View (Simple, focused on verification & discrepancies) */
          <DashboardView
            applications={applications}
            isAdmin={isAdmin}
            onSelectApplication={(id) => setSelectedAppId(id)}
            onOpenAddModal={() => {
              setEditingApp(null);
              setIsAddModalOpen(true);
            }}
            onOpenResetModal={() => setIsResetModalOpen(true)}
            onOpenOfficersModal={() => setIsOfficersModalOpen(true)}
            onDeleteApplication={handleDeleteRequested}
          />
        )}
      </main>

      {/* Admin Modals (Strictly guarded by token & admin role) */}
      {token && isAdmin && (
        <>
          <AddApplicationModal
            token={token}
            isOpen={isAddModalOpen}
            editApp={editingApp}
            onClose={() => {
              setIsAddModalOpen(false);
              setEditingApp(null);
            }}
            onSuccess={reloadApplications}
          />

          <OfficerManagementModal
            token={token}
            isOpen={isOfficersModalOpen}
            onClose={() => setIsOfficersModalOpen(false)}
          />

          <ResetConfirmModal
            token={token}
            isOpen={isResetModalOpen}
            onClose={() => setIsResetModalOpen(false)}
            onSuccess={reloadApplications}
          />

          <DeleteConfirmModal
            token={token}
            isOpen={!!deletingApp}
            application={deletingApp}
            onClose={() => setDeletingApp(null)}
            onSuccess={handleDeleteSuccess}
          />
        </>
      )}
    </div>
  );
}

export default App;
