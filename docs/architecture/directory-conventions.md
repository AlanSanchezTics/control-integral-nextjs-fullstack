# Directory Conventions

## Purpose

Define the architectural intent for directory organization and file placement in this project so new development remains predictable, scalable, and consistent for both human contributors and agents.

This document is normative for new work. It does not require a full repository restructure.

## Core principles

- Organize by responsibility first, then by feature.
- Keep route handlers and pages thin; delegate business rules to domain services.
- Keep UI composition separate from business logic and persistence concerns.
- Prefer feature-scoped modules for flow state and side effects.
- Reuse shared primitives and utilities instead of duplicating logic.
- Adopt conventions incrementally: mandatory for new code, gradual for touched legacy features.

## Directory responsibilities

### src/app/

`src/app/` owns Next.js route composition and route-level framework files.

Allowed responsibilities:
- Route entrypoints and page composition.
- Route-level metadata and navigation/redirect decisions.
- Server-side data orchestration to call domain services.

Not allowed responsibilities:
- Business rules, persistence orchestration, or cross-feature domain policies.
- Heavy client-side flow state inside route files.

### src/app/api/

`src/app/api/` owns HTTP transport for backend endpoints.

Allowed responsibilities:
- Parse request input.
- Call domain services in `src/lib/`.
- Map domain errors to stable API contracts (`errorCode`-based responses).
- Return transport-level status codes and payload shape.

Not allowed responsibilities:
- Implement business invariants directly in route handlers.
- Duplicate validation and business policies that already belong to domain/validation layers.

### src/app/`<feature>`/

Use `src/app/<feature>/` for feature routes

Convention:
- Route files compose UI and call services.
- Feature-specific UI flows are rendered through `src/components/<feature>/`.
- Route-specific loading/error boundaries stay in `src/app/<feature>/`.

### src/app/storybook/

`src/app/storybook/` is reserved for browser-accessible UI references from the base template.

Convention:
- Use this area only as visual reference.
- Do not place business flows, domain decisions, or final product contracts here.
- Final production routes must live in their own feature namespaces outside `storybook`.

### src/components/

`src/components/` owns reusable React components grouped by domain and UI intent.

Allowed responsibilities:
- Presentation and interaction rendering.
- Feature UI composition.
- Local visual state.

Not allowed responsibilities:
- Deep orchestration of domain flow if it can be extracted to hooks.
- Persistence or backend business rules.

### src/components/ui/

`src/components/ui/` owns shared UI primitives and design-system-level elements.

Convention:
- Components are business-agnostic.
- API is stable and reusable across features.
- No feature terms, endpoint calls, or domain-specific behavior.

### src/components/`<feature>`/

`src/components/<feature>/` owns feature-specific UI blocks and screens.

Convention:
- Keep rendering and event wiring in components.
- Move non-trivial state machines, async flow orchestration, and reusable side effects to `src/hooks/<feature>/`.
- Keep feature naming consistent in English for new additions.

### src/hooks/

`src/hooks/` owns reusable hooks that are cross-feature or shared.

Convention:
- `src/hooks/shared/` (or top-level `src/hooks/`) is for generic hooks used by multiple features.
- Shared hooks must remain domain-light and composable.
- Shared hooks should not import feature-local components.

### src/hooks/`<feature>`/

`src/hooks/<feature>/` owns feature-scoped hooks for flow orchestration.

Required for new code:
- Put feature async orchestration, request lifecycle state, step transitions, and reusable feature effects in hooks.
- Expose minimal APIs to components (state + actions).
- Keep side effects testable and independent from visual markup.

Migration policy:
- Existing large components may remain until touched.
- When a legacy feature is modified functionally, move added or refactored orchestration logic into `src/hooks/<feature>/`.

### src/lib/

`src/lib/` owns non-UI application logic and infrastructure boundaries.

Expected sub-responsibilities:
- Domain services/use cases (`src/lib/<domain>/`).
- Business and payload validation (`src/lib/validation/`).
- Persistence/data-access and locking (`src/lib/db/`).
- External integrations (`src/lib/calendar/`, `src/lib/whatssrc/app/`).
- Shared technical utilities (`src/lib/datetime/`, `src/lib/constants/`, `src/lib/api/`, `src/lib/i18n/`).

