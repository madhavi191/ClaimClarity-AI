import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, Firestore, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { LoanApplication, AuthorizedOfficer, RiskLevel } from '../src/types.js';
import { calculateMetrics } from './calculations.js';

if (process.env.IS_TEST_RUNNER !== 'true') {
  dotenv.config({ override: true });
} else {
  dotenv.config();
}

const LOCAL_STORE_FILE = path.resolve(process.cwd(), '.demo-data.json');

export type StorageMode = 'LOCAL_DEMO' | 'FIRESTORE';

export class StorageConfigurationError extends Error {
  public readonly code: string;
  constructor(message: string, code: string = 'STORAGE_CONFIGURATION_ERROR') {
    super(message);
    this.name = 'StorageConfigurationError';
    this.code = code;
  }
}

export interface DatabaseStatus {
  configuredMode: string;
  activeStorageMode: 'LOCAL_DEMO' | 'FIRESTORE' | 'ERROR';
  storageLabel: string;
  isFirestoreConfigured: boolean;
  databaseId: string;
  projectId: string;
  storageType: 'firestore' | 'in-memory';
  error: string | null;
}

/**
 * Parses and validates the raw STORAGE_MODE environment variable or override.
 * Strictly supports 'LOCAL_DEMO' and 'FIRESTORE'. Defaults to 'LOCAL_DEMO' when unset or empty.
 */
export function parseStorageMode(rawMode?: string): {
  mode: StorageMode | 'INVALID';
  raw: string;
  isValid: boolean;
} {
  const envVal = rawMode !== undefined ? rawMode : process.env.STORAGE_MODE;
  const trimmed = (envVal || '').trim();

  if (trimmed === '' || trimmed === 'LOCAL_DEMO') {
    return { mode: 'LOCAL_DEMO', raw: trimmed || 'LOCAL_DEMO', isValid: true };
  }
  if (trimmed === 'FIRESTORE') {
    return { mode: 'FIRESTORE', raw: trimmed, isValid: true };
  }
  return { mode: 'INVALID', raw: trimmed, isValid: false };
}

/**
 * Creates the exact initial 3 seed fictional records.
 */
