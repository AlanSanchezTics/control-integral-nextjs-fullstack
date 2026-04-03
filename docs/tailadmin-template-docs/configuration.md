# Build & Configuration Guide

**Generated:** 2026-04-03T23:28:14.262Z

## Overview

This document describes project configuration for Next.js, TypeScript, ESLint, PostCSS, Prettier, npm scripts, and package overrides used in TailAdmin.

## Next.js Configuration (next.config.ts)

- File: `next.config.ts`
- `output: "standalone"`: ✅ Enabled
- `poweredByHeader: false`: ✅ Enabled
- `allowedDevOrigins` present: ✅ Yes
- SVG handling via webpack `@svgr/webpack` rule: ✅ Configured
- Turbopack SVG loader rule: ✅ Configured

### Notes

- The project supports SVG as React components through both webpack and Turbopack configuration paths.
- Standalone output improves container/deployment portability.

## TypeScript Configuration (tsconfig.json)

- File: `tsconfig.json`
- Strict mode: ✅ Enabled
- No emit: ✅ Enabled
- Module resolution `bundler`: ✅ Enabled
- Path alias `@/* -> src/*`: ✅ Configured

### Key compiler options summary

- Target: `ES2017`
- JSX: `react-jsx`
- Incremental build info: enabled
- Next.js TypeScript plugin: enabled

## ESLint Configuration

- Flat config file `eslint.config.mjs`: ✅ Present
- Legacy config `.eslintrc.json`: ✅ Present
- Next Core Web Vitals preset: ✅ Included
- Next TypeScript preset: ✅ Included
- Custom global ignores configured: ✅ Yes

### Project-specific linting behavior

- Includes restrictions against inline literal UI text in specific frontend folders.
- Encourages localization-ready patterns by enforcing text source conventions.

## PostCSS Configuration

- File: `postcss.config.js`
- `@tailwindcss/postcss` plugin: ✅ Configured

## Prettier Configuration

- File: `prettier.config.js`
- `prettier-plugin-tailwindcss`: ✅ Configured

## NPM Scripts

| Script | Command |
|--------|---------|
| `build` | `next build` |
| `dev` | `next dev` |
| `generate:docs` | `tsx scripts/generate-docs.ts` |
| `lint` | `eslint .` |
| `start` | `next start` |


### Required workflow scripts status

- `dev`: ✅ Present
- `build`: ✅ Present
- `start`: ✅ Present
- `lint`: ✅ Present
- `generate:docs`: ✅ Present

## package.json Overrides

The project uses overrides to align transitive compatibility constraints:

| Package | Override Purpose |
|---------|------------------|
| `@react-jvectormap/core` | Pins compatibility for: react, react-dom |
| `@react-jvectormap/world` | Pins compatibility for: react, react-dom |


### Override rationale (detected)

- `@react-jvectormap/core` and `@react-jvectormap/world` are pinned with React/ReactDOM compatibility ranges.
- This prevents peer-resolution conflicts with React 19 in local dependency graphs.

## Configuration-Related Dependencies

- `next`: ^16.1.6
- `typescript` (devDependency): ^5.9.3
- `eslint` (devDependency): ^9.39.1
- `postcss` (devDependency): ^8.5.6
- `tailwindcss`: ^4.1.17

## Cross-References

- [Architecture Documentation](./architecture.md) - runtime architecture context
- [TypeScript Guide](./typescript.md) - type system and declaration strategy
- [Styling Guide](./styling.md) - Tailwind runtime usage and design tokens
- [Integration Patterns](./integration-patterns.md) - conventions when adding new tools/configs

---

*This documentation was automatically generated. Last updated: 2026-04-03T23:28:14.262Z*
