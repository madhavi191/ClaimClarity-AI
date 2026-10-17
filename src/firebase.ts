import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithRedirect,
  signInWithPopup,
  getRedirectResult,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';

// Public Firebase config variables from client env
const env = (import.meta as any).env || {};

const rawApiKey = (env.VITE_FIREBASE_API_KEY || '').trim();
const rawProjectId = (env.VITE_FIREBASE_PROJECT_ID || '').trim();
const rawAuthDomain =
  (env.VITE_FIREBASE_AUTH_DOMAIN || '').trim() ||
  (rawProjectId ? `${rawProjectId}.firebaseapp.com` : '');
const rawStorageBucket =
  (env.VITE_FIREBASE_STORAGE_BUCKET || '').trim() ||
  (rawProjectId ? `${rawProjectId}.firebasestorage.app` : '');
const rawMessagingSenderId = (env.VITE_FIREBASE_MESSAGING_SENDER_ID || '').trim();
const rawAppId = (env.VITE_FIREBASE_APP_ID || '').trim();

export const firebaseConfig = {
  apiKey: rawApiKey,
  authDomain: rawAuthDomain,
  projectId: rawProjectId,
  storageBucket: rawStorageBucket,
  messagingSenderId: rawMessagingSenderId,
  appId: rawAppId,
};

// Real Firebase is configured if API key and Project ID are genuinely set
export const isRealFirebaseConfigured = Boolean(
  rawApiKey &&
  rawApiKey !== 'AIzaSyDemoPlaceholderOnly' &&
  rawApiKey !== 'YOUR_API_KEY' &&
  rawProjectId &&
  rawProjectId !== 'claimclarity-ai'
);

let app: FirebaseApp | null = null;

try {
  if (isRealFirebaseConfigured && getApps().length === 0) {
    app = initializeApp(firebaseConfig);
  } else if (getApps().length > 0) {
    app = getApps()[0];
  }
} catch (err) {
  console.warn('Firebase client SDK initialization error:', err);
}

export const auth = app ? getAuth(app) : null;
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

/**
 * Safely detects whether the application is running embedded inside an iframe
 * (e.g. the Google AI Studio preview environment).
 */
export function isRunningInIframe(): boolean {
  try {
    return typeof window !== 'undefined' && window.self !== window.top;
  } catch {
    // Cross-origin access to window.top throws a SecurityError when sandboxed in an iframe
    return true;
  }
}

/**
 * Authenticates with Google via Firebase Auth.
 * Automatically adapts between environments:
 * 1. Inside an iframe (AI Studio preview): Uses `signInWithPopup` so the parent
 *    preview page does not navigate away, preventing the AI Studio Auth Bridge 403 error.
 * 2. Standalone window (Cloud Run / Safari direct): Uses `signInWithRedirect`
 *    for reliable, non-popup OAuth with redirect completion handled by `getRedirectResult`.
 */
export async function signInWithGoogle(): Promise<{ token: string; email: string; uid: string } | null> {
  if (isRealFirebaseConfigured) {
    if (!auth) {
      throw new Error(
        'Firebase Auth failed to initialize. Please check that your Firebase Web App configuration is valid.'
      );
    }

    // Inside iframe (e.g. AI Studio preview environment), use popup to prevent iframe navigation
    if (isRunningInIframe()) {
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();
      return {
        token: idToken,
        email: result.user.email || '',
        uid: result.user.uid,
      };
    }

    // Standalone browser window (e.g. Cloud Run production deployment), use redirect
    await signInWithRedirect(auth, googleProvider);
    return null;
  }

  // In production mode or when live credentials are required, reject mock authentication
  if ((import.meta as any).env?.PROD) {
    throw new Error(
      'Firebase Authentication is not configured with live project credentials. Please configure VITE_FIREBASE_* environment variables.'
    );
  }

  // Developer / Prototype mode fallback when running locally in development mode without credentials
  const email = 'padduhoney150@gmail.com';
  const uid = 'dev-admin-user-001';
  const token = `mock-token:${email}:${uid}`;

  return {
    token,
    email,
    uid,
  };
}

/**
 * Processes Firebase getRedirectResult when the user returns from signInWithRedirect.
 * Resolves to the user authentication details with a genuine Firebase ID token,
 * or null if this page load is not a redirect return.
 * Re-throws any authentic errors so callers can display clear user feedback.
 */
export async function getGoogleRedirectResult(): Promise<{
  token: string;
  email: string;
  uid: string;
} | null> {
  if (!isRealFirebaseConfigured || !auth) {
    return null;
  }

  // In an iframe, the popup flow is used instead of redirect
  if (isRunningInIframe()) {
    return null;
  }

  try {
    const result = await getRedirectResult(auth);
    if (result && result.user) {
      const idToken = await result.user.getIdToken();
      return {
        token: idToken,
        email: result.user.email || '',
        uid: result.user.uid,
      };
    }
    return null;
  } catch (err: any) {
    console.error('Firebase getRedirectResult error:', err);
    throw err;
  }
}

/**
 * Translates Firebase Auth error codes into human-readable, actionable explanations.
 */
export function formatAuthErrorMessage(error: any): string {
  const code = error?.code || '';
  const message = error?.message || 'Google Sign-In failed.';

  if (code === 'auth/unauthorized-domain') {
    return 'This domain is not authorized for OAuth in your Firebase project. Please add this domain to Firebase Console > Authentication > Settings > Authorized domains.';
  }
  if (code === 'auth/redirect-cancelled-by-user' || code === 'auth/popup-closed-by-user') {
    return 'Google Sign-In was cancelled before completion. Please try again.';
  }
  if (code === 'auth/network-request-failed') {
    return 'Network connection error during authentication. Please verify your connection and try again.';
  }
  if (code === 'auth/user-disabled') {
    return 'This user account has been disabled. Please contact your bank administrator.';
  }
  if (code === 'auth/operation-not-allowed') {
    return 'Google Sign-In is not enabled in Firebase Console. Please enable the Google provider in Firebase Console > Authentication > Sign-in method.';
  }
  return message;
}

/**
 * Sign in as an Officer for testing the officer perspective
 */
export async function signInAsTestOfficer(customEmail?: string): Promise<{ token: string; email: string; uid: string }> {
  if (isRealFirebaseConfigured || (import.meta as any).env?.PROD) {
    throw new Error(
      'Test Officer quick-login is disabled when live Firebase credentials are active. Please sign in with your genuine Google account.'
    );
  }
  const email = customEmail || 'officer.demo@nbfc-bank.in';
  const uid = `officer-uid-${Date.now()}`;
  const token = `mock-token:${email}:${uid}`;
  return { token, email, uid };
}

export async function signOutUser(): Promise<void> {
  if (auth && isRealFirebaseConfigured) {
    await firebaseSignOut(auth);
  }
}

