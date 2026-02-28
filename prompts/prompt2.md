# Prompt 02 — Strict Rule Validation

## R.I.C.E. Framework

**Role:**
You are a senior frontend developer continuing work on AdmitGuard — an internal admissions
validation tool. The SPA shell and all 11 fields are already built. Now we add strict rule
enforcement.

**Intent:**
Implement the validation engine in `validator.js` that reads rules from `config/rules.json`
and enforces all STRICT rules. Strict rules block submission entirely — no exceptions or
overrides are possible.

**Constraints:**
- ALL validation logic must read from `config/rules.json` — no hardcoded rules in `app.js`
- Implement `validateField(fieldName, value, state)` in `validator.js`
  returning `{ isValid, isStrictViolation, isSoftViolation, messages[] }`
- Implement `validateForm(formState)` returning `{ isFormValid, strictViolations[], softViolations[] }`
- Validation must fire on BOTH `onChange` (as user types) AND final check on form submit
- Error messages must be EXACTLY as specified in `rules.json` — no technical jargon
- Strict errors display in RED (`var(--error-color)`) inline below each field
- Submit button stays DISABLED as long as any strict violation exists
- Show a top-level red banner summarising all strict errors when submit is attempted
- Cross-field validations must also be handled:
  - `offerLetterSent = "Yes"` when `interviewStatus = "Rejected"` → strict block
  - `interviewStatus = "Rejected"` → block entire submission with dedicated red banner
- Do NOT add soft rule handling yet — that is Prompt 04
- Do NOT hardcode any field names or patterns in validator.js — read everything from config

**Examples:**

Good error message: `"Phone must be a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9."`
Bad error message: `"regex failed"` or `"pattern mismatch"`

Good: Submit button is disabled, red inline error below phone field
Bad: Alert popup with error text

**Strict Rules to Enforce (read from `rules.json`):**

| Field | Rule |
|---|---|
| Full Name | Required, min 2 chars, alphabet + spaces only |
| Email | Required, valid email format, unique (checked against localStorage submissions) |
| Phone | Required, 10 digits, starts with 6/7/8/9 |
| Highest Qualification | Required, must be in allowed enum |
| Interview Status | Required, must be in enum; if "Rejected" — block submission |
| Aadhaar Number | Required, exactly 12 digits, numeric only |
| Offer Letter Sent | Required; "Yes" only if Interview Status is "Cleared" or "Waitlisted" |

**Implementation Steps:**

1. In `app.js`, load `config/rules.json` (fetch or inline import)
2. In `validator.js`, implement:
   ```javascript
   function validateField(fieldName, value, formState, config, existingSubmissions) {
     // Read field config
     // Run required, pattern, minLength, maxLength, enum, crossField checks
     // Return { isValid, isStrictViolation, isSoftViolation, messages[] }
   }

   function validateForm(formState, config, existingSubmissions) {
     // Run validateField for all fields
     // Return { isFormValid, strictViolations[], softViolations[] }
   }
Attach validateField to onChange and onBlur for each field

On each keystroke, update the field's <span class="field-error"> with the message

On submit click:

Run validateForm

If any strict violation: prevent save, show top-level banner, do NOT clear form

Email uniqueness check: call getSubmissions() from storage.js and compare email values

Checkpoint:

Enter "A" in Full Name → error appears immediately

Enter "1234567890" in Phone → error appears

Select "Rejected" in Interview Status → red banner appears, submit blocked

Set Offer Letter to "Yes" with Interview Status "Rejected" → blocked with message

Enter valid data in all fields → submit button becomes enabled