# Business Rules

## Purpose

Define the business rules that govern the appointment domain for the manicure booking system, using `docs/specification.md` as the normative source.

This document captures domain behavior, constraints, states, and decision rules without implementation-level details.

## Authentication Rules

- Login identifiers are email or phone number; the value must be normalized before lookup.
- Invalid identifiers and invalid credentials must fail with stable authentication errors and without leaking account existence.
- Five consecutive failed login attempts lock the account for 15 minutes.
- A locked account remains unavailable until the lock window expires, even if the next password is correct.
- Successful login resets failed-attempt counters and records the latest login timestamp.
- Sessions are JWT-only and do not depend on the `sessions` table.
- "Remember me" extends the session lifetime to the configured long-lived value; standard sessions use the shorter default.
- Effective session validity is determined by `sessionExpiresAt` in the JWT/session contract.
- Sign out must end the active session and the frontend auth context must reflect the unauthenticated state immediately after logout.
- Self-service account creation is not available in-app; legacy signup routes redirect to login.
- Login attempts are audited for both successful and failed attempts.
- Password reset tokens are single-use and time-limited.
