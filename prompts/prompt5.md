# `prompts/prompt-05-exceptions.md`

```markdown
# Prompt 05 — Exception Counter, Rationale Validation & Flagging

## R.I.C.E. Framework

**Role:**
You are a senior frontend developer on AdmitGuard. Soft rule warnings and exception toggles
are working. Now implement full rationale validation, exception counting, and the manager
flagging system rule.

**Intent:**
1. Validate the content of each exception rationale textarea
2. Compute a live exception counter displayed on the form
3. Implement the system rule: if exception count > 2, flag the candidate for manager review
4. Gate submission on valid rationales for all active exceptions

**Constraints:**
- Rationale validation rules must be read from `config/rules.json`:
  - `systemRules.rationaleMinLength` (30 characters)
  - `softRuleKeywords` array for keyword check
- Keyword check must be CASE-INSENSITIVE
- Exception counter must update in real time as toggles are turned on/off
- Flag logic: `exceptionCount > systemRules.maxSoftExceptions` (2) → `flaggedForManager = true`
- Flagged banner must appear ABOVE the submit button, not block it
- Submission is still ALLOWED when flagged — the flag is informational, not blocking
- Submission IS blocked if any exception toggle is ON but rationale is invalid
- Rationale error messages must be specific:
  - Too short: "Rationale must be at least 30 characters. Currently: X characters."
  - Missing keyword: `'Rationale must include one of: "approved by", "special case",
    "documentation pending", or "waiver granted".'`
  - Both issues: show both messages

**Exception State Model (implement in app.js):**
```javascript
// Per-field exception state
exceptions[fieldName] = {
  used: false,          // is the toggle ON?
  rationale: "",        // current textarea value
  rationaleValid: false // does it pass length + keyword check?
};

// System-computed
let exceptionCount = 0;           // fields where exceptions[f].used === true
let flaggedForManager = false;    // exceptionCount > maxSoftExceptions
Rationale Validation Function:

javascript
function validateRationale(text, config) {
  const minLength = config.systemRules.rationaleMinLength; // 30
  const keywords = config.softRuleKeywords;
  const errors = [];

  if (text.length < minLength) {
    errors.push(`Rationale must be at least ${minLength} characters. Currently: ${text.length} characters.`);
  }

  const hasKeyword = keywords.some(kw => text.toLowerCase().includes(kw.toLowerCase()));
  if (!hasKeyword) {
    errors.push(`Rationale must include one of: "${keywords.join('", "')}".`);
  }

  return { isValid: errors.length === 0, errors };
}
UI Requirements:

Exception counter display (near submit button):

text
Active Exceptions: 2 / 4
Flagged banner (appears when exceptionCount > 2):

text
⚠ This candidate has more than 2 exceptions.
  Entry will be flagged for manager review.
Style: amber background, warning icon, prominent but not alarming

Rationale textarea feedback (inline, below textarea):

While typing: live character count (12/30 characters)

On blur/change: show specific error if invalid

Submission Gate Logic:

javascript
// On submit click:
// 1. Re-run validateForm() for all strict checks
// 2. For each soft violation:
//    - If exceptions[field].used === false → block, scroll to field
//    - If exceptions[field].used === true AND rationaleValid === false → block, show error
// 3. Only proceed if all strict pass AND all soft violations have used+rationaleValid
Examples:

Valid rationale: "This is a special case approved by program head with documentation pending."
Invalid (too short): "Special case" → "Rationale must be at least 30 characters. Currently: 12 characters."
Invalid (no keyword): "The candidate has exceptional background and work experience in the field." → missing keyword
Valid exact boundary: exactly 30 characters containing "waiver granted" → passes

Checkpoint:

Toggle 1 exception, enter valid rationale → counter shows "Active Exceptions: 1/4"

Toggle 3 exceptions with valid rationales → flagged banner appears, submission still allowed

Toggle exception ON, enter 20-char rationale → blocked with character count error

Toggle exception ON, enter 35-char rationale without keyword → blocked with keyword error

Toggle exception ON, enter valid rationale → error clears, submission enabled
