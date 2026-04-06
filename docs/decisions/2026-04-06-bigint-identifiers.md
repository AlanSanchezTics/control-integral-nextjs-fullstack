# ADR: Estandarización de identificadores en BIGINT

## Estado

Aceptada

## Fecha

2026-04-06

## Contexto

El sistema tenía identificadores persistentes basados en `String/cuid`, con mezcla de tipos entre PK/FK y contratos internos.
Se requiere una regla técnica transversal y estable para nuevos modelos y migraciones futuras.

## Decisión

Se adopta como regla definitiva:

- PK de entidades persistentes: `BIGINT UNSIGNED AUTO_INCREMENT`.
- FK entre entidades persistentes: `BIGINT UNSIGNED`.
- En Prisma:
  - PK: `BigInt @id @default(autoincrement()) @db.UnsignedBigInt`
  - FK: `BigInt` / `BigInt?` + `@db.UnsignedBigInt`

## Excepciones

No aplica a tokens funcionales o de seguridad que no son identificadores de entidad:

- tokens de verificación
- tokens/hash de reset de contraseña
- identificadores de sesión/JWT

Estos valores pueden permanecer en `String`.

## Compatibilidad con NextAuth

`next-auth` usa contratos de adapter con `id: string` en su API.
La persistencia interna permanece en `BIGINT` y se aplica un adapter wrapper de conversión:

- salida a NextAuth: `bigint -> string`
- entrada desde NextAuth: `string -> bigint`

## Consecuencias

- Mayor consistencia y predictibilidad para PK/FK.
- Menor riesgo de divergencia de tipos entre tablas relacionadas.
- Requiere disciplina de migración para cambios legacy `String -> BIGINT`.

## Rollback y transición

- Rollout recomendado en fases (columnas v2 + backfill + corte final).
- Si hay fallo antes del corte final: revertir aplicación y mantener columnas duales.
- Si hay fallo después del corte final: aplicar migración inversa explícita.