Rule:
- If logic must remain correct independent of React rendering, it belongs in `src/lib/`.

### prisma/

`prisma/` owns schema and migration artifacts for relational persistence.

Convention:
- `prisma/schema.prisma` defines data models and relations.
- `prisma/migrations/` stores migration history.
- Runtime datasource URL resolution is handled in `prisma.config.ts`.
- Naming policy:
  - Physical database objects (tables/columns/indexes/constraints) must be `snake_case`.
  - Prisma models/types should be `PascalCase`.
  - Use `@@map` and `@map` to keep Prisma domain naming and DB naming aligned without ambiguity.
  - PK/FK identifier rule:
    - Primary keys of entities must be `BIGINT UNSIGNED AUTO_INCREMENT`.
    - Foreign keys between entities must be `BIGINT UNSIGNED`.
    - In Prisma: use `BigInt` + `@db.UnsignedBigInt`; PKs with `@default(autoincrement())`.
  - Integration-required field names (e.g. NextAuth account token fields) may keep external contract names, but must map to `snake_case` DB objects.
  - Security/functional tokens are excluded from PK/FK rule and may remain `String`.

### Current observations

These are current-state observations, not blockers for new work:
- There is no `src/hooks/` directory yet.
- Naming is mixed Spanish/English in legacy route and feature paths.
- Some feature components currently concentrate large flow orchestration logic.

## File placement rules

- Place route composition files in `src/app/` or `src/app/<feature>/` only.
- Place endpoint handlers in `src/app/api/<feature>/route.ts` and delegate to `src/lib/`.
- Place shared visual primitives in `src/components/ui/`.
- Place feature UI in `src/components/<feature>/`.
- Place feature flow hooks in `src/hooks/<feature>/`.
- Place cross-feature hooks in `src/hooks/shared/` (or `src/hooks/` when very small).
- Place business rules, data access, and integrations in `src/lib/`.
- Place Prisma schema/migrations in `prisma/` and Prisma CLI config in `prisma.config.ts`.
- Place schemas and runtime validation in `src/lib/validation/`.
- Keep tests aligned with responsibility:
  - route/API behavior tests under `src/tests/app/`
  - domain logic tests under `src/tests/lib/`
  - end-to-end flows under `src/tests/e2e/`

## Rules for new features

For every new feature `<feature>`:
- Create route surface in `src/app/<feature>/`.
- Create feature UI modules in `src/components/<feature>/`.
- Create feature hooks in `src/hooks/<feature>/` for non-trivial orchestration.
- Create or extend domain services in `src/lib/<domain>/`.
- Add matching tests by layer (`src/tests/app`, `src/tests/lib`, `src/tests/e2e` as needed).

Naming policy for new work:
- Use English, lowercase, kebab-case for directory names and file names where applicable.
- Do not rename legacy Spanish routes unless there is an explicit migration task.

Adoption policy:
- Mandatory for new files.
- Gradual for existing code when touched by functional changes.

## Anti-patterns

- Adding business rules directly in `src/app/api/*` handlers.
- Embedding long-lived flow orchestration and async control logic directly inside large UI components when it can be a feature hook.
- Creating feature-aware components inside `src/components/ui/`.
- Duplicating validation schemas across features when they can be centralized.
- Mixing persistence calls directly into presentation components.
- Introducing broad one-shot restructuring not required by the current feature.

## Decision guide for new files

Use this decision path:

1. Does it define a route screen/layout/loading/error boundary?
- Place it in `src/app/...`.

2. Is it an HTTP endpoint handler?
- Place it in `src/app/api/...` and call `src/lib/...`.

3. Is it a reusable visual primitive with no domain behavior?
- Place it in `src/components/ui/...`.

4. Is it UI specific to one feature flow?
- Place it in `src/components/<feature>/...`.

5. Is it feature state/effects/step orchestration reusable within a feature?
- Place it in `src/hooks/<feature>/...`.

6. Is it reusable hook logic across multiple features?
- Place it in `src/hooks/shared/...` (or `src/hooks/...`).

7. Is it business logic, validation, persistence, or external integration?
- Place it in `src/lib/...`.