export function getInitialSeedApplications(): LoanApplication[] {
  const seed1Metrics = calculateMetrics(72000, [61000, 62500, 61500, 60500, 62000, 61500], [
    { name: 'PAN', status: 'Verified' },
    { name: 'Aadhaar', status: 'Verified' },
    { name: 'Salary Slip', status: 'Verified' },
    { name: 'Bank Statement', status: 'Verified' },
  ]);

  const app1001: LoanApplication = {
    id: 'APP-1001',
    customer: {
      name: 'Rahul Sharma',
      age: 34,
      employer: 'Nimbus BPM Services',
      city: 'Pune',
      employment: 'Salaried',
    },
    loan: {
      type: 'Home Loan',
      amount: 850000,
      tenureMonths: 180,
      purpose: 'Purchase of a 2BHK home',
    },
    declaredMonthlyIncome: 72000,
    salaryCredits: [61000, 62500, 61500, 60500, 62000, 61500],
    avgSalaryCredit: seed1Metrics.avgSalaryCredit,
    incomeGapPct: seed1Metrics.incomeGapPct,
    documents: [
      { name: 'PAN', status: 'Verified' },
      { name: 'Aadhaar', status: 'Verified' },
      { name: 'Salary Slip', status: 'Verified' },
      { name: 'Bank Statement', status: 'Verified' },
    ],
    status: 'Needs Review',
    risk: 'MEDIUM',
    verification: null,
    dataOrigin: 'Fictional Demo Data',
    isSeedRecord: true,
    createdAt: '2026-03-01T10:00:00.000Z',
    updatedAt: '2026-03-01T10:00:00.000Z',
  };

  const seed2Metrics = calculateMetrics(85000, [84500, 84000, 85000, 84200, 84300, 84800], [
    { name: 'PAN', status: 'Verified' },
    { name: 'Aadhaar', status: 'Verified' },
    { name: 'Salary Slip', status: 'Verified' },
    { name: 'Bank Statement', status: 'Verified' },
  ]);

  const app1002: LoanApplication = {
    id: 'APP-1002',
    customer: {
      name: 'Priya Rao',
      age: 29,
      employer: 'Zentra Analytics',
      city: 'Hyderabad',
      employment: 'Salaried',
    },
    loan: {
      type: 'Personal Loan',
      amount: 400000,
      tenureMonths: 48,
      purpose: 'Home renovation',
    },
    declaredMonthlyIncome: 85000,
    salaryCredits: [84500, 84000, 85000, 84200, 84300, 84800],
    avgSalaryCredit: seed2Metrics.avgSalaryCredit,
    incomeGapPct: seed2Metrics.incomeGapPct,
    documents: [
      { name: 'PAN', status: 'Verified' },
      { name: 'Aadhaar', status: 'Verified' },
      { name: 'Salary Slip', status: 'Verified' },
      { name: 'Bank Statement', status: 'Verified' },
    ],
    status: 'Verified',
    risk: 'LOW',
    verification: null,
    dataOrigin: 'Fictional Demo Data',
    isSeedRecord: true,
    createdAt: '2026-03-02T11:00:00.000Z',
    updatedAt: '2026-03-02T11:00:00.000Z',
  };

  const seed3Metrics = calculateMetrics(58000, [54000, 55500, 53500], [
    { name: 'PAN', status: 'Verified' },
    { name: 'Aadhaar', status: 'Verified' },
    { name: 'Salary Slip', status: 'Pending' },
    { name: 'Bank Statement', status: 'Pending' },
  ]);

  const app1003: LoanApplication = {
    id: 'APP-1003',
    customer: {
      name: 'Amit Kumar',
      age: 41,
      employer: 'Kumar Auto Components',
      city: 'Jaipur',
      employment: 'Salaried',
    },
    loan: {
      type: 'Vehicle Loan',
      amount: 650000,
      tenureMonths: 60,
      purpose: 'Four-wheeler purchase',
    },
    declaredMonthlyIncome: 58000,
    salaryCredits: [54000, 55500, 53500],
    avgSalaryCredit: seed3Metrics.avgSalaryCredit,
    incomeGapPct: seed3Metrics.incomeGapPct,
    documents: [
      { name: 'PAN', status: 'Verified' },
      { name: 'Aadhaar', status: 'Verified' },
      { name: 'Salary Slip', status: 'Pending' },
      { name: 'Bank Statement', status: 'Pending' },
    ],
    status: 'Processing',
    risk: 'MEDIUM',
    verification: null,
    dataOrigin: 'Fictional Demo Data',
    isSeedRecord: true,
    createdAt: '2026-03-03T09:30:00.000Z',
    updatedAt: '2026-03-03T09:30:00.000Z',
  };

  return [app1001, app1002, app1003];
}

export interface DatabaseOptions {
  storageMode?: string;
  storeFilePath?: string;
  firestoreInstance?: Firestore | any;
  projectId?: string;
  databaseId?: string;
}

export interface FirestoreInitResult {
  status: 'SEEDED' | 'PRESERVED' | 'SKIPPED' | 'UNAVAILABLE';
  seeded: boolean;
  existingCount: number;
  message: string;
}

export interface MockFirestoreOptions {
  initialApplications?: LoanApplication[];
  initialOfficers?: AuthorizedOfficer[];
  simulateUnavailable?: boolean;
}

/**
 * Creates an in-memory mock Firestore instance for safe, zero-cost, offline testing
 * and initialization verification without provisioning cloud resources or credentials.
 */
