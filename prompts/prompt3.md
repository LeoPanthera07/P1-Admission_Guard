# Prompt 03 — Edge Case Verification & Hardening

## R.I.C.E. Framework

**Role:**
You are a senior QA-aware frontend developer. Strict validation has been implemented for
AdmitGuard. Now test the implementation against boundary values and fix any failures.

**Intent:**
Run the following explicit edge-case scenarios against the current validation implementation.
For each scenario, describe what SHOULD happen, test whether it does, and fix any case
where behaviour does not match the expected outcome.

**Constraints:**
- Do not change rule definitions — fix the validator logic only
- All fixes must still read from `config/rules.json` — no hardcoding
- After each fix, re-test the scenario and confirm it passes
- Document each fix in `prompts/prompt-03-edge-cases.md` under a "Fixes Applied" section

**Edge Cases to Test and Verify:**

### Group 1: Full Name
| Input | Expected Behaviour |
|---|---|
| `""` (empty) | Error: "Full name is required." |
| `"A"` (1 char) | Error: "Full name must be at least 2 characters." |
| `"Jo"` (2 chars) | Valid — no error |
| `"John123"` | Error: "Full name cannot contain numbers or special characters." |
| `"John O'Brien"` | Error: pattern blocks apostrophe — confirm expected |
| `"  "` (spaces only) | Treat as empty — error required |

### Group 2: Phone Number
| Input | Expected Behaviour |
|---|---|
| `"1234567890"` | Error: does not start with 6–9 |
| `"98765"` | Error: too short |
| `"9876543210"` | Valid |
| `"987654321a"` | Error: contains non-digit |
| `"0987654321"` | Error: starts with 0 |
| `"+919876543210"` | Error: contains non-digit characters |

### Group 3: Aadhaar Number
| Input | Expected Behaviour |
|---|---|
| `"12345678901"` (11 digits) | Error: not 12 digits |
| `"1234567890123"` (13 digits) | Error: not 12 digits |
| `"12345678901a"` | Error: contains non-digit |
| `"123456789012"` (12 digits) | Valid |

### Group 4: Interview Status + Offer Letter Cross-Field
| Interview Status | Offer Letter | Expected Behaviour |
|---|---|---|
| Rejected | Yes | Blocked: "Offer letter cannot be sent to rejected candidates." |
| Rejected | No | Blocked: submission blocked entirely due to Rejected status |
| Waitlisted | Yes | Valid |
| Cleared | Yes | Valid |
| Cleared | No | Valid |
| (empty) | Yes | Error: Interview Status required |

### Group 5: Email Uniqueness
| Scenario | Expected Behaviour |
|---|---|
| Submit `test@example.com` successfully | Saves to localStorage |
| Submit again with `test@example.com` | Error: "This email address has already been submitted." |
| Submit with `Test@Example.com` (case variant) | Should also be blocked (case-insensitive check) |

**Fixes Applied Section:**
_(To be filled as fixes are made)_

| Issue Found | Root Cause | Fix Applied |
|---|---|---|
| | | |

**Checkpoint:**
All scenarios above pass.