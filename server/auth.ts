import crypto from 'crypto';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { Request, Response, NextFunction } from 'express';
import { db } from './db.js';

export interface AuthenticatedUser {
  uid: string;
  email: string;
  emailVerified: boolean;
  role: 'admin' | 'officer' | 'unauthorized';
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Checks if the server is running in production authentication mode.
 * Production mode is triggered when NODE_ENV === 'production' or REQUIRE_FIREBASE_AUTH === 'true'.
 * When true, mock tokens are strictly forbidden and genuine Firebase ID tokens are enforced.
 */
export function isProductionAuth(): boolean {
  return (
    process.env.NODE_ENV === 'production' ||
    process.env.REQUIRE_FIREBASE_AUTH === 'true'
  );
}

// In-memory rate limiter tracking failed enrollment attempts per UID
interface RateLimitEntry {
  failedAttempts: number;
  firstFailedAt: number;
}
const enrollmentRateLimitMap = new Map<string, RateLimitEntry>();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_FAILED_ATTEMPTS = 5;

export function checkEnrollmentRateLimit(uid: string): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const entry = enrollmentRateLimitMap.get(uid);

  if (!entry) {
    return { allowed: true, retryAfterSeconds: 0 };
  }

  // Reset if window has elapsed
  if (now - entry.firstFailedAt > RATE_LIMIT_WINDOW_MS) {
    enrollmentRateLimitMap.delete(uid);
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (entry.failedAttempts >= MAX_FAILED_ATTEMPTS) {
    const remainingMs = RATE_LIMIT_WINDOW_MS - (now - entry.firstFailedAt);
    return { allowed: false, retryAfterSeconds: Math.ceil(remainingMs / 1000) };
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

export function recordFailedEnrollment(uid: string): void {
  const now = Date.now();
  const entry = enrollmentRateLimitMap.get(uid);

  if (!entry || now - entry.firstFailedAt > RATE_LIMIT_WINDOW_MS) {
    enrollmentRateLimitMap.set(uid, {
      failedAttempts: 1,
      firstFailedAt: now,
    });
  } else {
    entry.failedAttempts++;
  }
}

export function clearEnrollmentRateLimit(uid: string): void {
  enrollmentRateLimitMap.delete(uid);
}

/**
 * Extracts and verifies Firebase ID Token or developer test token.
 * In production mode (NODE_ENV=production or REQUIRE_FIREBASE_AUTH=true),
 * mock tokens are strictly forbidden and return 401 Unauthorized.
 */
export async function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers?.authorization;

  if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized: Missing or invalid Authorization header.',
      code: 'AUTH_HEADER_MISSING',
    });
  }

  const token = authHeader.split('Bearer ')[1]?.trim();
  if (!token) {
    return res.status(401).json({
      error: 'Unauthorized: Empty token provided.',
      code: 'TOKEN_EMPTY',
    });
  }

  try {
    let uid = '';
    let email = '';
    let emailVerified = false;

    // Handle mock tokens with strict production gate
    if (token.startsWith('mock-token:')) {
      if (isProductionAuth()) {
        return res.status(401).json({
          error: 'Unauthorized: Mock authentication tokens are strictly forbidden in production mode. A genuine Firebase ID token is required.',
          code: 'MOCK_TOKEN_FORBIDDEN',
        });
      }

      // Safe local development / prototype fallback mode only
      const parts = token.split(':');
      email = parts[1] || '';
      uid = parts[2] || '';

      if (!email || !uid) {
        return res.status(401).json({
          error: 'Unauthorized: Malformed developer mock token.',
          code: 'MALFORMED_MOCK_TOKEN',
        });
      }

      emailVerified = true;
    } else {
      // Genuine Firebase ID token validation via Firebase Admin SDK
      let apps = getApps();
      if (apps.length === 0) {
        const projectId =
          process.env.GOOGLE_CLOUD_PROJECT ||
          process.env.FIREBASE_PROJECT_ID ||
          process.env.VITE_FIREBASE_PROJECT_ID;
        if (projectId) {
          try {
            initializeApp({ projectId });
            apps = getApps();
          } catch {
            // Error initializing app handled below by checking apps.length
          }
        }
      }

      if (apps.length > 0) {
        try {
          const decoded = await getAuth().verifyIdToken(token);
          uid = decoded.uid;
          email = decoded.email || '';
          emailVerified = Boolean(decoded.email_verified);
        } catch (tokenErr: any) {
          return res.status(401).json({
            error: 'Unauthorized: Invalid Firebase ID token.',
            code: 'INVALID_ID_TOKEN',
          });
        }
      } else {
        return res.status(401).json({
          error: 'Unauthorized: Firebase Authentication service is not yet configured or token invalid.',
          code: 'FIREBASE_AUTH_UNAVAILABLE',
        });
      }
    }

    // Role assignment based on verified email and officer registry
    const adminEmails = (process.env.ADMIN_EMAIL || 'padduhoney150@gmail.com')
      .toLowerCase()
      .split(',')
      .map((e) => e.replace(/[()"' \t]/g, '').trim())
      .filter(Boolean);
    const isEmailAdmin = emailVerified && adminEmails.includes(email.toLowerCase().trim());

    let role: 'admin' | 'officer' | 'unauthorized' = 'unauthorized';

    if (isEmailAdmin) {
      role = 'admin';
    } else if (emailVerified) {
      // Officer role strictly requires verified email AND registered officer record
      const officerDoc = await db.getAuthorizedOfficer(uid);
      if (officerDoc) {
        role = 'officer';
      }
    }

    req.user = {
      uid,
      email,
      emailVerified,
      role,
    };

    next();
  } catch (err) {
    return res.status(401).json({
      error: 'Unauthorized: Failed to authenticate user credentials.',
      code: 'AUTH_FAILED',
    });
  }
}

/**
 * Middleware: Requires an authorized user (Admin or Officer) with verified email
 */
export function requireAuthorizedOfficerOrAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required.', code: 'AUTH_REQUIRED' });
  }

  if (req.user.emailVerified === false) {
    return res.status(403).json({
      error: 'Access denied: Email verification required.',
      code: 'EMAIL_VERIFICATION_REQUIRED',
    });
  }

  if (req.user.role !== 'admin' && req.user.role !== 'officer') {
    return res.status(403).json({
      error: 'Access denied: You are not authorized as an officer or administrator.',
      code: 'FORBIDDEN_ROLE',
    });
  }

  next();
}

/**
 * Middleware: Requires Administrator role only with verified email
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required.', code: 'AUTH_REQUIRED' });
  }

  if (req.user.emailVerified === false) {
    return res.status(403).json({
      error: 'Access denied: Email verification required.',
      code: 'EMAIL_VERIFICATION_REQUIRED',
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Access denied: Administrator privileges required for this operation.',
      code: 'FORBIDDEN_ADMIN_REQUIRED',
    });
  }

  next();
}

/**
 * Validates officer access code using SHA-256 and timingSafeEqual.
 */
export function verifyAccessCodeConstantTime(submittedCode: string): boolean {
  const configuredCode = process.env.JUDGE_ACCESS_CODE || 'CLAIM-VERIFY-2026';

  if (!submittedCode || typeof submittedCode !== 'string') {
    return false;
  }

  const hash1 = crypto.createHash('sha256').update(submittedCode.trim()).digest();
  const hash2 = crypto.createHash('sha256').update(configuredCode.trim()).digest();

  return crypto.timingSafeEqual(hash1, hash2);
}
