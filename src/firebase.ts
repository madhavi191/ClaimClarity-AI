import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
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

/**
 * Triggers Google Sign-In popup with Firebase Auth.
 * In production mode, requires genuine Firebase web client configuration.
 * In local development mode, provides zero-setup fallback when cloud setup is pending.
 */
export async function signInWithGoogle(): Promise<{ token: string; email: string; uid: string }> {
  if (isRealFirebaseConfigured) {
    if (!auth) {
      throw new Error(
        'Firebase Auth failed to initialize. Please check that your Firebase Web App configuration is valid.'
      );
    }
    const result = await signInWithPopup(auth, googleProvider);
    const idToken = await result.user.getIdToken();
    return {
      token: idToken,
      email: result.user.email || '',
      uid: result.user.uid,
    };
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
