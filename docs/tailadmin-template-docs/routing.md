# Routing & Navigation Guide

**Generated:** 2026-04-03T23:28:14.162Z

> Runtime note: In this repository, the template routes are hosted under `src/app/storybook/storybook/*` and exposed as `/storybook/*` for UI reference.

## Overview

This document describes the Next.js App Router structure in TailAdmin, including route groups, nested layouts, sidebar navigation configuration, error pages, and breadcrumb behavior.

## Next.js App Router Structure

### Route Files Detected

- Total `page.tsx` routes: **18**
- Total route groups: **9**

### Route Groups and Purpose

| Group | Folder | Purpose |
|-------|--------|---------|
| `admin` | `src/app/storybook/(admin)` | Admin dashboard pages with sidebar + header layout |
| `auth` | `src/app/storybook/(full-width-pages)/(auth)` | Authentication pages and auth-specific split layout |
| `chart` | `src/app/storybook/(admin)/(others-pages)/(chart)` | Chart route subgroup (bar/line) |
| `error-pages` | `src/app/storybook/(full-width-pages)/(error-pages)` | Error/status pages rendered in full-width layout |
| `forms` | `src/app/storybook/(admin)/(others-pages)/(forms)` | Form route subgroup |
| `full-width-pages` | `src/app/storybook/(full-width-pages)` | Pages without admin shell (no sidebar/header) |
| `others-pages` | `src/app/storybook/(admin)/(others-pages)` | Admin sub-group for charts, forms, tables, calendar, profile pages |
| `tables` | `src/app/storybook/(admin)/(others-pages)/(tables)` | Table route subgroup |
| `ui-elements` | `src/app/storybook/(admin)/(ui-elements)` | Admin sub-group for UI showcase pages |


### URL Routes (group folders excluded)

| URL Route | Source File | Route Groups |
|-----------|-------------|--------------|
| `/` | `src/app/storybook/(admin)/page.tsx` | `admin` |
| `/alerts` | `src/app/storybook/(admin)/(ui-elements)/alerts/page.tsx` | `admin`, `ui-elements` |
| `/avatars` | `src/app/storybook/(admin)/(ui-elements)/avatars/page.tsx` | `admin`, `ui-elements` |
| `/badge` | `src/app/storybook/(admin)/(ui-elements)/badge/page.tsx` | `admin`, `ui-elements` |
| `/bar-chart` | `src/app/storybook/(admin)/(others-pages)/(chart)/bar-chart/page.tsx` | `admin`, `others-pages`, `chart` |
| `/basic-tables` | `src/app/storybook/(admin)/(others-pages)/(tables)/basic-tables/page.tsx` | `admin`, `others-pages`, `tables` |
| `/blank` | `src/app/storybook/(admin)/(others-pages)/blank/page.tsx` | `admin`, `others-pages` |
| `/buttons` | `src/app/storybook/(admin)/(ui-elements)/buttons/page.tsx` | `admin`, `ui-elements` |
| `/calendar` | `src/app/storybook/(admin)/(others-pages)/calendar/page.tsx` | `admin`, `others-pages` |
| `/error-404` | `src/app/storybook/(full-width-pages)/(error-pages)/error-404/page.tsx` | `full-width-pages`, `error-pages` |
| `/form-elements` | `src/app/storybook/(admin)/(others-pages)/(forms)/form-elements/page.tsx` | `admin`, `others-pages`, `forms` |
| `/images` | `src/app/storybook/(admin)/(ui-elements)/images/page.tsx` | `admin`, `ui-elements` |
| `/line-chart` | `src/app/storybook/(admin)/(others-pages)/(chart)/line-chart/page.tsx` | `admin`, `others-pages`, `chart` |
| `/modals` | `src/app/storybook/(admin)/(ui-elements)/modals/page.tsx` | `admin`, `ui-elements` |
| `/profile` | `src/app/storybook/(admin)/(others-pages)/profile/page.tsx` | `admin`, `others-pages` |
| `/signin` | `src/app/storybook/(full-width-pages)/(auth)/signin/page.tsx` | `full-width-pages`, `auth` |
| `/signup` | `src/app/storybook/(full-width-pages)/(auth)/signup/page.tsx` | `full-width-pages`, `auth` |
| `/videos` | `src/app/storybook/(admin)/(ui-elements)/videos/page.tsx` | `admin`, `ui-elements` |


## Nested Layouts

The app uses multiple layout levels:

- Root layout: `src/app/layout.tsx`
- Admin layout: `src/app/storybook/(admin)/layout.tsx`
- Full width layout: `src/app/storybook/(full-width-pages)/layout.tsx`
- Auth layout: `src/app/storybook/(full-width-pages)/(auth)/layout.tsx`

### Layout chain by route