export function createMockFirestore(options?: MockFirestoreOptions) {
  const appsMap = new Map<string, LoanApplication>();
  const officersMap = new Map<string, AuthorizedOfficer>();

  if (options?.initialApplications) {
    for (const app of options.initialApplications) {
      appsMap.set(app.id, JSON.parse(JSON.stringify(app)));
    }
  }

  if (options?.initialOfficers) {
    for (const officer of options.initialOfficers) {
      officersMap.set(officer.uid, JSON.parse(JSON.stringify(officer)));
    }
  }

  const checkUnavailable = () => {
    if (options?.simulateUnavailable) {
      throw new Error('Simulated Firestore failure: service unavailable (503)');
    }
  };

  const mock = {
    _apps: appsMap,
    _officers: officersMap,
    _batchSetCalls: [] as { id: string; data: any }[],
    _batchDeleteCalls: [] as string[],
    _batchCommitCount: 0,
    setUnavailable(val: boolean) {
      if (options) options.simulateUnavailable = val;
    },
    collection(colName: string) {
      checkUnavailable();
      if (colName === 'applications') {
        return {
          async get() {
            checkUnavailable();
            const docs = Array.from(appsMap.values()).map((data) => ({
              id: data.id,
              data: () => JSON.parse(JSON.stringify(data)),
              ref: { id: data.id },
            }));
            return {
              empty: docs.length === 0,
              size: docs.length,
              docs,
              forEach(callback: (doc: any) => void) {
                docs.forEach(callback);
              },
            };
          },
          doc(docId: string) {
            checkUnavailable();
            return {
              id: docId,
              async get() {
                checkUnavailable();
                const exists = appsMap.has(docId);
                const data = exists ? JSON.parse(JSON.stringify(appsMap.get(docId))) : undefined;
                return {
                  exists,
                  data: () => data,
                };
              },
              async set(data: any) {
                checkUnavailable();
                appsMap.set(docId, JSON.parse(JSON.stringify(data)));
              },
              async delete() {
                checkUnavailable();
                appsMap.delete(docId);
              },
            };
          },
        };
      }
      if (colName === 'authorized_officers') {
        return {
          async get() {
            checkUnavailable();
            const docs = Array.from(officersMap.values()).map((data) => ({
              id: data.uid,
              data: () => JSON.parse(JSON.stringify(data)),
              ref: { id: data.uid },
            }));
            return {
              empty: docs.length === 0,
              size: docs.length,
              docs,
              forEach(callback: (doc: any) => void) {
                docs.forEach(callback);
              },
            };
          },
          doc(docId: string) {
            checkUnavailable();
            return {
              id: docId,
              async get() {
                checkUnavailable();
                const exists = officersMap.has(docId);
                const data = exists ? JSON.parse(JSON.stringify(officersMap.get(docId))) : undefined;
                return {
                  exists,
                  data: () => data,
                };
              },
              async set(data: any) {
                checkUnavailable();
                officersMap.set(docId, JSON.parse(JSON.stringify(data)));
              },
              async delete() {
                checkUnavailable();
                officersMap.delete(docId);
              },
            };
          },
        };
      }
      throw new Error(`Unrecognized collection: ${colName}`);
    },
    batch() {
      checkUnavailable();
      const pendingSets: { ref: any; data: any }[] = [];
      const pendingDeletes: any[] = [];
      return {
        set(ref: any, data: any) {
          pendingSets.push({ ref, data: JSON.parse(JSON.stringify(data)) });
          mock._batchSetCalls.push({ id: ref.id, data: JSON.parse(JSON.stringify(data)) });
        },
        delete(ref: any) {
          pendingDeletes.push(ref);
          mock._batchDeleteCalls.push(ref.id);
        },
        async commit() {
          checkUnavailable();
          for (const item of pendingSets) {
            appsMap.set(item.ref.id, item.data);
          }
          for (const ref of pendingDeletes) {
            appsMap.delete(ref.id);
          }
          mock._batchCommitCount++;
        },
      };
    },
  };

  return mock;
}

