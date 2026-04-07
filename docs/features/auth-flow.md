# Authentication Flow

## Purpose

Describe the user-facing contract for sign-in, session state, logout, and password recovery.

## Current Surface

- Public sign-in entrypoint: `/login`
- Public password recovery entrypoint: `/reset-password`
- Shared frontend session state: `AuthContext`
- Legacy compatibility routes: `/signin` and `/signup` redirect to `/login`

## Main Flow

1. The user opens `/login`.
2. The user enters email or phone number plus password.
3. The user may enable "Remember me" to request the longer session lifetime.
4. The frontend submits the credentials and waits for the auth session state to resolve.
5. On success, the app exposes the authenticated user through `AuthContext`.

## Alternate Flows

### Invalid Credentials

- The UI must present a stable authentication error.
- The response must not reveal whether the account exists.

### Locked Account

- The UI must present the account as temporarily locked.
- The user should retry after the lock window expires.

### Password Recovery

1. The user opens `/reset-password`.
2. The user requests a reset token for the account identifier.
3. The frontend calls `POST /api/auth/reset-password/request`.
3. The user confirms the token with a new password.
4. The frontend calls `POST /api/auth/reset-password/confirm`.
4. The password becomes active only after a valid reset confirmation.

### Logout

- The user signs out from an authenticated screen or action.
- The auth context must transition back to unauthenticated.

## Notes

- This document defines the product contract for the auth flow.
- Account registration is out of scope in the application UI; users are redirected to sign-in.
- Session duration is derived at login and persisted in JWT/session claims (`rememberMe`, `sessionExpiresAt`).
- Migration trace: JWT-only auth rollout completed and `sessions` table removed from persistence schema.
- Authentication UI copy is localized through `react-i18next` namespace `auth` (`es`, `en`, fallback `es`).
- Auth language preference is persisted in `app_lang` cookie and mirrored in `localStorage`.
- Hook-level validation/network/auth messages map stable error codes and schema issues to translation keys.
