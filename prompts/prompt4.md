# Prompt 04 — Soft Rule Validation

## R.I.C.E. Framework

**Role:**
You are a senior frontend developer continuing AdmitGuard development. Strict validation
is working and hardened. Now implement soft rule validation — violations that block
submission by default but allow an exception override with a rationale.

**Intent:**
Extend `validator.js` to detect soft rule violations and update the form UI to show
amber/yellow warnings with an "Allow Exception" toggle when a soft rule is violated.
Do NOT implement the rationale validation or exception counter yet — that is Prompt 05.

**Constraints:**
- Soft rule detection must read thresholds from `config/rules.json` — no hardcoded values
- Soft violations must render visually DISTINCT from strict errors:
  - Strict errors: RED (`var(--error-color)`) — form cannot proceed
  - Soft warnings: AMBER/YELLOW (`var(--warning-color)`) — can be overridden
- When a soft rule is violated, show below the field:
  1. Amber message with the `softViolation` text from `rules.json`
  2. A toggle/checkbox labelled "Allow Exception for this field"
  3. When toggled ON: show a textarea labelled "Exception Rationale" (empty, not validated yet)
  4. When toggled OFF: hide the textarea and clear its value
- Do NOT validate the rationale content yet — that is Prompt 05
- Submit must be blocked if a soft violation exists AND the exception toggle is OFF
- If toggle is ON (even without valid rationale for now), allow the submit button to activate
  — rationale gating comes in Prompt 05
- Age calculation for `dateOfBirth` must use `programStartDate` from `config/rules.json`,
  NOT today's date
- For `percentageOrCgpa`, read which mode is selected (Percentage or CGPA) and apply
  the correct threshold from `config/rules.json`

**Soft Rules to Implement:**

| Field | Violation Condition | Threshold Source |
|---|---|---|
| Date of Birth | Age < 18 OR Age > 35 on `programStartDate` | `rules.json → fields.dateOfBirth.validations` |
| Graduation Year | Year < 2015 OR Year > 2025 | `rules.json → fields.graduationYear.validations` |
| Percentage / CGPA | Percentage < 60% OR CGPA < 6.0 | `rules.json → fields.percentageOrCgpa.modes` |
| Screening Test Score | Score < 40 | `rules.json → fields.screeningTestScore.validations.threshold` |

**Age Calculation (Important):**
```javascript
// Calculate age in years on programStartDate
function calculateAgeOnDate(dobString, referenceDateString) {
  const dob = new Date(dobString);
  const ref = new Date(referenceDateString);
  let age = ref.getFullYear() - dob.getFullYear();
  const monthDiff = ref.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && ref.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}
Examples:

Good soft warning UI:

text
Date of Birth: [ 1988-01-01 ]
⚠ This candidate does not meet the standard age criteria (18–35 years on program start date).
[ ] Allow Exception for this field
After toggle ON:

text
Date of Birth: [ 1988-01-01 ]
⚠ This candidate does not meet the standard age criteria (18–35 years on program start date).
[x] Allow Exception for this field
  Exception Rationale:
  [ textarea — empty ]
Checkpoint:

Enter DOB giving age 37 → amber warning appears, exception toggle visible

Enter graduation year 2014 → amber warning appears

Enter CGPA 5.5 in CGPA mode → amber warning appears

Enter screening score 35 → amber warning appears

Toggle exception ON → textarea appears

Toggle exception OFF → textarea disappears

Submit blocked when soft violation present and toggle OFF

No regressions on strict rules