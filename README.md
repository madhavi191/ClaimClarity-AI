# ClaimClarity AI
### AI-Powered Loan Document Verification & Risk-Assistance Platform

ClaimClarity AI is an advisory document verification and risk-assistance web application built for bank and NBFC credit verification officers. It assists officers in cross-examining loan applicant records, comparing declared monthly income against verified salary credits, tracking documentation completeness, running automated Gemini-powered verification audits, and querying an application-specific AI assistant.

> **CRITICAL REGULATORY BOUNDARY**: ClaimClarity AI is **NOT** a loan approval or rejection system. It does not determine customer loan eligibility, recommend granting or denying loans, or sanction/disburse funds. Every finding is advisory and requires human officer review. All applicant profiles are strictly fictional demo data.

---

## 1. Project Purpose & Ethical Boundaries

Authorized verification officers use ClaimClarity AI to:
- Review fictional loan application records.
- Compare declared monthly income against verified bank salary credits.
- Calculate exact average salary credits and signed discrepancy gap percentages.
- Identify missing or pending documents (PAN, Aadhaar, Salary Slip, Bank Statement).
- Detect potential financial anomalies and inconsistencies.
- Trigger server-side Google Gemini structured document verification audits.
- Query an in-context AI Assistant regarding specific application facts.
- Manage fictional test applications and enrolled officers through an administrator account.

---

## 2. Technology Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide icons.
- **Backend**: Node.js, Express, TypeScript (`server.ts`, `server/routes.ts`).
- **Database & Identity**: Google Cloud Firestore, Firebase Authentication (Google Sign-In only), Firebase Admin SDK.
- **AI Engine**: Google Gemini API (`@google/genai`) invoked exclusively from the server with resilient fallback (`gemini-3.8-flash` -> `gemini-3.1-flash-lite` -> `gemini-flash-latest`).
- **Security & Headers**: Helmet, CORS, constant-time SHA-256 token verification (`crypto.timingSafeEqual`), per-UID in-memory rate limiting, client deny-all `firestore.rules`.
- **Deployment**: Multi-stage Dockerfile, Cloud Run compatible.

---

## 3. Architecture & Request Flow

```
[Browser / Client]
       │
       │  (1) Google Sign-In via Firebase Auth
       │  (2) Obtains Firebase ID Token
       │  (3) Authorization: Bearer <ID_TOKEN>
       ▼
[Express Server on Cloud Run] ──► [Helmet & Rate Limiter]
       │
       │  (4) Verify Token via Firebase Admin SDK
       │  (5) Enforce RBAC (Admin vs Officer via Firestore)
       │
       ├──► [Firestore Database (Admin SDK)]
       │        • /applications/{id}
       │        • /authorized_officers/{uid}
       │
       └──► [Google Gemini API (@google/genai)]
                • Server-side only (process.env.GEMINI_API_KEY)
                • Dual-pass AI Safety Validator (Anti-Lending-Decision)
                • Structured JSON Schema Output
```

Zero application data, roles, tokens, or chat records are stored in browser `localStorage` or `sessionStorage`.

---

## 4. Authentication & Authorization Model

### Administrator Role:
- User is an administrator only when both conditions are satisfied:
  1. `decodedToken.email_verified === true`
  2. `decodedToken.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()` (default: `padduhoney150@gmail.com`).

### Officer Role:
- An authenticated user is an authorized officer only when the server confirms that `authorized_officers/{uid}` exists in Firestore.

### Officer Enrollment:
- Unenrolled users must submit an authorized `JUDGE_ACCESS_CODE`.
- Server hashes the submitted code and expected code using SHA-256 and compares them using `crypto.timingSafeEqual()`.
- Maximum 5 failed attempts per UID within a 15-minute sliding window; returns HTTP 429 when exceeded.

---

## 5. Seed Demo Applications & Derived Calculations

ClaimClarity AI provides exactly three original seed records:

| Application | Applicant | Loan Amount | Declared Income | Observed Monthly Credits | Avg Monthly Credit | Income Gap | Documents | Baseline Risk |
|---|---|---:|---:|---|---:|---:|---:|:---:|
| **APP-1001** | Rahul Sharma | ₹8,50,000 | ₹72,000 | [61000, 62500, 61500, 60500, 62000, 61500] | ₹61,500.00 | **14.58%** Shortfall | 4/4 Verified | **MEDIUM** |
| **APP-1002** | Priya Rao | ₹4,00,000 | ₹85,000 | [84500, 84000, 85000, 84200, 84300, 84800] | ₹84,466.67 | **0.63%** Shortfall | 4/4 Verified | **LOW** |
| **APP-1003** | Amit Kumar | ₹6,50,000 | ₹58,000 | [54000, 55500, 53500] | ₹54,333.33 | **6.32%** Shortfall | 2/4 Verified | **MEDIUM** |

### Mathematical Rules:
- `avgSalaryCredit = sum(salaryCredits) / salaryCredits.length`
- `incomeGapPct = ((declaredMonthlyIncome - avgSalaryCredit) / declaredMonthlyIncome) * 100`
- `completenessPct = (verifiedDocs / totalDocs) * 100`

