# AdmitGuard 🛡️

**AI-powered admission validation form for Futurense Technologies.**

## Problem
Futurense's admission pipeline relied on unvalidated Excel/Sheets entry. Ineligible candidates were only caught at document verification — after costly counselor time, interview panel time, and candidate expectations had been set. No audit trail. No structured exception handling.

## Solution
A lightweight, client-side Single Page Application (SPA) that enforces all eligibility rules at the point of data entry, supports structured exception overrides with rationale tracking, and maintains a full audit log — with zero backend required.

## Tech Stack
- **HTML5** (semantic SPA structure)
- **CSS3** with custom properties (light/dark theme, responsive)
- **Vanilla JavaScript ES6+** (no frameworks)
- **config/rules.json** — all rules as data, not hardcoded logic
- **localStorage** — client-side persistence for submissions and theme

## Running the App
1. Clone this repo
2. Open `src/index.html` in Chrome or Edge
3. No build step required — pure HTML/CSS/JS

## Changing Rules
All eligibility rules live in `config/rules.json`. To change, for example, the age range:
```json
"dateOfBirth": {
  "validations": { "ageMin": 18, "ageMax": 40 }
}
```
No code changes needed. The validation engine reads from config at runtime.

## Eligibility Rules Summary

| # | Field | Rule | Type |
|---|-------|------|------|
| 1 | Full Name | Min 2 chars, no numbers | Strict |
| 2 | Email | Valid format, unique | Strict |
| 3 | Phone | 10-digit, starts 6–9 | Strict |
| 4 | Date of Birth | Age 18–35 at program start | Soft |
| 5 | Highest Qualification | B.Tech/B.E./B.Sc/BCA/M.Tech/M.Sc/MCA/MBA | Strict |
| 6 | Graduation Year | 2015–2025 inclusive | Soft |
| 7 | Percentage / CGPA | ≥60% or ≥6.0 CGPA | Soft |
| 8 | Screening Test Score | ≥40 / 100 | Soft |
| 9 | Interview Status | Cleared/Waitlisted/Rejected; Rejected = block | Strict |
| 10 | Aadhaar Number | Exactly 12 digits | Strict |
| 11 | Offer Letter Sent | Yes only if status Cleared/Waitlisted | Strict |
| 12 | Exception Count | >2 → flagged for manager review | System |

## Repo Structure
```
admitguard/
├── README.md
├── sprint-log.md
├── src/
│   ├── index.html      ← SPA entry point
│   ├── styles.css      ← All styling (CSS variables, light/dark, responsive)
│   ├── app.js          ← View switching, theme, score mode toggle
│   ├── validator.js    ← Validation engine (Phase 3)
│   └── storage.js      ← Storage adapter (Phase 5)
├── config/
│   └── rules.json      ← All eligibility rules as data
├── docs/
│   ├── architecture.md
│   ├── wireframe.png   (TODO)
│   └── presentation.pdf (TODO)
└── prompts/
    ├── prompt-01-foundation.md
    └── ... (8 prompts total)
```
