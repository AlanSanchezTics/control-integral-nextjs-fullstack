# TypeScript Types & Interfaces Guide

**Generated:** 2026-04-03T23:28:14.248Z

## Overview

This document summarizes how TypeScript typing is used across TailAdmin: key interfaces/types, declaration files, component props typing patterns, reusable types, and external library type extensions.

## Main TypeScript Interfaces and Types

- Total interface/type declarations detected in `src`: **41**
- Props-focused declarations (`*Props`): **30**
- Context API declarations (`*ContextType`): **2**

### Principal declarations (selected)

| Name | Kind | Location |
|------|------|----------|
| `ButtonProps` | interface | `src/components/ui/button/Button.tsx` |
| `BadgeProps` | interface | `src/components/ui/badge/Badge.tsx` |
| `ModalProps` | interface | `src/components/ui/modal/index.tsx` |
| `DropdownProps` | interface | `src/components/ui/dropdown/Dropdown.tsx` |
| `DropdownItemProps` | interface | `src/components/ui/dropdown/DropdownItem.tsx` |
| `TableProps` | interface | `src/components/ui/table/index.tsx` |
| `TableCellProps` | interface | `src/components/ui/table/index.tsx` |
| `InputProps` | interface | `src/components/form/input/InputField.tsx` |
| `SelectProps` | interface | `src/components/form/Select.tsx` |
| `MultiSelectProps` | interface | `src/components/form/MultiSelect.tsx` |
| `PaginationProps` | type | `src/components/tables/Pagination.tsx` |
| `CountryMapProps` | interface | `src/components/ecommerce/CountryMap.tsx` |
| `ThemeContextType` | type | `src/context/ThemeContext.tsx` |
| `SidebarContextType` | type | `src/context/SidebarContext.tsx` |
| `NavItem` | type | `src/layout/AppSidebar.tsx` |
| `Marker` | type | `src/components/ecommerce/CountryMap.tsx` |
| `MarkerStyle` | type | `src/components/ecommerce/CountryMap.tsx` |
| `Option` | interface | `src/components/form/MultiSelect.tsx` |
| `Option` | interface | `src/components/form/Select.tsx` |


## Declaration Files (.d.ts)

### 1) SVG declarations

- File: `src/svg.d.ts`
- Module declaration for `*.svg`: ✅ Detected
- Purpose: enables SVG imports with TS awareness and React SVG prop typing.

### 2) jsvectormap declarations

- File: `jsvectormap.d.ts`
- Module declaration for `jsvectormap`: ✅ Detected
- Purpose: provides a compatibility shim for a library without first-class local typings in this codebase.

### 3) Next.js environment declarations

- File: `next-env.d.ts`
- Route/dev type reference detected: ✅ Detected (.next/dev/types/routes.d.ts)
- Purpose: hooks the project into Next.js generated type infrastructure.

## Props Typing Patterns

Common component typing style in this codebase:

1. Dedicated `interface ...Props` per component
2. Optional props with sensible defaults in destructuring
3. Union literals for controlled variants/sizes
4. React utility types for composability (`ReactNode`, `React.FC`)

### Confirmed examples

- Button union prop variants (`size`, `variant`): ✅ Detected in `ButtonProps`
- Badge alias + union modeling (`BadgeVariant`, `BadgeColor`): ✅ Detected
- Typed context provider values: ✅ Detected (`ThemeContextType`, `SidebarContextType`)

## Common Reusable Types

- React composition types: `React.ReactNode`, `React.FC<...>`
- Context contracts: `ThemeContextType`, `SidebarContextType`
- UI prop contracts: `ButtonProps`, `BadgeProps`, `ModalProps`, `DropdownProps`
- Data/UI models: `NavItem`, `PaginationProps`, `CountryMapProps`, `Marker`

### Usage footprint indicators

- Files referencing `ReactNode`/`React.ReactNode`: **16**
- Files using `ApexOptions` (external chart typing): **5**
- Files using Next.js `Metadata` type: **18**

## External Library Type Extensions and Integrations

### Extension-style declarations

- `declare module "*.svg"` in `src/svg.d.ts`
- `declare module "jsvectormap"` in `jsvectormap.d.ts`

These patterns extend TypeScript's module understanding for libraries/assets that need local typing bridges.

### Strongly-typed third-party APIs in use

- `ApexOptions` from `apexcharts` for chart configuration typing
- `Metadata` from Next.js for page metadata typing
- Next.js generated route/environment declarations through `next-env.d.ts`

## Recommended Type-Safe Extension Pattern

When adding new typed components or integrations:

1. Define a focused `...Props` interface/type close to the component
2. Prefer union literals for constrained visual/state variants
3. Extract shared contracts into reusable aliases when used by multiple modules
4. Add/extend `.d.ts` module declarations when consuming untyped third-party modules
5. Keep external config objects strongly typed (as done with `ApexOptions`)

## Cross-References

- [Component Catalog](./components.md) - prop-level component references
- [Forms Documentation](./forms.md) - typed form prop patterns
- [Data Visualization Guide](./data-visualization.md) - `ApexOptions` usage in charts
- [Configuration Guide](./configuration.md) - TypeScript compiler settings and project config

---

*This documentation was automatically generated. Last updated: 2026-04-03T23:28:14.248Z*
