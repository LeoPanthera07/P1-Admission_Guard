## `prompts/prompt-07-audit.md`

```markdown
# Prompt 07 — Storage Adapter, Audit Log & Success Screen

## R.I.C.E. Framework

**Role:**
You are a senior frontend developer on AdmitGuard. The full validation engine (strict + soft
+ exceptions) is complete and passing all edge cases. Now implement client-side persistence,
the submission success screen, and the full Audit Log view.

**Intent:**
1. Implement `storage.js` with localStorage abstraction for submissions and theme
2. Wire up the form submission to save a `candidateRecord` to localStorage on success
3. Build the submission success screen
4. Build the full Audit Log view with table, filters, row highlighting, and detail view

**Constraints:**
- localStorage key for submissions: `"admitguard-submissions"`
- localStorage key for theme: `"admitguard-theme"`
- Every saved record must include `schemaVersion: "1.0.0"` for forward compatibility
- `storage.js` must export only two functions: `getSubmissions()` and `saveSubmission(record)`
- Audit Log table must be horizontally scrollable on narrow viewports
- Flagged rows (`flaggedForManager: true`) must be visually highlighted (amber left border
  or amber background tint — not full red)
- Do NOT modify `validator.js` in this prompt
- "Clear Log" button must show a browser `confirm()` dialog before clearing

**Storage Adapter (`storage.js`):**
```javascript
const STORAGE_KEY = "admitguard-submissions";

function getSubmissions() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveSubmission(candidateRecord) {
  const submissions = getSubmissions();
  submissions.push(candidateRecord);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(submissions));
}
candidateRecord Shape (compose in app.js on successful submit):

javascript
{
  schemaVersion: "1.0.0",
  id: Date.now(),
  createdAt: new Date().toISOString(),
  fullName: formState.fullName,
  email: formState.email,
  phone: formState.phone,
  dateOfBirth: formState.dateOfBirth,
  highestQualification: formState.highestQualification,
  graduationYear: formState.graduationYear,
  percentageOrCgpa: formState.percentageOrCgpa,
  cgpaMode: formState.cgpaMode,        // "percentage" or "cgpa"
  screeningTestScore: formState.screeningTestScore,
  interviewStatus: formState.interviewStatus,
  aadhaarNumber: formState.aadhaarNumber,
  offerLetterSent: formState.offerLetterSent,
  exceptions: {
    // Per-field: only include fields where exception was used
    // e.g. dateOfBirth: { used: true, rationale: "special case approved by..." }
  },
  exceptionCount: exceptionCount,
  flaggedForManager: flaggedForManager,
}
Success Screen (FR-7) — appears after save, replaces form:

text
┌─────────────────────────────────────────────────┐
│  ✓  Candidate Saved Successfully                │
├─────────────────────────────────────────────────┤
│  Full Name:       John Doe                      │
│  Email:           john@example.com              │
│  Interview Status: Cleared                      │
│  Offer Letter:    Yes                           │
│  ...                                            │
├─────────────────────────────────────────────────┤
│  Exceptions Used: 1                             │
│  Flagged for Manager: No                        │
│  ─────────────────────────────────────────────  │
│  dateOfBirth Exception Rationale:               │
│  "Special case approved by program director..."  │
├─────────────────────────────────────────────────┤
│  [ + New Candidate ]    [ → Go to Audit Log ]  │
└─────────────────────────────────────────────────┘
Audit Log View (FR-9):

Table columns (in order):

(index, 1-based)
Full Name

Email

Submitted At (createdAt formatted as DD MMM YYYY, HH:MM)

Exceptions (exceptionCount as a badge)

Flagged (✓ or —)

Interview Status

Offer Letter

Actions → "View Details" button

Filters above the table:

Search input: filters by email or phone (substring match)

Flagged toggle: "Show Flagged Only" checkbox

Clear Log button (with confirm dialog): "Are you sure? This will permanently delete all submission records."

Row detail view (expand inline or modal):

Show all field values

Show each exception field with its rationale text

Show createdAt, schemaVersion, flaggedForManager

Checkpoint:

Submit 3 candidates: one clean, one with 1 exception, one with 3 exceptions (flagged)

Audit log shows all 3 with correct exception counts and flagged status

Flagged row is highlighted

Filter by flagged — shows only flagged row

Search "john" — filters by name/email

Click "View Details" — full record visible

Refresh browser — data persists

Clear Log → confirm dialog → log clears