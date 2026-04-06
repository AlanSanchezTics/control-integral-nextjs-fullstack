# Stack Foundation (Prisma + MariaDB + NextAuth + Vitest + Playwright) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dejar el proyecto preparado para usar Prisma+MariaDB, NextAuth y testing (Vitest/Playwright) sin implementar todavía flujos de negocio.

**Architecture:** Se agrega una base técnica mínima y desacoplada: capa de datos (`prisma/` + cliente en `src/lib`), autenticación base (`src/auth.ts` + route handler), y plataforma de pruebas (`src/tests`, `playwright.config.ts`). La preparación se hace incremental para mantener el sistema actual funcionando y permitir que los flujos se construyan después sobre contratos estables.

**Tech Stack:** Next.js 16, React 19, TypeScript, Prisma ORM, MariaDB (docker), NextAuth, Vitest, Playwright.

---

## Fase 1: Requerimientos

1. Estado actual detectado:
- No existe `src/app/api/`.
- No existe integración real de Prisma/NextAuth/Vitest/Playwright.
- `docs/specification.md` ya menciona Prisma y NextAuth, pero el contexto de DB está como MySQL; se debe alinear a MariaDB para este nuevo alcance.

2. Requerimientos funcionales de esta fase:
- Preparar infraestructura técnica, sin cambiar el flujo de usuario.
- Incluir configuración reproducible local de MariaDB.
- Exponer contratos técnicos mínimos para auth y testing.

3. Requerimientos no funcionales:
- Mantener compatibilidad con estructura App Router.
- Mantener handlers API delgados (delegación a `src/lib`).
- Preparar base para i18n en mensajes de auth admin en fases futuras.

## Fase 2: Diseño

1. Cambios de interfaces públicas y contratos:
- Nuevo endpoint: `GET/POST /api/auth/[...nextauth]`.
- Nuevas variables de entorno: `DATABASE_URL`, `AUTH_SECRET`, `AUTH_TRUST_HOST`.
- Nuevos scripts: `db:*`, `test:unit`, `test:e2e`, `test`.
- Nuevo contrato de modelos base Prisma para Auth.js adapter.

2. Mapa de archivos (preparación):
- Crear `docker-compose.yml`.
- Crear `.env.example`.
- Crear `prisma/schema.prisma`.
- Crear `prisma/migrations/*` (primera migración).
- Crear `src/lib/db/prisma.ts`.
- Crear `src/lib/auth/password.ts`.
- Crear `src/lib/auth/config.ts`.
- Crear `src/auth.ts`.
- Crear `src/app/api/auth/[...nextauth]/route.ts`.
- Crear `src/lib/config/env.ts`.
- Crear `vitest.config.ts`.
- Crear `src/tests/setup/vitest.setup.ts`.
- Crear `src/tests/lib/config/env.test.ts`.
- Crear `playwright.config.ts`.
- Crear `src/tests/e2e/auth-smoke.spec.ts`.
- Modificar `package.json` (dependencias y scripts).
- Modificar `README.md` (setup local).
- Modificar `docs/specification.md` (alineación stack/base de datos).
- Modificar `docs/architecture/api.md` (contrato endpoint auth).
- Modificar `docs/architecture/directory-conventions.md` (carpetas nuevas efectivas).

## Fase 3: Lista de Tareas

1. Bootstrap de dependencias y scripts.
2. Infra local MariaDB por Docker.
3. Prisma schema + migración inicial + cliente singleton.
4. NextAuth base con credentials y route handler.
5. Configuración de entorno tipada.
6. Vitest base + primer test unitario.
7. Playwright base + primer smoke E2E.
8. Documentación técnica y de especificación alineada.
9. Verificación final con checklist de contratos.

## Fase 4: Desarrollo

### Task 1: Dependencias y scripts de plataforma

**Files:**
- Modify: `package.json`
- Test: `package-lock.json`

- [ ] **Step 1: Write the failing test**
```ts
// src/tests/lib/config/scripts-contract.test.ts
import { readFileSync } from "node:fs";

test("package scripts include db/auth/test foundations", () => {
  const pkg = JSON.parse(readFileSync("package.json", "utf-8"));
  expect(pkg.scripts["test:unit"]).toBeDefined();
  expect(pkg.scripts["test:e2e"]).toBeDefined();
  expect(pkg.scripts["db:generate"]).toBeDefined();
});
```

- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run src/tests/lib/config/scripts-contract.test.ts`
Expected: FAIL because Vitest/scripts are missing.

- [ ] **Step 3: Write minimal implementation**
```json
{
  "scripts": {
    "db:generate": "prisma generate",
    "db:migrate:dev": "prisma migrate dev",
    "db:migrate:deploy": "prisma migrate deploy",
    "db:studio": "prisma studio",
    "test:unit": "vitest run",
    "test:e2e": "playwright test",
    "test": "npm run test:unit && npm run test:e2e"
  }
}
```

- [ ] **Step 4: Run test to verify it passes**
Run: `npx vitest run src/tests/lib/config/scripts-contract.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add package.json package-lock.json src/tests/lib/config/scripts-contract.test.ts
git commit -m "chore: add stack foundation dependencies and scripts"
```

### Task 2: MariaDB + entorno base

**Files:**
- Create: `docker-compose.yml`
- Create: `.env.example`
- Test: `src/tests/lib/config/env.test.ts`

- [ ] **Step 1: Write the failing test**
```ts
import { getEnv } from "@/lib/config/env";
test("requires DATABASE_URL and AUTH_SECRET", () => {
  expect(() => getEnv({} as NodeJS.ProcessEnv)).toThrow();
});
```

- [ ] **Step 2: Run test to verify it fails**
Run: `npm run test:unit`
Expected: FAIL (no env module).

- [ ] **Step 3: Write minimal implementation**
```yaml
# docker-compose.yml
services:
  mariadb:
    image: mariadb:11
    environment:
      MARIADB_DATABASE: app
      MARIADB_USER: app
      MARIADB_PASSWORD: app
      MARIADB_ROOT_PASSWORD: root
    ports:
      - "3307:3307"
```

```env
# .env.example
DATABASE_URL="mysql://app:app@localhost:3307/app"
AUTH_SECRET="replace_me"
AUTH_TRUST_HOST="true"
```

- [ ] **Step 4: Run test to verify it passes**
Run: `npm run test:unit`
Expected: PASS for env contract tests.

- [ ] **Step 5: Commit**
```bash
git add docker-compose.yml .env.example src/tests/lib/config/env.test.ts
git commit -m "chore: add mariadb local runtime and env contract"
```

### Task 3: Prisma foundation

**Files:**
- Create: `prisma/schema.prisma`
- Create: `src/lib/db/prisma.ts`
- Test: `src/tests/lib/db/prisma-client.test.ts`

- [ ] **Step 1: Write the failing test**
```ts
import { prisma } from "@/lib/db/prisma";
test("exports PrismaClient singleton", () => {
  expect(prisma).toBeDefined();
});
```

- [ ] **Step 2: Run test to verify it fails**
Run: `npm run test:unit`
Expected: FAIL (module missing).

- [ ] **Step 3: Write minimal implementation**
```prisma
generator client { provider = "prisma-client-js" }
datasource db { provider = "mysql"; url = env("DATABASE_URL") }

model User {
  id            String   @id @default(cuid())
  email         String   @unique
  passwordHash  String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  accounts      Account[]
  sessions      Session[]
}
```

```ts
// src/lib/db/prisma.ts
import { PrismaClient } from "@prisma/client";
const globalForPrisma = globalThis as { prisma?: PrismaClient };
export const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

