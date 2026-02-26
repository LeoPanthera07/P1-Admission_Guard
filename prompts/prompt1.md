# Prompt 01 — Foundation: SPA Shell & Form Structure

## R.I.C.E. Framework

**Role:**
You are a senior frontend developer building an internal business tool for an education
company's admissions operations team. The application is called AdmitGuard.

**Intent:**
Build the foundational shell of a Single Page Application (SPA) with three navigable views:
Candidate Form, Audit Log, and Dashboard. For now, only build the structural skeleton —
do NOT add any validation logic yet.

**Constraints:**
- No external CSS frameworks (no Bootstrap, no Tailwind, no Material UI)
- No backend server — this is a fully client-side application
- Pure HTML5, CSS3, and vanilla JavaScript (ES6+) only
- Single entry point: `src/index.html`
- App must load in under 3 seconds on desktop Chrome/Edge
- All JS must be in separate files: `app.js`, `validator.js`, `storage.js`
- Use CSS custom properties (variables) for all colors and spacing — theme switching will
  be added later
- Navigation between views must NOT reload the page (SPA behaviour via conditional rendering)
- Form must use a clean card-based layout with 16px padding, clear visual hierarchy,
  professional sans-serif font (Inter or system-ui fallback)
- Do NOT write any validation logic in this prompt. Structure only.

**Examples:**

Good layout:
┌─────────────────────────────────────────────┐
│ AdmitGuard [Form] [Audit] [Dashboard]│
├─────────────────────────────────────────────┤
│ │
│ ┌─────────────────────────────────────┐ │
│ │ New Candidate Entry │ │
│ │ ───────────────────────────────── │ │
│ │ Full Name [ ] │ │
│ │ Email [ ] │ │
│ │ ... │ │
│ │ [Submit →] │ │
│ └─────────────────────────────────────┘ │
│ │
└─────────────────────────────────────────────┘

text

Bad layout:
- Generic Bootstrap navbar with blue header
- Fields stacked without labels
- Submit button at top of form

**Specific Build Instructions:**

1. Create `src/index.html` as the single entry point
2. Include a fixed top header with:
   - App name "AdmitGuard" on the left
   - Three nav tabs: "New Candidate", "Audit Log", "Dashboard"
   - A theme toggle icon (☀/🌙) on the right — wire up later
3. Create three view sections (only one visible at a time via JS):
   - `#view-form` — Candidate entry form (default visible view)
   - `#view-audit` — Audit log placeholder
   - `#view-dashboard` — Dashboard placeholder
4. In `#view-form`, render all 11 fields in order:
   - Full Name (text input)
   - Email Address (text input)
   - Phone Number (text input)
   - Date of Birth (date picker)
   - Highest Qualification (dropdown — options: B.Tech, B.E., B.Sc, BCA, M.Tech, M.Sc, MCA, MBA)
   - Graduation Year (number input)
   - Percentage / CGPA (number input with a radio toggle: "Percentage %" | "CGPA /10")
   - Screening Test Score (number input, 0–100)
   - Interview Status (dropdown — options: Cleared, Waitlisted, Rejected)
   - Aadhaar Number (text input)
   - Offer Letter Sent (dropdown — options: Yes, No)
5. Below each field, add an empty `<span class="field-error"></span>` for error messages
6. Add a Submit button labelled "Save Candidate →" — disabled state to be wired in next prompt
7. CSS variables to define (in `:root`):
   ```css
   --bg-primary, --bg-secondary, --bg-card
   --text-primary, --text-secondary, --text-muted
   --accent-primary, --accent-hover
   --error-color, --warning-color, --success-color
   --border-color, --border-radius
   --spacing-sm, --spacing-md, --spacing-lg
app.js must handle view switching only — no validation yet

validator.js — create the file but leave it empty with a comment: // Validation engine — Phase 3

storage.js — create the file but leave it empty with a comment: // Storage adapter — Phase 5

Checkpoint:

All 11 fields render with labels and empty error spans

Clicking nav tabs switches views without page reload

Layout is clean, card-based, professional

No validation fires on any input