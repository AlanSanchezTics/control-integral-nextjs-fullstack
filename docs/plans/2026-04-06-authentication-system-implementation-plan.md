# Plan de Implementación: Sistema de Autenticación (`/login` + `/reset-password`)

## Resumen
- Se usará **Auth.js (Credentials + Prisma)** sobre la base existente (skill `vercel:auth`) y prácticas de App Router/route guards (`next-best-practices`).
- Login aceptará **email o teléfono + contraseña**.
- Política acordada: **bloqueo temporal 5 intentos / 15 minutos**.
- Persistencia de sesión: **24h normal**, **30 días con “Remember me”**.
- Reset de contraseña en esta fase: **flujo por email con token**; teléfono queda solo para login (sin SMS/OTP en esta iteración).

## 1) Requerimientos
- Funcionales:
  - Ruta pública `src/app/login/page.tsx`.
  - Ruta pública `src/app/reset-password/page.tsx`.
  - `SignInForm` adaptado para identificador único (email/teléfono), contraseña, remember me, errores.
  - `ResetPasswordForm` basado en patrón de `SignInForm`.
  - Cierre de sesión seguro y manejo de sesión persistente.
  - Registro de intentos de login (éxito/fallo) para monitoreo.
- Seguridad:
  - Bloqueo automático por intentos fallidos.
  - Mensajes de error no filtren si usuario existe.
  - Cookies seguras (`httpOnly`, `secure`, `sameSite`).
- Alcance explícito:
  - Sin 2FA, sin CAPTCHA, sin registro de nuevas cuentas, sin social login.
- Compatibilidad:
  - Mobile + desktop (reuso de layout/form primitives TailAdmin).

## 2) Diseño
- Arquitectura (alineado a `docs/architecture/*`):
  - Mantener handlers delgados en `src/app/api/*`.
  - Mover lógica de dominio a `src/lib/auth/*`.
  - Orquestación UI/estado en hooks/context (`src/hooks/auth/*`, `src/context/AuthContext.tsx`).
- Modelo de datos (Prisma):
  - Extender `User` con campos para login por teléfono y bloqueo (`phone`, `failed_login_attempts`, `locked_until`, `last_login_at`).
  - Nueva entidad de auditoría (`login_attempts`) con `identifier`, `user_id?`, `status`, `ip`, `user_agent`, `created_at`.
  - Tabla/token para reset de contraseña (si no se reutiliza `VerificationToken` por tipo).
- Contratos API:
  - Reusar `/api/auth/[...nextauth]` para sign-in/sign-out de sesión.
  - Añadir endpoints de reset:
    - `POST /api/auth/reset-password/request`
    - `POST /api/auth/reset-password/confirm`
  - Respuestas con `errorCode` estable.
- Guards de rutas:
  - Crear `middleware.ts` en raíz (según requerimiento), excluyendo `/login`, `/reset-password`, estáticos y `/api/auth/*`.
  - Redirigir no autenticados a `/login`.
- UI/UX:
  - `SignInForm` y `ResetPasswordForm` con validación de frontend (zod + mensajes claros).
  - Soporte responsive y estados de loading/error/success.
- Cache/SSR (`next-cache-components`):
  - Rutas de auth y contenido protegido como dinámicos; no cachear contenido sensible.
  - Evitar runtime APIs dentro de `use cache` en flujo auth.

## 3) Lista de tareas
1. Definir contrato funcional y de errores de autenticación en docs.
2. Diseñar migración Prisma y compatibilidad transitoria.
3. Implementar dominio auth (validación identificador, lockout, auditoría, reset token).
4. Implementar middleware de protección global de rutas.
5. Implementar contexto/hook de autenticación en frontend.
6. Refactor `SignInForm` y crear `ResetPasswordForm`.
7. Crear páginas `app/login` y `app/reset-password`.
8. Integrar sign-out seguro y manejo de sesión remember me.
9. Implementar pruebas unitarias, integración y e2e.
10. Validar contrato flujo/UI/API + rollout + cleanup.

## 4) Desarrollo
- Track A (backend y migraciones):
  - Migración Prisma para campos de usuario + tabla de intentos + tabla/token de reset.
  - Lógica en `src/lib/auth/` para:
    - resolver identificador email/teléfono,
    - contar fallos,
    - bloquear/desbloquear por ventana temporal,
    - registrar intentos,
    - emitir/validar token de reset y actualizar `passwordHash`.
  - Ajustar `src/lib/auth/config.ts` (authorize + callbacks/session maxAge según remember me).