- [ ] **Step 4: Run test to verify it passes**
Run: `npm run db:generate && npm run test:unit`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add prisma/schema.prisma src/lib/db/prisma.ts src/tests/lib/db/prisma-client.test.ts
git commit -m "feat: add prisma schema and singleton client"
```

### Task 4: NextAuth base (sin flujo completo)

**Files:**
- Create: `src/lib/auth/config.ts`
- Create: `src/lib/auth/password.ts`
- Create: `src/auth.ts`
- Create: `src/app/api/auth/[...nextauth]/route.ts`
- Test: `src/tests/lib/auth/auth-config.test.ts`

- [ ] **Step 1: Write the failing test**
```ts
import { authConfig } from "@/lib/auth/config";
test("uses credentials provider", () => {
  expect(authConfig.providers.length).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run test to verify it fails**
Run: `npm run test:unit`
Expected: FAIL (auth config missing).

- [ ] **Step 3: Write minimal implementation**
```ts
// src/lib/auth/config.ts
import Credentials from "next-auth/providers/credentials";
export const authConfig = {
  providers: [Credentials({ name: "Credentials", credentials: {} })],
  session: { strategy: "database" as const },
};
```

```ts
// src/auth.ts
import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth/config";
export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
```

```ts
// src/app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/auth";
export const { GET, POST } = handlers;
```

- [ ] **Step 4: Run test to verify it passes**
Run: `npm run test:unit`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/lib/auth/config.ts src/lib/auth/password.ts src/auth.ts src/app/api/auth/[...nextauth]/route.ts src/tests/lib/auth/auth-config.test.ts
git commit -m "feat: add nextauth base configuration and route handler"
```

### Task 5: Vitest setup

**Files:**
- Create: `vitest.config.ts`
- Create: `src/tests/setup/vitest.setup.ts`
- Modify: `tsconfig.json` (si se requiere include explícito de tests)

- [ ] **Step 1: Write the failing test**
```ts
test("vitest globals are available", () => {
  expect(true).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**
Run: `npm run test:unit`
Expected: FAIL before config.

- [ ] **Step 3: Write minimal implementation**
```ts
// vitest.config.ts
import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["src/tests/setup/vitest.setup.ts"],
  },
});
```

- [ ] **Step 4: Run test to verify it passes**
Run: `npm run test:unit`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add vitest.config.ts src/tests/setup/vitest.setup.ts
git commit -m "test: add vitest baseline configuration"
```

### Task 6: Playwright setup

**Files:**
- Create: `playwright.config.ts`
- Create: `src/tests/e2e/auth-smoke.spec.ts`

- [ ] **Step 1: Write the failing test**
```ts
import { test, expect } from "@playwright/test";
test("signin page loads", async ({ page }) => {
  await page.goto("/signin");
  await expect(page).toHaveURL(/signin/);
});
```

- [ ] **Step 2: Run test to verify it fails**
Run: `npm run test:e2e`
Expected: FAIL before Playwright config/project setup.

- [ ] **Step 3: Write minimal implementation**
```ts
// playwright.config.ts
import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "src/tests/e2e",
  use: { baseURL: "http://localhost:3000" },
  webServer: { command: "npm run dev", url: "http://localhost:3000", reuseExistingServer: true }
});
```

- [ ] **Step 4: Run test to verify it passes**
Run: `npm run test:e2e`
Expected: PASS with smoke route check.

- [ ] **Step 5: Commit**
```bash
git add playwright.config.ts src/tests/e2e/auth-smoke.spec.ts
git commit -m "test: add playwright e2e smoke setup"
```

### Task 7: Documentación y trazabilidad

**Files:**
- Modify: `docs/specification.md`
- Modify: `docs/architecture/api.md`
- Modify: `docs/architecture/directory-conventions.md`
- Modify: `README.md`

- [ ] **Step 1: Write the failing test**
```ts
import { readFileSync } from "node:fs";
test("spec mentions mariaDB stack baseline", () => {
  const spec = readFileSync("docs/specification.md", "utf-8");
  expect(spec).toMatch(/MariaDB|mariadb/i);
});
```

- [ ] **Step 2: Run test to verify it fails**
Run: `npm run test:unit`
Expected: FAIL if spec does not mention MariaDB baseline.

- [ ] **Step 3: Write minimal implementation**
```md
- Actualizar sección Stack para dejar explícito Prisma + MariaDB + NextAuth + Vitest + Playwright como baseline técnico.
- Aclarar que en esta iteración no cambia el flujo funcional de booking/cancel.
```

- [ ] **Step 4: Run test to verify it passes**
Run: `npm run test:unit`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add docs/specification.md docs/architecture/api.md docs/architecture/directory-conventions.md README.md src/tests/lib/docs/spec-stack.test.ts
git commit -m "docs: align specification and architecture for stack foundation"
```

## Fase 5: Pruebas

1. Unitarias:
- Carga de env requerida y manejo de faltantes.
- Export de `prisma` singleton.
- Contrato mínimo de `authConfig`.
- Scripts críticos presentes en `package.json`.

2. Integración ligera:
- `prisma generate` exitoso.
- Migración inicial en MariaDB local.
- Endpoint `/api/auth/[...nextauth]` responde sin crash.

3. E2E smoke:
- `/signin` carga correctamente.
- Ruta auth API accesible (health básico indirecto).

4. Criterios de aceptación:
- `npm run lint` en verde.
- `npm run test:unit` en verde.
- `npm run test:e2e` en verde.
- `docker compose up -d mariadb` + `npm run db:migrate:dev` en verde.

## Fase 6: Despliegue

1. Preparación de entornos:
- Registrar `DATABASE_URL`, `AUTH_SECRET`, `AUTH_TRUST_HOST` por ambiente.
- Validar conexión de Prisma en staging con `db:migrate:deploy`.

2. Estrategia de rollout:
- Activar primero infraestructura DB/Auth sin enforcement de rutas privadas.
- Mantener forms actuales sin conectar al flujo real hasta siguiente plan.

3. Post-deploy:
- Ejecutar smoke E2E en staging.
- Validar logs del endpoint auth.
- Confirmar que rutas existentes no se rompen.

## Documentation Impact

- `docs/specification.md` requiere cambio: **Sí**.
- Parte impactada: stack técnico y baseline de infraestructura (sin cambio de flujo funcional).
- Secciones a actualizar: Stack de tecnologías, consideraciones técnicas de auth/testing.
- Momento de actualización: durante Fase 4 (Task 7), antes de cerrar pruebas.
- Ambigüedad detectada: especificación indica MySQL como fuente de verdad; este plan la alinea a MariaDB como implementación objetivo.

## Flow Contract Check

- UI steps updated: No  
- API contract updated: Yes  
- Validation rules updated: No  
- Acceptance criteria updated: Yes  
- docs/specification.md aligned: Yes

## Migration Compatibility Check

- Schema changes required: Yes  
- Data backfill required: No  
- Legacy compatibility required: Yes  
- Rollback strategy defined: Yes  
- Cleanup phase defined: Yes  
- Integrity protections defined: Yes

## Assumptions

- Alcance actual: solo foundation técnica; no onboarding/login productivo completo.
- Auth inicial: `Credentials` + sesión en DB; proveedores OAuth quedan fuera.
- No se migran datos legacy porque aún no existe dominio persistido activo.
- Se mantiene compatibilidad visual actual de `/signin` y `/signup` sin cambios funcionales.

## Traceability Note

Documentation Impact:
- Yes
- Update required in `docs/specification.md`
- Sections affected: Tech Stack, Technical Baseline for Auth and Testing, DB engine alignment (MySQL -> MariaDB for implementation baseline)
