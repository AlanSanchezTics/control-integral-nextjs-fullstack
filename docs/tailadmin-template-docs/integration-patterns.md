# Integration Patterns Guide

**Generated:** 2026-04-03T23:28:14.263Z

## Overview

This guide documents practical patterns for extending TailAdmin consistently: creating UI components, adding App Router pages, integrating external libraries, adding Context providers, creating custom hooks, and following naming conventions.

## Pattern 1: Creating New UI Components

### Recommended structure

- Place reusable primitives under `src/components/ui/<feature>/`
- Place domain-focused components under category folders (`auth`, `forms`, `tables`, `ecommerce`, etc.)
- Reuse existing wrapper primitives (e.g., `ComponentCard`, `Table`, `Badge`, `Button`) when possible

### Detected category set

- `auth`
- `calendar`
- `charts`
- `common`
- `ecommerce`
- `forms`
- `header`
- `other`
- `tables`
- `ui`
- `user-profile`
- `videos`


### Canonical component template

```tsx
import React from "react";

interface ExampleWidgetProps {
  title: string;
  className?: string;
}

const ExampleWidget: React.FC<ExampleWidgetProps> = ({ title, className = "" }) => {
  return <section className={className}>{title}</section>;
};

export default ExampleWidget;
```

## Pattern 2: Creating New Pages in App Router

### Route organization pattern

- Use route groups (folders like `(admin)`, `(ui-elements)`) to organize without changing URL paths
- Keep page modules in `page.tsx` with optional `metadata: Metadata`
- Use existing layout hierarchy instead of duplicating wrappers

### Current route groups detected

- `admin`
- `auth`
- `chart`
- `error-pages`
- `forms`
- `full-width-pages`
- `others-pages`
- `tables`
- `ui-elements`


### Example page scaffold

```tsx
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Next.js Example Page | TailAdmin",
};

export default function ExamplePage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Example" />
      {/* page content */}
    </div>
  );
}
```

Reference detected route: `/basic-tables` from `src/app/(admin)/(others-pages)/(tables)/basic-tables/page.tsx`.

## Pattern 3: Integrating External Libraries

Current integration conventions observed:

1. **Dynamic import for browser-only libs** in client components
2. **Typed configuration objects** for external APIs
3. **Lifecycle-safe initialization/cleanup** for imperative libs

### Library integration snapshots

- ApexCharts dynamic import: ✅ Detected (react-apexcharts)
- jVectorMap dynamic import: ✅ Detected (@react-jvectormap/core)
- flatpickr integration: ✅ Detected
- FullCalendar integration: ✅ Detected

### External stack from package.json

- `apexcharts`: ^4.7.0
- `react-apexcharts`: ^1.8.0
- `@react-jvectormap/core`: ^1.0.4
- `flatpickr`: ^4.6.13
- `@fullcalendar/react`: ^6.1.19

## Pattern 4: Creating New Context Providers

### Context implementation checklist

1. Define a typed context contract (e.g., `type FeatureContextType = {...}`)
2. Initialize context with `createContext<... | undefined>(undefined)`
3. Export a provider component wrapping `children`
4. Export a `useFeature` hook that throws if called outside provider

### Existing context modules

| Context File | createContext | Provider | useX Hook |
|--------------|---------------|----------|-----------|
| `src/context/SidebarContext.tsx` | ✅ | ✅ | ✅ |
| `src/context/ThemeContext.tsx` | ✅ | ✅ | ✅ |


## Pattern 5: Creating New Custom Hooks

### Hook pattern

- Hook name starts with `use`
- Encapsulate reusable logic + state transitions
- Return a small, typed API surface (state + actions)

### Existing custom hooks

| Hook | File | uses useState | uses useCallback |
|------|------|---------------|------------------|
| `useGoBack` | `src/hooks/useGoBack.ts` | — | — |
| `useModal` | `src/hooks/useModal.ts` | ✅ | ✅ |


### Template

```tsx
import { useState, useCallback } from "react";

export const useExample = () => {
  const [value, setValue] = useState(false);
  const enable = useCallback(() => setValue(true), []);
  const disable = useCallback(() => setValue(false), []);
  return { value, enable, disable };
};
```

## Pattern 6: Naming Conventions

- Component file naming: `PascalCase.tsx`
- Props typing convention: `ComponentNameProps`
- Hook naming convention: `use + PascalCase`
- Context naming convention: `NameContext.tsx with useNameHook`

### Practical naming rules

1. **Components:** PascalCase file + export (e.g., `UserDropdown.tsx`)
2. **Props:** `<ComponentName>Props`
3. **Hooks:** `use<Feature>`
4. **Context files:** `<Feature>Context.tsx` exporting `<Feature>Provider` + `use<Feature>`
5. **Folders:** category-oriented and mostly kebab-case where applicable

## Cross-References

- [Architecture Documentation](./architecture.md) - layout and route hierarchy context
- [Component Catalog](./components.md) - current component inventory and dependencies
- [Routing Guide](./routing.md) - practical route group and layout chain behavior
- [State Management](./state-management.md) - existing context and hook usage
- [Configuration Guide](./configuration.md) - tooling setup for new integrations

---

*This documentation was automatically generated. Last updated: 2026-04-03T23:28:14.263Z*