export class ApplicationDatabase {
  private firestoreInstance: Firestore | any | null = null;
  private isConfigured = false;
  private configuredMode: StorageMode | 'INVALID' = 'LOCAL_DEMO';
  private activeStorageMode: 'LOCAL_DEMO' | 'FIRESTORE' | 'ERROR' = 'LOCAL_DEMO';
  private storageLabel: string = 'Local Demo Storage';
  private configError: string | null = null;
  private memoryApplications: Map<string, LoanApplication> = new Map();
  private memoryOfficers: Map<string, AuthorizedOfficer> = new Map();
  private databaseId: string;
  private projectId: string;
  private storeFilePath: string;

  // Safe idempotent initialization state
  private firestoreInitialized = false;
  private initializationPromise: Promise<FirestoreInitResult> | null = null;
  private lastKnownFirestoreCount = 0;

  constructor(options?: DatabaseOptions) {
    this.databaseId = options?.databaseId || process.env.FIRESTORE_DATABASE_ID || '(default)';
    this.projectId = options?.projectId || process.env.GOOGLE_CLOUD_PROJECT || '';
    this.storeFilePath = options?.storeFilePath || LOCAL_STORE_FILE;

    if (options?.firestoreInstance) {
      this.firestoreInstance = options.firestoreInstance;
    }

    // Initialize in-memory seed records
    for (const app of getInitialSeedApplications()) {
      this.memoryApplications.set(app.id, app);
    }

    this.configure(options?.storageMode, options?.firestoreInstance);
  }

  public configure(storageModeInput?: string, injectedFirestore?: Firestore | any) {
    const parsed = parseStorageMode(storageModeInput);
    this.configuredMode = parsed.mode;
    this.firestoreInitialized = false;

    if (injectedFirestore) {
      this.firestoreInstance = injectedFirestore;
    }

    if (!parsed.isValid) {
      this.activeStorageMode = 'ERROR';
      this.storageLabel = 'Invalid Storage Configuration';
      this.isConfigured = false;
      this.firestoreInstance = null;
      this.configError = `Invalid STORAGE_MODE: "${parsed.raw}". Supported modes are strictly 'LOCAL_DEMO' and 'FIRESTORE'.`;
      return;
    }

    if (parsed.mode === 'LOCAL_DEMO') {
      this.activeStorageMode = 'LOCAL_DEMO';
      this.storageLabel = 'Local Demo Storage';
      this.isConfigured = false;
      this.firestoreInstance = null;
      this.configError = null;
      // Load persisted local store if present
      this.loadLocalStore();
      return;
    }

    if (parsed.mode === 'FIRESTORE') {
      // If an instance was directly injected (e.g. mock or emulator), adopt it immediately
      if (this.firestoreInstance) {
        this.isConfigured = true;
        this.activeStorageMode = 'FIRESTORE';
        this.storageLabel = 'Cloud Firestore';
        this.configError = null;
        return;
      }

      // Must use existing Firebase Admin SDK and Firestore collections.
      // Do not initialize cloud resources automatically.
      const hasExplicitCredentials = Boolean(
        process.env.GOOGLE_APPLICATION_CREDENTIALS ||
        (process.env.ENABLE_FIRESTORE === 'true' && this.projectId) ||
        (this.projectId && !storageModeInput && process.env.STORAGE_MODE === 'FIRESTORE')
      );

      if (!hasExplicitCredentials || !this.projectId) {
        this.activeStorageMode = 'ERROR';
        this.storageLabel = 'Cloud Firestore (Unavailable)';
        this.isConfigured = false;
        this.firestoreInstance = null;
        this.configError = 'STORAGE_MODE is set to FIRESTORE, but Firebase credentials or GOOGLE_CLOUD_PROJECT are unconfigured. Cloud resources are not automatically provisioned.';
        return;
      }

      try {
        if (getApps().length === 0) {
          initializeApp({
            projectId: this.projectId,
          });
        }

        if (this.databaseId && this.databaseId !== '(default)') {
          const app = getApps()[0];
          this.firestoreInstance = getFirestore(app, this.databaseId);
        } else {
          this.firestoreInstance = getFirestore();
        }
        this.isConfigured = true;
        this.activeStorageMode = 'FIRESTORE';
        this.storageLabel = 'Cloud Firestore';
        this.configError = null;
      } catch (err: any) {
        this.activeStorageMode = 'ERROR';
        this.storageLabel = 'Cloud Firestore (Unavailable)';
        this.isConfigured = false;
        this.firestoreInstance = null;
        this.configError = `Failed to initialize Firestore: ${err?.message || 'Unknown initialization error'}`;
      }
    }
  }

