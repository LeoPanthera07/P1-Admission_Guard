# Prompt 06 — Configurable Rules Engine Verification

## R.I.C.E. Framework

**Role:**
You are a senior frontend developer and tech lead performing a config-driven architecture
audit on AdmitGuard. All validation is working. Now verify and enforce that ZERO business
rules are hardcoded in UI logic.

**Intent:**
Audit the entire codebase (`app.js`, `validator.js`) and refactor any hardcoded rule
values into `config/rules.json`. Then verify the config is the sole source of truth by
testing that changing a value in JSON updates form behaviour without touching JS files.

**Constraints:**
- ZERO hardcoded values in validator.js or app.js for:
  - Age ranges, graduation year ranges, score thresholds, CGPA thresholds
  - Enum values (qualification options, interview status options, offer letter options)
  - Regex patterns for phone, email, aadhaar
  - Rationale minimum length or keyword list
  - Maximum exception count
  - Program start date
- `config/rules.json` must be the single import — use `fetch('./config/rules.json')` or
  a module import; do NOT inline the JSON object in JS files
- After refactoring, run the config change tests below to confirm

**Audit Checklist:**
Go through every validation check and confirm it reads from config:

[ ] fullName.validations.minLength — read from config?
[ ] fullName.validations.pattern — read from config?
[ ] email.validations.pattern — read from config?
[ ] phone.validations.pattern — read from config?
[ ] dateOfBirth — age range uses config.programStartDate + config.fields.dateOfBirth.validations.ageMin/ageMax?
[ ] highestQualification.validations.enum — options array read from config?
[ ] graduationYear.validations.min/max — read from config?
[ ] percentageOrCgpa — thresholds from config.fields.percentageOrCgpa.modes.percentage.threshold / cgpa.threshold?
[ ] screeningTestScore.validations.threshold — read from config?
[ ] interviewStatus.validations.enum + blockIfValue — read from config?
[ ] aadhaarNumber.validations.pattern — read from config?
[ ] offerLetterSent.validations.crossField — read from config?
[ ] systemRules.maxSoftExceptions — read from config?
[ ] systemRules.rationaleMinLength — read from config?
[ ] softRuleKeywords — read from config?

text

**Config Change Verification Tests:**
After confirming full config-driven architecture, test these changes TEMPORARILY
(revert after verifying) to confirm JSON drives behaviour:

| Change in rules.json | Expected UI Behaviour |
|---|---|
| `dateOfBirth.validations.ageMax: 40` | Age 38 no longer triggers soft warning |
| `graduationYear.validations.min: 2010` | Graduation year 2012 no longer triggers soft warning |
| `screeningTestScore.validations.threshold: 50` | Score 45 now triggers soft warning |
| `systemRules.maxSoftExceptions: 3` | Flagged banner appears only after 4th exception |

After testing, revert all changes to production values.

**Output Required:**
Provide a refactored version of any file that had hardcoded rules, with comments showing
which config key each value now reads from. Example:

```javascript
// BEFORE (hardcoded — bad):
if (phone.length !== 10) { ... }

// AFTER (config-driven — correct):
const pattern = new RegExp(fieldConfig.validations.pattern);
if (!pattern.test(phone)) { ... }
Checkpoint:

All 15 items in audit checklist confirmed config-driven

Config change tests pass

No regressions in existing validation