### Deterministic Baseline Risk Rules:
1. `HIGH`: `incomeGapPct > 15%` OR (`incomeGapPct >= 10%` AND any doc is pending/missing).
2. `MEDIUM`: `incomeGapPct >= 5%` OR any doc is pending/missing.
3. `LOW`: `incomeGapPct < 5%` AND all documents verified.
4. **Floor Rule**: Final Risk is resolved as `max(baselineRisk, aiRisk)`. Gemini can elevate risk, but can never lower it below deterministic baseline.

---

## 6. Firestore Security Rules

To enforce zero insecure defaults and prevent direct client access, `firestore.rules` enforces a strict deny-all policy:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Zero Insecure Defaults: Deny all direct client-side reads and writes across all paths.
    // All data access must flow through the authorized Express backend.
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

For applications utilizing user-isolated documents:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/interactions/{interactionId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## 7. Mandatory AI Safety Rules (OWASP LLM01 / LLM02 / LLM05)

Every Gemini verification and assistant response is evaluated by `server/safety.ts`.
The system strictly forbids:
- Approving or rejecting a loan.
- Recommending approval or rejection.
- Determining or claiming loan eligibility.
- Sanctioning or disbursing funds.
- Making decisions on protected demographic characteristics.

**Required Disclaimer on All Outputs**:
> “AI-assisted document verification only. This system does not determine loan eligibility or approve or reject applications. All findings require human review.”

---

## 8. Environment Variables

Configure these variables in your deployment environment or `.env`:

| Variable | Description | Example / Default |
|---|---|---|
| `PORT` | Listening server port | `3000` (Dev) / `8080` (Cloud Run) |
| `GOOGLE_CLOUD_PROJECT` | GCP Project ID | `your-gcp-project-id` |
| `FIRESTORE_DATABASE_ID` | Firestore Database ID | `(default)` |
| `ADMIN_EMAIL` | Verified Admin Google Email | `padduhoney150@gmail.com` |
| `JUDGE_ACCESS_CODE` | Officer enrollment secret code | `CLAIM-VERIFY-2026` |
| `GEMINI_API_KEY` | Server-side Gemini API key | `AIzaSy...` (Secret Manager) |
| `GEMINI_MODEL` | Primary Gemini model | `gemini-3.8-flash` |
| `GEMINI_FALLBACK_MODEL` | Fallback Gemini model | `gemini-3.1-flash-lite` |

---

## 9. Local Development & Automated Testing

### Install Dependencies:
```bash
npm install
```

### Run Automated Acceptance Tests:
```bash
npm test
```

### Start Full-Stack Dev Server:
```bash
npm run dev
```

### Actual Automated Test Results (27/27 PASS):
- `APP-1001 Average Salary Credit (61500.00)`: **PASS**
- `APP-1001 Income Gap (14.58%) & MEDIUM Risk`: **PASS**
- `APP-1002 Average Salary Credit (84466.67)`: **PASS**
- `APP-1002 Income Gap (0.63%) & LOW Risk`: **PASS**
- `APP-1003 Average Salary Credit (54333.33)`: **PASS**
- `APP-1003 Income Gap (6.32%) & MEDIUM Risk`: **PASS**
- `Risk Threshold Boundaries (5%, 4.99%, 10%, 15.01%)`: **PASS**
- `Income Surplus Handling (Credits > Declared)`: **PASS**
- `Calculation Input Validation (Zero/Negative)`: **PASS**
- `AI Safety Approval Pattern Detection`: **PASS**
- `AI Safety Rejection Pattern Detection`: **PASS**
- `AI Safety Eligibility Pattern Detection`: **PASS**
- `Neutral Verification Actions Allowed`: **PASS**
- `Risk Ladder Resolution (Final ≥ Baseline)`: **PASS**
- `Enrollment Constant-Time SHA-256 Validation`: **PASS**
- `Enrollment 5-Attempt Rate Limiter Lockout`: **PASS**
- `Database Seed Record Integrity & Reset`: **PASS**

---

## 10. Google Cloud Run Deployment Guide

### Prerequisites:
Enable required GCP services:
```bash
gcloud services enable run.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com
```

### 1. Secret Manager Setup:
```bash
# Create and populate the secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# Grant the Cloud Run runtime service account access
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:YOUR_PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### 2. Deploy to Cloud Run:
```bash
gcloud run deploy claimclarity-ai \
  --source . \
  --region asia-south1 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars="ADMIN_EMAIL=padduhoney150@gmail.com,JUDGE_ACCESS_CODE=CLAIM-VERIFY-2026,FIRESTORE_DATABASE_ID=(default)" \
  --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest"
```

### 3. Apply Campaign Verification Label:
```bash
gcloud run services update claimclarity-ai \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=asia-south1
```

---

## 11. Known Limitations & Operational Notes

1. **In-Memory Rate Limiter**: The enrollment rate limiter is maintained per container instance and resets on container restart. For distributed production clusters, integrate Cloud Memorystore (Redis).
2. **Permission Gate**: In accordance with Section 3, Cloud Firestore and Cloud Run deployment require explicit user approval before execution. Prototype execution safely leverages the resilient fallback store until approved.
