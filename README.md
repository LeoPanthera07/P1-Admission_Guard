# AdmitGuard – Admission Data Integrity Guard

## 1. Overview

AdmitGuard is a lightweight, client-side web application designed to enforce admission eligibility rules at the point of data entry for Futurense’s programs with IITs and IIMs. It replaces unstructured Excel/Google Sheets trackers with a rule-driven form, exception handling, and an audit trail.

## 2. Business Problem (Brief)

- Current process relies on free-form spreadsheets with no field-level validation.
- Ineligible candidates progress to late stages (interview, document verification) and are rejected only at the end.
- This wastes counselor/interviewer time, damages candidate experience, and creates compliance risk with institutional partners.

AdmitGuard acts as a gatekeeper at data entry, ensuring only compliant or explicitly approved exceptions move forward.

## 3. Solution Summary

- Single-page application (SPA), running entirely in the browser.
- Config-driven validation rules stored in `config/rules.json`.
- Real-time validation for strict and soft rules.
- Structured exception workflow with mandatory rationales.
- Local audit log of all submissions and exceptions.
- Dashboard for basic analytics and CSV/JSON export.

## 4. Tech Stack

- Front-end: HTML5, CSS3, JavaScript (ES6+)
- Configuration: JSON (`config/rules.json`)
- Storage: `localStorage` for submissions, audit log, and theme
- Tooling: Perplexity for AI-assisted code generation and prompts
- Version control: Git + GitHub

## 5. Project Structure

```text
admitguard-{your-name}/
├── README.md
├── research-notes.md
├── sprint-log.md
├── prompts/
│   ├── prompt-01-foundation.md
│   ├── prompt-02-strict.md
│   ├── prompt-03-edge-cases.md
│   ├── prompt-04-soft-rules.md
│   ├── prompt-05-exceptions.md
│   ├── prompt-06-config.md
│   ├── prompt-07-audit.md
│   └── prompt-08-polish.md
├── src/
├── config/
│   └── rules.json
├── docs/
│   ├── wireframe.png
│   ├── architecture.md
│   └── presentation.pdf
└── .gitignore
