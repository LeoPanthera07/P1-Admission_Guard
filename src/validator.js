/* ═══════════════════════════════════════════════════════
   AdmitGuard — validator.js
   // Validation engine — Phase 3

   This file will contain the complete config-driven validation
   engine that reads from config/rules.json and exposes:
     - validateField(fieldName, value, state) → { isValid, isStrictViolation, isSoftViolation, messages[] }
     - validateForm(formData, state)          → { isValid, strictErrors, softViolations }
     - initValidatorState()                  → resets internal state

   Implemented in Sprint 2 (Prompt 2 — Strict Rules, Prompt 4 — Soft Rules)
   ═══════════════════════════════════════════════════════ */

// Validation engine — Phase 3
