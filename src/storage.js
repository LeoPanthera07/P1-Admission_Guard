/* ═══════════════════════════════════════════════════════
   AdmitGuard — storage.js
   // Storage adapter — Phase 5

   This file will implement:
     - getSubmissions()             → parsed array from localStorage
     - saveSubmission(record)       → append + write back
     - clearSubmissions()           → with confirmation
     - isEmailUnique(email)         → check against stored submissions
     - exportJSON()                 → trigger JSON file download
     - exportCSV()                  → trigger CSV file download
     - renderAuditLog()             → populate #audit-tbody with stored submissions
     - renderDashboard()            → compute and display KPI cards

   Implemented in Sprint 3 (Prompt 7 — Audit Log)
   ═══════════════════════════════════════════════════════ */

// Storage adapter — Phase 5