| Route | Layout Chain |
|-------|--------------|
| `/` | `src/app/layout.tsx` → `src/app/storybook/(admin)/layout.tsx` |
| `/alerts` | `src/app/layout.tsx` → `src/app/storybook/(admin)/layout.tsx` |
| `/avatars` | `src/app/layout.tsx` → `src/app/storybook/(admin)/layout.tsx` |
| `/badge` | `src/app/layout.tsx` → `src/app/storybook/(admin)/layout.tsx` |
| `/bar-chart` | `src/app/layout.tsx` → `src/app/storybook/(admin)/layout.tsx` |
| `/basic-tables` | `src/app/layout.tsx` → `src/app/storybook/(admin)/layout.tsx` |
| `/blank` | `src/app/layout.tsx` → `src/app/storybook/(admin)/layout.tsx` |
| `/buttons` | `src/app/layout.tsx` → `src/app/storybook/(admin)/layout.tsx` |
| `/calendar` | `src/app/layout.tsx` → `src/app/storybook/(admin)/layout.tsx` |
| `/error-404` | `src/app/layout.tsx` → `src/app/storybook/(full-width-pages)/layout.tsx` |
| `/form-elements` | `src/app/layout.tsx` → `src/app/storybook/(admin)/layout.tsx` |
| `/images` | `src/app/layout.tsx` → `src/app/storybook/(admin)/layout.tsx` |
| `/line-chart` | `src/app/layout.tsx` → `src/app/storybook/(admin)/layout.tsx` |
| `/modals` | `src/app/layout.tsx` → `src/app/storybook/(admin)/layout.tsx` |
| `/profile` | `src/app/layout.tsx` → `src/app/storybook/(admin)/layout.tsx` |
| `/signin` | `src/app/layout.tsx` → `src/app/storybook/(full-width-pages)/layout.tsx` → `src/app/storybook/(full-width-pages)/(auth)/layout.tsx` |
| `/signup` | `src/app/layout.tsx` → `src/app/storybook/(full-width-pages)/layout.tsx` → `src/app/storybook/(full-width-pages)/(auth)/layout.tsx` |
| `/videos` | `src/app/layout.tsx` → `src/app/storybook/(admin)/layout.tsx` |


```mermaid
graph TD
    A[src/app/layout.tsx] --> B{Route Group}
    B -->|admin| C[src/app/(admin)/layout.tsx]
    B -->|full-width-pages| D[src/app/(full-width-pages)/layout.tsx]
    D -->|auth| E[src/app/(full-width-pages)/(auth)/layout.tsx]
    C --> F[Dashboard, forms, tables, charts, calendar, profile, UI elements]
    E --> G[signin, signup]
    D --> H[error-404 and other full-width pages]
```

## AppSidebar Navigation Configuration

Sidebar navigation is defined in `src/layout/AppSidebar.tsx` via two arrays:

- `navItems` (main section)
- `othersItems` (secondary section)

### Sidebar route entries

| Section | Label | Path |
|---------|-------|------|
| `main` | Ecommerce | `/` |
| `main` | Basic Tables | `/basic-tables` |
| `main` | Blank Page | `/blank` |
| `main` | Calendar | `/calendar` |
| `main` | 404 Error | `/error-404` |
| `main` | Form Elements | `/form-elements` |
| `main` | User Profile | `/profile` |
| `others` | Alerts | `/alerts` |
| `others` | Avatar | `/avatars` |
| `others` | Badge | `/badge` |
| `others` | Bar Chart | `/bar-chart` |
| `others` | Buttons | `/buttons` |
| `others` | Images | `/images` |
| `others` | Line Chart | `/line-chart` |
| `others` | Sign In | `/signin` |
| `others` | Sign Up | `/signup` |
| `others` | Videos | `/videos` |


### Sidebar behavior summary

- Active route highlighting based on `usePathname()`
- Automatic submenu open when current route matches a submenu item
- Responsive behavior via `SidebarContext` (desktop collapse + mobile drawer)

## Error Pages

### Detected

- `/error-404` → `src/app/storybook/(full-width-pages)/(error-pages)/error-404/page.tsx`


### Requirement coverage status

- 404 page: ✅ Implemented
- 500 page: ⚠ Not detected in current codebase
- 503 page: ⚠ Not detected in current codebase
- Maintenance page: ⚠ Not detected in current codebase

## PageBreadCrumb Component

### Component source

- File: `src/components/common/PageBreadCrumb.tsx`
- API: `pageTitle: string`
- Behavior: renders a two-level breadcrumb (Home → current page title)

### Usage footprint

- Usages detected in App Router pages: **13**

- `src/app/storybook/(admin)/(others-pages)/(chart)/bar-chart/page.tsx`
- `src/app/storybook/(admin)/(others-pages)/(chart)/line-chart/page.tsx`
- `src/app/storybook/(admin)/(others-pages)/(forms)/form-elements/page.tsx`
- `src/app/storybook/(admin)/(others-pages)/(tables)/basic-tables/page.tsx`
- `src/app/storybook/(admin)/(others-pages)/blank/page.tsx`
- `src/app/storybook/(admin)/(others-pages)/calendar/page.tsx`
- `src/app/storybook/(admin)/(ui-elements)/alerts/page.tsx`
- `src/app/storybook/(admin)/(ui-elements)/avatars/page.tsx`
- `src/app/storybook/(admin)/(ui-elements)/badge/page.tsx`
- `src/app/storybook/(admin)/(ui-elements)/buttons/page.tsx`
- `src/app/storybook/(admin)/(ui-elements)/images/page.tsx`
- `src/app/storybook/(admin)/(ui-elements)/modals/page.tsx`
- `src/app/storybook/(admin)/(ui-elements)/videos/page.tsx`


### Example

```tsx
import PageBreadcrumb from "@/components/common/PageBreadCrumb";

<PageBreadcrumb pageTitle="Basic Table" />
```

## Routing Patterns

- Route groups (folders in parentheses) are used for organization without affecting URL paths
- Most admin content is served under the admin layout and still maps to clean URLs
- Auth pages are rendered in a separate nested layout with full-width structure
- Error and utility routes can live in full-width group while preserving route clarity

## Cross-References

- [Architecture Documentation](./architecture.md) - High-level layout composition
- [State Management](./state-management.md) - Sidebar context behavior
- [Component Catalog](./components.md) - Layout and navigation component references
- [Integration Patterns](./integration-patterns.md) - Creating new pages and route modules

---

*This documentation was automatically generated. Last updated: 2026-04-03T23:28:14.162Z*
