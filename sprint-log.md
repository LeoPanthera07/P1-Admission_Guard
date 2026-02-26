# AdmitGuard — Sprint Log

## Sprint 0 — Discovery & Planning
- Read and annotated project brief (all 11 fields, strict/soft/system rules)
- Sketched wireframe of 3 views: Candidate Form, Audit Log, Dashboard
- Drafted all 8 prompts using R.I.C.E. framework
- Set up repo structure: `src/`, `config/`, `docs/`, `prompts/`
- Committed: `sprint-0: project setup, planning docs, and research notes`

## Sprint 1 — Foundation: SPA Shell & Form Structure (Prompt 1)
**Prompt 1 — Foundation (this sprint):**
- Created `src/index.html` — SPA shell with all 3 views, all 11 fields, exception block scaffolding
- Created `src/styles.css` — full CSS custom properties system, light/dark theme, responsive layout
- Created `src/app.js` — view switching, theme toggle, score mode toggle, reset form, success screen
- Created `config/rules.json` — complete rule definitions for all 11 fields + system config
- Created `src/validator.js` — empty stub with Phase 3 comment
- Created `src/storage.js` — empty stub with Phase 5 comment
- Created `docs/architecture.md` — data flow, file responsibilities, candidateRecord shape

**Checkpoint passed:**
- [x] All 11 fields render with labels and empty error spans
- [x] Clicking nav tabs switches views without page reload
- [x] Layout is clean, card-based, professional
- [x] No validation fires on any input
- Committed: `sprint-1: base form structure`

## Sprint 2 — Strict Validation (Prompt 2 — TODO)
- Add `validateField` to `validator.js` for all strict rules
- Wire onChange/onBlur to show inline errors
- Disable submit button while strict violations exist

## Sprint 2 (cont.) — Edge Cases (Prompt 3 — TODO)
- Test: short name, name with numbers, phone wrong start, 11-digit Aadhaar, Rejected + submit

## Sprint 3 — Soft Rules + Exception System (Prompt 4 & 5 — TODO)
- Add soft rule validation (DOB age, graduation year, percentage/CGPA, screening score)
- Wire exception toggles, rationale textareas, char counter
- Compute exceptionCount; show flagged banner if > 2

## Sprint 4 — Configurable Rules Engine (Prompt 6 — TODO)
- Refactor validator to read entirely from `config/rules.json`

## Sprint 5 — Audit Log & Storage (Prompt 7 — TODO)
- Implement `storage.js` (getSubmissions, saveSubmission, renderAuditLog, renderDashboard)
- Add export CSV / JSON

## Sprint 6 — UI Polish & Theme (Prompt 8 — TODO)
- Use annotation mode in AI Studio for visual refinements
- Confirm modal before submission
- Final responsive pass
