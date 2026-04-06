## Documento Fuente de Verdad

Este documento define las reglas normativas del sistema.

Cualquier otro archivo (incluyendo AGENTS.md o copilot-instructions.md)
debe alinearse a esta especificación.

En caso de discrepancia, este documento prevalece.

## Referencia técnica complementaria del template

Para decisiones de implementación técnica sobre la base TailAdmin (componentes, arquitectura del template, estilos, integraciones y patrones de código), se debe consultar también:

- `docs/tailadmin-template-docs/index.md`

Esta referencia es complementaria y no reemplaza la prioridad normativa de esta especificación funcional.

# Especificación Técnica Formal

# Sistema de Reservas — Portal de Citas Manicurista

---

## 1. Objetivo

Definir formalmente las reglas funcionales, invariantes, restricciones técnicas y comportamiento del sistema de control escolar para un colegio privado.

Este documento está diseñado para servir como especificación fuente para implementación backend, frontend y validaciones por agente de IA local.

---

## 2. Contexto General

- Profesional única (no múltiples recursos).
- Fuente de verdad persistente: MariaDB (acceso vía Prisma ORM).
- Zona horaria obligatoria: America/Mexico_City.

---

## 3. Stack de tecnologías

- Next js
- Tailwind css
- Prisma ORM
- MariaDB
- Docker para generar ambiente
- i18next
- react-i18next
- next-auth (credentials provider)
- Node crypto (hash de contraseña admin con salt + pepper)
- Vitest (pruebas unitarias y de contrato)
- Playwright (smoke e2e)

## 4. Baseline técnico de foundation (sin cambio de flujo)

En la fase de preparación de stack se habilita infraestructura técnica base para:

- conexión Prisma + MariaDB
- endpoint técnico de autenticación NextAuth (`/api/auth/[...nextauth]`)
- ejecución de pruebas unitarias con Vitest
- ejecución de smoke E2E con Playwright

Esta fase no altera el flujo funcional de booking/cancel ni los pasos UX del producto.

## 5. Convención de nomenclatura persistente (obligatoria)

Reglas obligatorias para nuevas entidades/cambios de persistencia:

- Base de datos (MariaDB): nombres en `snake_case`.
  - tablas: `snake_case` plural (ej. `users`, `verification_tokens`)
  - columnas: `snake_case` (ej. `password_hash`, `created_at`, `user_id`)
  - índices y constraints: `snake_case` descriptivo
- Prisma ORM:
  - modelos y tipos: `PascalCase` (ej. `User`, `VerificationToken`)
  - el mapeo hacia objetos DB debe declararse explícitamente con `@@map` y `@map` cuando aplique.

Excepción permitida:
- En modelos requeridos por integraciones externas (ej. NextAuth `Account`) se permiten campos con contrato externo específico para compatibilidad, manteniendo siempre que el objeto físico en DB siga `snake_case`.

## 6. Internacionalización y Contrato de Mensajes

Reglas obligatorias:

1. Idiomas soportados actuales:
   - `es`
   - `en`
2. Fallback obligatorio: `es`.
3. El selector de idioma está disponible en pantalla inicial y en todo el producto con este contrato de ubicación:
   - flujo público: FAB global fijo.
   - panel admin autenticado (`/admin/*` excepto `/admin/login`): control en `appHeader` (sin FAB flotante).
4. Persistencia de idioma:
   - `cookie` (`app_lang`) para SSR y navegación.
   - `localStorage` para continuidad del cliente.
5. Si el idioma del dispositivo no está soportado, usar `es`.
6. Si una clave de traducción falta en idioma activo, usar fallback `es`.
7. Propiedad de textos UX:
   - Frontend = dueño único de mensajes visibles al usuario.
   - Backend = solo códigos estables + payload de interpolación.
8. Contrato de error API:
   - `errorCode`: identificador estable para traducción en frontend.
   - `error`: alias legacy transitorio durante migración.
9. Regla obligatoria para Admin Panel:
   - Todo texto visible en rutas/componentes admin debe resolverse con `react-i18next`.
   - Quedan prohibidos literales de UX inline en `app/admin`, `components/admin` y `hooks/admin`.
   - Nuevos textos requieren clave en `es` y `en` antes de merge.
