# AdmitGuard Architecture

## 1. Overview

High-level architecture for the AdmitGuard single-page application, focused on config-driven validation and client-side audit logging.

## 2. Main Components

- Candidate Form
- Validation Engine
- Exception Handling Layer
- Audit Log View
- Dashboard View
- Theme (Light/Dark) Manager

## 3. Data Flow

User → Form → Validator → Exception Engine → Storage (localStorage) → Audit Log / Dashboard

## 4. Config-Driven Rules

- All field rules defined in `config/rules.json`.
- Rules categorized as strict, soft, or system.

## 5. Storage & Audit

- Submissions stored in `localStorage` with schema versioning.
- Audit Log reads from localStorage and exposes filters and details.

## 6. Future Enhancements

- Backend integration for multi-user access.
- Role-based access for managers vs operators.
