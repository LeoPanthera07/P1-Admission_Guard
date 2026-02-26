# Prompt 08 — Dashboard, Export, UX Polish & Theme Toggle

## R.I.C.E. Framework

**Role:**
You are a senior frontend developer on the final build sprint for AdmitGuard. Core validation,
exceptions, storage, and audit log are all complete. This is the polish and feature-completion
sprint. Every decision here is about professional quality and operational usability.

**Intent:**
1. Build the Dashboard view with KPI cards and export buttons
2. Implement CSV and JSON export
3. Implement light/dark mode toggle with CSS variable switching
4. Polish all error message tones to be human-readable
5. Ensure responsive layout for narrow viewports
6. Add subtle UX improvements (success animations, character counter, visual hierarchy)

**Constraints:**
- No new validation logic — polish only
- CSS theme switching must use CSS variables exclusively — no JS inline style manipulation
- Export must use browser's native download mechanism (no libraries)
- Dashboard must compute metrics from `getSubmissions()` — no separate data store
- Performance: total page load must remain under 3 seconds
- Error messages must follow human language guidelines — no technical terms visible to users
- Mobile responsive is a bonus — at minimum, form fields stack on viewports < 768px wide

**Dashboard View (FR-10) — build in `#view-dashboard`:**

KPI Cards (4 cards in a 2×2 or 1×4 grid):
┌──────────────────┐ ┌──────────────────┐
│ Total Submissions│ │ With Exceptions │
│ 47 │ │ 12 │
└──────────────────┘ └──────────────────┘
┌──────────────────┐ ┌──────────────────┐
│ Exception Rate │ │ Flagged Entries │
│ 25.5% │ │ 3 │
└──────────────────┘ └──────────────────┘

text

Below KPI cards:
- "Latest Flagged Entries" — table showing last 5 flagged records (name, email, exceptionCount)
- "Export CSV" button and "Export JSON" button
- After export, show a brief inline success notification: "✓ Exported successfully"

**Export Implementation:**

JSON export:
```javascript
function exportJSON(submissions) {
  const blob = new Blob([JSON.stringify(submissions, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `admitguard-export-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
CSV export (flatten to these columns):
id, createdAt, fullName, email, phone, dateOfBirth, highestQualification, graduationYear, percentageOrCgpa, cgpaMode, screeningTestScore, interviewStatus, aadhaarNumber, offerLetterSent, exceptionCount, flaggedForManager, dobException, dobRationale, gradYearException, gradYearRationale, cgpaException, cgpaRationale, scoreException, scoreRationale

Light/Dark Mode (FR-12):

css
:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f8f9fa;
  --bg-card: #ffffff;
  --text-primary: #1a1a2e;
  --text-secondary: #4a4a6a;
  --text-muted: #9090a0;
  --accent-primary: #4f46e5;
  --accent-hover: #4338ca;
  --error-color: #dc2626;
  --warning-color: #d97706;
  --success-color: #16a34a;
  --border-color: #e2e8f0;
  --border-radius: 8px;
}

[data-theme="dark"] {
  --bg-primary: #0f172a;
  --bg-secondary: #1e293b;
  --bg-card: #1e293b;
  --text-primary: #f1f5f9;
  --text-secondary: #94a3b8;
  --text-muted: #64748b;
  --accent-primary: #818cf8;
  --accent-hover: #6366f1;
  --error-color: #f87171;
  --warning-color: #fbbf24;
  --success-color: #4ade80;
  --border-color: #334155;
}
Theme persistence:

javascript
// On toggle click:
const current = localStorage.getItem("admitguard-theme") || "light";
const next = current === "light" ? "dark" : "light";
document.documentElement.setAttribute("data-theme", next);
localStorage.setItem("admitguard-theme", next);
UX Polish Checklist:
Apply each of these improvements using Annotation Mode if available:

 Submit button: show loading state "Saving..." for 300ms before success screen

 Field validation: show a subtle green checkmark (✓) on blur when field is valid

 Rationale textarea: live character counter (18 / 30) below textarea

 Flagged banner: pulsing amber left border animation (CSS keyframe, not JS)

 Nav tabs: active tab has accent underline, not just bold

 Error messages: audit all 11 fields — replace any remaining technical terms
with human language (reference the guidelines in the project brief)

 Empty audit log: show a friendly empty state "No submissions yet. Add your first candidate."

 Empty dashboard: show "No data yet" in KPI cards instead of 0 or NaN

 Form reset: after "New Candidate" button click, scroll to top of form

Responsive Layout:

Below 768px: form fields stack to full width

Audit log table: overflow-x: auto on wrapper — horizontal scroll on small screens

Dashboard KPI cards: stack to 2×2 on tablet, 1×4 on desktop

Final Pre-Commit Checklist:

text
[ ] All 12 FRs verified working end-to-end
[ ] No console errors in Chrome DevTools
[ ] localStorage data persists after page refresh
[ ] Light/dark toggle works and persists
[ ] CSV export downloads correctly and opens in Excel
[ ] JSON export downloads valid JSON
[ ] Audit log filters work (flagged filter + search)
[ ] Exception rationale validation: length + keyword both enforced
[ ] Strict violations block submit with inline + banner errors
[ ] Soft violations require exception + rationale to submit
[ ] Manager flag triggers at > 2 exceptions, doesn't block submit
[ ] Page load under 3 seconds (Chrome DevTools → Network → check total load time)
Commit: sprint-4: dashboard, export, theme toggle, and full UX polish

text

***

## Phase 1 Prompt Files: Completion Summary

All 8 prompt files are production-ready and directly actionable.  Here is the execution order with their mapping to phases:[2][3][1]

| File | Phase | Sprint | Purpose |
|---|---|---|---|
| `prompt-01-foundation.md` | Phase 3 | Sprint 1 | SPA shell, all 11 fields, navigation [1][3] |
| `prompt-02-strict.md` | Phase 3 | Sprint 1 | Strict rule validation engine [1][2] |
| `prompt-03-edge-cases.md` | Phase 9 | Sprint 1 | Boundary testing and hardening [1][3] |
| `prompt-04-soft-rules.md` | Phase 4 | Sprint 2 | Soft rule warnings + exception toggle [1][2] |
| `prompt-05-exceptions.md` | Phase 4 | Sprint 2 | Rationale validation + manager flagging [1][3] |
| `prompt-06-config.md` | Phase 1 | Sprint 3 | Config-driven architecture audit [2][3] |
| `prompt-07-audit.md` | Phase 5 | Sprint 3 | Storage, success screen, audit log [1][2] |
| `prompt-08-polish.md` | Phase 6–7 | Sprint 4 | Dashboard, export, theming, UX polish [1][3] |