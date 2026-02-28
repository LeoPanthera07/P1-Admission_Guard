# AdmitGuard — Architecture

## Data Flow

```
User Input → Form (index.html)
           → validator.js (validateField / validateForm)
               reads → config/rules.json
           → Exception Engine (app.js state + validator.js)
           → storage.js (saveSubmission → localStorage)
           → Audit Log View  (renderAuditLog)
           → Dashboard View  (renderDashboard)
```

## File Responsibilities

| File | Role |
|------|------|
| `src/index.html` | Single entry point. Declares all 3 views, all 11 fields, exception blocks, banners. |
| `src/styles.css` | All styling via CSS custom properties. Light/dark theme. Responsive layout. |
| `src/app.js` | SPA view switching, theme toggle, score mode toggle, form reset, success screen, modal. |
| `src/validator.js` | (Phase 3) Config-driven field and form validation engine. |
| `src/storage.js` | (Phase 5) localStorage adapter, audit log renderer, dashboard renderer, export. |
| `config/rules.json` | Single source of truth for all eligibility rules, messages, and system config. |

## Rule Types

- **Strict** — Zero tolerance. Submission blocked. No exception UI rendered.
- **Soft** — Violation blocks submission by default. Exception toggle + rationale unlocks submission.
- **System** — Computed automatically (`exceptionCount`, `flaggedForManager`). Not editable.

## Exception Flow

1. Validator returns `isSoftViolation: true` for a field.
2. `exception-block` div for that field is shown.
3. User toggles "Mark as Exception".
4. Rationale textarea appears.
5. Rationale validated: ≥ 30 chars + contains one of the `softRuleKeywords`.
6. `exceptionCount` recomputed. If > 2 → `flaggedForManager = true` → banner shown.
7. On submit: re-validate all fields; for each soft violation, require either resolution or valid exception.

## Views

| View | ID | Purpose |
|------|----|---------|
| Candidate Form | `#view-form` | Primary data entry with real-time validation |
| Audit Log | `#view-audit` | Historical submissions table with filters and detail modal |
| Dashboard | `#view-dashboard` | KPI cards: total, with exceptions, exception rate, flagged |

## Local Storage Keys

| Key | Purpose |
|-----|---------|
| `admitguard-submissions` | JSON array of all `candidateRecord` objects |
| `admitguard-theme` | `"light"` or `"dark"` |

## candidateRecord Shape

```json
{
  "schemaVersion": 1,
  "id": "uuid-or-timestamp",
  "createdAt": "ISO-8601 timestamp",
  "fullName": "...",
  "email": "...",
  "phone": "...",
  "dateOfBirth": "...",
  "highestQualification": "...",
  "graduationYear": 2022,
  "percentageOrCgpa": 72.5,
  "scoreMode": "percentage",
  "screeningTestScore": 68,
  "interviewStatus": "Cleared",
  "aadhaarNumber": "...",
  "offerLetterSent": "Yes",
  "exceptions": {
    "dateOfBirth": { "used": false, "rationale": "", "rationaleValid": false }
  },
  "exceptionCount": 0,
  "flaggedForManager": false
}
```