- Track B (UI/UX flow):
  - `src/components/auth/SignInForm.tsx`:
    - campo `identifier`,
    - validación cliente,
    - remember me,
    - manejo de errores por `errorCode`,
    - link a `/reset-password`.
  - Nuevo `src/components/auth/ResetPasswordForm.tsx` con dos pasos:
    - solicitar reset,
    - confirmar token + nueva contraseña.
  - Páginas nuevas:
    - `src/app/login/page.tsx`
    - `src/app/reset-password/page.tsx`
- Track C (pruebas y rollout):
  - Unit tests: validaciones, lockout, reset token, sesión remember me.
  - Integration tests: endpoints reset + authorize con email/teléfono + lockout.
  - E2E Playwright: login ok/fail, cuenta bloqueada, reset end-to-end, logout.
  - Rollout gradual:
    - mantener `/signin` temporalmente con redirect 301/307 a `/login`,
    - retirar redirect legado tras validación.
- Track D (cleanup técnico):
  - Eliminar rutas/links legacy de auth en storybook productivo.
  - Consolidar utilidades duplicadas de validación auth.
  - Actualizar smoke tests apuntando a `/login`.

## 5) Pruebas
- Unitarias:
  - parser de identificador (email/teléfono),
  - política de lockout 5/15,
  - cálculo de expiración de sesión (24h vs 30d),
  - hashing/verify/reset.
- Integración:
  - `authorize` con email correcto, teléfono correcto, credenciales inválidas, cuenta bloqueada.
  - request/confirm reset con token válido, expirado y reutilizado.
- E2E:
  - `/login` render responsive + errores visibles.
  - login exitoso redirige a ruta protegida.
  - N intentos fallidos bloquean.
  - reset por email simulado y cambio efectivo de contraseña.
  - logout invalida sesión y bloquea acceso a rutas protegidas.

## 6) Despliegue
- Pre-deploy:
  - aplicar migraciones y verificar backfill de `phone` nulo permitido.
  - validar variables de entorno (`AUTH_SECRET`, `AUTH_PASSWORD_PEPPER`, reset-token secret, TTLs).
- Deploy:
  - backend/migraciones primero, luego UI.
  - monitorear volumen de `login_attempts`, errores 401/423/429, tasa de resets.
- Post-deploy:
  - revisar métricas de bloqueo falso positivo.
  - ejecutar checklist de rollback (desactivar lockout estricto si hay incidente).

## Documentation Impact
- **Sí**, requiere actualización documental antes y durante implementación.
- Actualizar `docs/specification.md`:
  - Flujo de Login (`/login`), Reset Password (`/reset-password`), sesión persistente, lockout, logout, auditoría de intentos.
- Actualizar `docs/architecture/business-rules.md`:
  - reglas de bloqueo, desbloqueo temporal, validación de identificador, política de sesión.
- Crear `docs/features/auth-flow.md`:
  - flujo principal, alternos, errores, recuperación.
- Actualizar `docs/architecture/api.md`:
  - contratos de endpoints reset + códigos de error.
- Ambigüedad resuelta:
  - reset por email en esta fase; SMS/OTP fuera de alcance.

## Cambios de interfaz/contrato (explícitos)
- Nuevas rutas UI públicas:
  - `/login`
  - `/reset-password`
- Endpoints nuevos:
  - `POST /api/auth/reset-password/request`
  - `POST /api/auth/reset-password/confirm`
- Dominio de usuario:
  - soporte de `phone` como identificador alterno.
- Error codes nuevos sugeridos:
  - `AUTH_INVALID_CREDENTIALS`
  - `AUTH_ACCOUNT_LOCKED`
  - `AUTH_RESET_TOKEN_INVALID`
  - `AUTH_RESET_TOKEN_EXPIRED`

## Assumptions
- Se mantiene `middleware.ts` (aunque Next.js 16 promueve `proxy.ts`) por requerimiento explícito.
- “Recordar información en dispositivos confiables” se implementa como sesión prolongada segura (no autofill de contraseña en texto plano).
- No se integra proveedor externo de correo/SMS en este plan; se define contrato y adapter para email de reset con implementación local/mock inicial.

## Flow Contract Check
- UI steps updated: **Yes**
- API contract updated: **Yes**
- Validation rules updated: **Yes**
- Acceptance criteria updated: **Yes**
- docs/specification.md aligned: **Yes**

## Migration Compatibility Check
- Schema changes required: **Yes**
- Data backfill required: **No** (campos nuevos compatibles con null/default)
- Legacy compatibility required: **Yes** (`/signin` → `/login` temporal)
- Rollback strategy defined: **Yes**
- Cleanup phase defined: **Yes**
- Integrity protections defined: **Yes**