  private loadLocalStore(): void {
    try {
      if (fs.existsSync(this.storeFilePath)) {
        const raw = fs.readFileSync(this.storeFilePath, 'utf-8');
        const data = JSON.parse(raw);
        if (Array.isArray(data.applications)) {
          for (const app of data.applications) {
            if (app && app.id) {
              this.memoryApplications.set(app.id, app);
            }
          }
        }
        if (Array.isArray(data.officers)) {
          for (const officer of data.officers) {
            if (officer && officer.uid) {
              this.memoryOfficers.set(officer.uid, officer);
            }
          }
        }
      } else {
        this.persistLocalStore();
      }
    } catch (err) {
      console.warn('Could not read local demo store:', err);
    }
  }

  private persistLocalStore(): void {
    try {
      const data = {
        applications: Array.from(this.memoryApplications.values()),
        officers: Array.from(this.memoryOfficers.values()),
      };
      fs.writeFileSync(this.storeFilePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.warn('Could not persist local demo store:', err);
    }
  }

  public getStatus(): DatabaseStatus {
    return {
      configuredMode: this.configuredMode,
      activeStorageMode: this.activeStorageMode,
      storageLabel: this.storageLabel,
      isFirestoreConfigured: this.isConfigured && this.activeStorageMode === 'FIRESTORE',
      databaseId: this.databaseId,
      projectId: this.projectId,
      storageType: this.activeStorageMode === 'FIRESTORE' ? 'firestore' : 'in-memory',
      error: this.configError,
    };
  }

  /**
   * Enforces storage mode availability before any query or mutation is executed.
   * If FIRESTORE is selected but unavailable, it throws a clear configuration error.
   * Never silently falls back to local storage while claiming Firestore is active.
   */
  private ensureReady(operation: string): void {
    if (this.configuredMode === 'INVALID') {
      throw new StorageConfigurationError(
        this.configError || `Invalid STORAGE_MODE configured. Cannot execute ${operation}.`,
        'INVALID_STORAGE_MODE'
      );
    }

    if (this.configuredMode === 'FIRESTORE') {
      if (!this.isConfigured || !this.firestoreInstance || this.configError) {
        throw new StorageConfigurationError(
          this.configError || `Firestore is selected as STORAGE_MODE, but the database connection is unavailable. Cannot execute ${operation}.`,
          'FIRESTORE_UNAVAILABLE'
        );
      }
    }
  }

  /**
   * Sanitizes object payloads before passing to Firestore by stripping undefined values.
   */
  private cleanPayload<T>(payload: T): T {
    return JSON.parse(JSON.stringify(payload));
  }

  /**
   * Safe, idempotent storage initialization.
   * - Never overwrites or deletes existing Firestore application records during startup.
   * - If the applications collection is empty, initializes the three original fictional seed applications exactly once.
   * - If records already exist, preserves them and does not reseed automatically.
   * - Do not automatically migrate or overwrite data from .demo-data.json.
   * - Keeps LOCAL_DEMO persistence unchanged.
   */
  public async initialize(): Promise<FirestoreInitResult> {
    if (this.configuredMode === 'INVALID') {
      throw new StorageConfigurationError(
        this.configError || 'Invalid STORAGE_MODE configured. Cannot initialize storage.',
        'INVALID_STORAGE_MODE'
      );
    }

    if (this.configuredMode === 'LOCAL_DEMO') {
      return {
        status: 'PRESERVED',
        seeded: false,
        existingCount: this.memoryApplications.size,
        message: 'LOCAL_DEMO mode active. Local persistence preserved without modification.',
      };
    }

    if (this.configuredMode === 'FIRESTORE') {
      if (!this.isConfigured || !this.firestoreInstance || this.configError) {
        throw new StorageConfigurationError(
          this.configError ||
            'STORAGE_MODE is set to FIRESTORE, but Firebase credentials or GOOGLE_CLOUD_PROJECT are unconfigured. Cloud resources are not automatically provisioned.',
          'FIRESTORE_UNAVAILABLE'
        );
      }

      // Idempotent safeguard: if already initialized in this process lifecycle, return preserved status immediately
      if (this.firestoreInitialized) {
        return {
          status: 'PRESERVED',
          seeded: false,
          existingCount: this.lastKnownFirestoreCount,
          message: 'Firestore collection was already verified and initialized in this process lifecycle.',
        };
      }

      // Concurrency lock: prevent multiple parallel initialization calls from racing
      if (this.initializationPromise) {
        return this.initializationPromise;
      }

      this.initializationPromise = (async () => {
        try {
          // Read existing applications non-destructively
          const snap = await this.firestoreInstance!.collection('applications').get();
          const existingCount = snap.size !== undefined ? snap.size : (snap.docs ? snap.docs.length : 0);

          if (existingCount > 0) {
            // Records already exist: PRESERVE THEM!
            // Never overwrite or delete existing Firestore application records during startup.
            // Do not reseed automatically.
            // Do not automatically migrate or overwrite data from .demo-data.json.
            this.firestoreInitialized = true;
            this.lastKnownFirestoreCount = existingCount;
            return {
              status: 'PRESERVED' as const,
              seeded: false,
              existingCount,
              message: `Preserved ${existingCount} existing Firestore application record(s). Automatic reseeding skipped.`,
            };
          }

          // Collection is empty: seed the 3 original fictional seed applications exactly once
          const initialSeeds = getInitialSeedApplications();
          const batch = this.firestoreInstance!.batch();

          for (const app of initialSeeds) {
            const ref = this.firestoreInstance!.collection('applications').doc(app.id);
            batch.set(ref, this.cleanPayload(app));
          }

          await batch.commit();

          this.firestoreInitialized = true;
          this.lastKnownFirestoreCount = initialSeeds.length;

          return {
            status: 'SEEDED' as const,
            seeded: true,
            existingCount: 0,
            message: 'Firestore applications collection was empty. Initialized the 3 original fictional seed applications (APP-1001, APP-1002, APP-1003).',
          };
        } catch (err: any) {
          this.firestoreInitialized = false;
          if (err instanceof StorageConfigurationError) {
            throw err;
          }
          throw new StorageConfigurationError(
            `Firestore initialization failed: ${err?.message || 'Database unavailable'}`,
            'FIRESTORE_QUERY_ERROR'
          );
        } finally {
          this.initializationPromise = null;
        }
      })();

      return this.initializationPromise;
    }

    return {
      status: 'SKIPPED',
      seeded: false,
      existingCount: 0,
      message: 'Unknown storage mode; initialization skipped.',
    };
  }

  private async ensureInitialized(): Promise<void> {
    if (this.configuredMode === 'FIRESTORE' && this.isConfigured && !this.firestoreInitialized) {
      await this.initialize();
    }
  }

  public async getAllApplications(): Promise<LoanApplication[]> {
    this.ensureReady('getAllApplications');
    await this.ensureInitialized();

    if (this.configuredMode === 'FIRESTORE') {
      try {
        const snap = await this.firestoreInstance!.collection('applications').get();
        const list: LoanApplication[] = [];
        snap.forEach((doc: QueryDocumentSnapshot) => {
          list.push(doc.data() as LoanApplication);
        });
        return list.sort((a, b) => a.id.localeCompare(b.id));
      } catch (err: any) {
        throw new StorageConfigurationError(
          `Firestore query failed: ${err?.message || 'Database unavailable'}`,
          'FIRESTORE_QUERY_ERROR'
        );
      }
    }

    return Array.from(this.memoryApplications.values()).sort((a, b) => a.id.localeCompare(b.id));
  }

  public async getApplicationById(id: string): Promise<LoanApplication | null> {
    this.ensureReady('getApplicationById');
    await this.ensureInitialized();

    if (this.configuredMode === 'FIRESTORE') {
      try {
        const doc = await this.firestoreInstance!.collection('applications').doc(id).get();
        if (doc.exists) {
          return doc.data() as LoanApplication;
        }
        return null;
      } catch (err: any) {
        throw new StorageConfigurationError(
          `Firestore query failed for application ${id}: ${err?.message || 'Database unavailable'}`,
          'FIRESTORE_QUERY_ERROR'
        );
      }
    }

    return this.memoryApplications.get(id) || null;
  }

  public async saveApplication(app: LoanApplication): Promise<LoanApplication> {
    this.ensureReady('saveApplication');
    await this.ensureInitialized();
    const clean = this.cleanPayload(app);

    if (this.configuredMode === 'FIRESTORE') {
      try {
        await this.firestoreInstance!.collection('applications').doc(app.id).set(clean);
        return clean;
      } catch (err: any) {
        throw new StorageConfigurationError(
          `Firestore save failed for application ${app.id}: ${err?.message || 'Database unavailable'}`,
          'FIRESTORE_MUTATION_ERROR'
        );
      }
    }

    this.memoryApplications.set(app.id, clean);
    this.persistLocalStore();
    return clean;
  }

  public async deleteApplication(id: string): Promise<boolean> {
    this.ensureReady('deleteApplication');
    await this.ensureInitialized();

    if (!id || typeof id !== 'string' || !id.trim()) {
      throw new Error('Application ID is required.');
    }

    const cleanId = id.trim();

    if (['APP-1001', 'APP-1002', 'APP-1003'].includes(cleanId)) {
      throw new Error('Cannot delete original seed demo applications: APP-1001, APP-1002, and APP-1003 are protected.');
    }

    const app = await this.getApplicationById(cleanId);
    if (!app) return false;
    if (app.isSeedRecord) {
      throw new Error('Cannot delete original seed demo applications: APP-1001, APP-1002, and APP-1003 are protected.');
    }

    if (this.configuredMode === 'FIRESTORE') {
      try {
        await this.firestoreInstance!.collection('applications').doc(cleanId).delete();
        return true;
      } catch (err: any) {
        throw new StorageConfigurationError(
          `Firestore delete failed for application ${cleanId}: ${err?.message || 'Database unavailable'}`,
          'FIRESTORE_MUTATION_ERROR'
        );
      }
    }

    this.memoryApplications.delete(cleanId);
    this.persistLocalStore();
    return true;
  }

  public async getNextApplicationId(): Promise<string> {
    this.ensureReady('getNextApplicationId');
    await this.ensureInitialized();
    const all = await this.getAllApplications();
    let maxNum = 1003;
    for (const app of all) {
      const match = app.id.match(/^APP-(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) {
          maxNum = num;
        }
      }
    }
    return `APP-${maxNum + 1}`;
  }

  public async resetDemoData(): Promise<void> {
    this.ensureReady('resetDemoData');
    const initialSeeds = getInitialSeedApplications();

    if (this.configuredMode === 'FIRESTORE') {
      try {
        const snap = await this.firestoreInstance!.collection('applications').get();
        const batch = this.firestoreInstance!.batch();

        snap.forEach((doc: QueryDocumentSnapshot) => {
          batch.delete(doc.ref);
        });

        for (const app of initialSeeds) {
          const ref = this.firestoreInstance!.collection('applications').doc(app.id);
          batch.set(ref, this.cleanPayload(app));
        }

        await batch.commit();
        this.firestoreInitialized = true;
        this.lastKnownFirestoreCount = initialSeeds.length;
        return;
      } catch (err: any) {
        throw new StorageConfigurationError(
          `Firestore reset failed: ${err?.message || 'Database unavailable'}`,
          'FIRESTORE_MUTATION_ERROR'
        );
      }
    }

    // LOCAL_DEMO reset
    this.memoryApplications.clear();
    for (const app of initialSeeds) {
      this.memoryApplications.set(app.id, app);
    }
    this.persistLocalStore();
  }

  // --- Officer Authorization Management ---

  public async getAuthorizedOfficer(uid: string): Promise<AuthorizedOfficer | null> {
    this.ensureReady('getAuthorizedOfficer');

    if (this.configuredMode === 'FIRESTORE') {
      try {
        const doc = await this.firestoreInstance!.collection('authorized_officers').doc(uid).get();
        if (doc.exists) {
          return doc.data() as AuthorizedOfficer;
        }
        return null;
      } catch (err: any) {
        throw new StorageConfigurationError(
          `Firestore query failed for officer ${uid}: ${err?.message || 'Database unavailable'}`,
          'FIRESTORE_QUERY_ERROR'
        );
      }
    }

    return this.memoryOfficers.get(uid) || null;
  }

  public async getAllAuthorizedOfficers(): Promise<AuthorizedOfficer[]> {
    this.ensureReady('getAllAuthorizedOfficers');

    if (this.configuredMode === 'FIRESTORE') {
      try {
        const snap = await this.firestoreInstance!.collection('authorized_officers').get();
        const list: AuthorizedOfficer[] = [];
        snap.forEach((doc: QueryDocumentSnapshot) => {
          list.push(doc.data() as AuthorizedOfficer);
        });
        return list;
      } catch (err: any) {
        throw new StorageConfigurationError(
          `Firestore query failed for officers: ${err?.message || 'Database unavailable'}`,
          'FIRESTORE_QUERY_ERROR'
        );
      }
    }

    return Array.from(this.memoryOfficers.values());
  }

  public async enrollOfficer(officer: AuthorizedOfficer): Promise<void> {
    this.ensureReady('enrollOfficer');
    const clean = this.cleanPayload(officer);

    if (this.configuredMode === 'FIRESTORE') {
      try {
        await this.firestoreInstance!.collection('authorized_officers').doc(officer.uid).set(clean);
        return;
      } catch (err: any) {
        throw new StorageConfigurationError(
          `Firestore save failed for officer ${officer.uid}: ${err?.message || 'Database unavailable'}`,
          'FIRESTORE_MUTATION_ERROR'
        );
      }
    }

    this.memoryOfficers.set(officer.uid, clean);
    this.persistLocalStore();
  }

  public async revokeOfficer(uid: string): Promise<boolean> {
    this.ensureReady('revokeOfficer');

    if (this.configuredMode === 'FIRESTORE') {
      try {
        await this.firestoreInstance!.collection('authorized_officers').doc(uid).delete();
        return true;
      } catch (err: any) {
        throw new StorageConfigurationError(
          `Firestore delete failed for officer ${uid}: ${err?.message || 'Database unavailable'}`,
          'FIRESTORE_MUTATION_ERROR'
        );
      }
    }

    this.memoryOfficers.delete(uid);
    this.persistLocalStore();
    return true;
  }
}

export const db = new ApplicationDatabase();
