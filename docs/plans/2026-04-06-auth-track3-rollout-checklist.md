# Track 3 - Auth Testing & Rollout Checklist

## Objetivo
Ejecutar validación técnica del flujo de autenticación implementado y definir un checklist de rollout controlado antes de activar guards globales.

## Cobertura de pruebas en Track 3
- Unitarias (`vitest`):
  - Dominio auth (`identifier`, `lockout`, `service`, `reset-token`, `config`)
  - Validación frontend (`signInSchema`, `resetPasswordRequestSchema`, `resetPasswordConfirmSchema`)
- E2E (`playwright`):
  - `/login` carga correcta
  - redirect legado `/signin` -> `/login`
  - validación cliente en login
  - validación cliente en reset password (request)
  - transición request -> confirm con mock API
  - confirm exitoso con mock API

## Checklist pre-deploy
- [ ] `npm run test:unit` en verde.
- [ ] `npm run test:e2e` en verde en entorno de CI.
- [ ] Variables de entorno auth presentes en entorno objetivo:
  - [ ] `AUTH_SECRET`
  - [ ] `AUTH_TRUST_HOST`
  - [ ] `AUTH_PASSWORD_PEPPER`
- [ ] Migraciones aplicadas:
  - [ ] `users.phone`
  - [ ] `users.failed_login_attempts`
  - [ ] `users.locked_until`
  - [ ] `users.last_login_at`
  - [ ] tabla `login_attempts`
  - [ ] tabla `password_reset_tokens`

## Checklist de smoke post-deploy
- [ ] `/login` responde 200.
- [ ] Login exitoso con usuario válido.
- [ ] Login inválido muestra error estable.
- [ ] Intentos fallidos se reflejan en `login_attempts`.
- [ ] Flujo `/reset-password` request/confirm responde sin filtrar existencia de cuenta.
- [ ] `/signin` redirige a `/login`.

## Criterio de salida de Track 3
- [ ] Suite de pruebas del track en verde.
- [ ] Checklist de rollout acordado con producto/operación.
- [ ] Sin cambios funcionales extra fuera del alcance de pruebas/rollout.
