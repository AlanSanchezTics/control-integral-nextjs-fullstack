# Tables & Pagination Guide

**Generated:** 2026-04-03T23:28:14.206Z

## Overview

This document covers table-related UI patterns in TailAdmin, including `BasicTableOne`, the reusable `Pagination` component, sorting/filtering conventions, `RecentOrders` as a richer table example, and responsive table handling.

## Table Components Inventory

| Component | Path | Purpose |
|-----------|------|---------|
| BasicTableOne | `src/components/tables/BasicTableOne.tsx` | Primary example of a responsive data table with avatar cells and status badges |
| Pagination | `src/components/tables/Pagination.tsx` | Reusable pagination control with prev/next and windowed page numbers |


### Table primitive layer

- File: `src/components/ui/table/index.tsx`
- Typed primitives available: ✅ `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableCell` with typed props
- Pattern: render composition through semantic table tags and optional `className` overrides

## BasicTableOne

- File: `src/components/tables/BasicTableOne.tsx`
- Data shape: local `Order` interface + seeded `tableData` array
- Rendering style:
  - Avatar + role in first column
  - Team avatar stack in dedicated column
  - Status rendered through `Badge` color mapping

### Usage example in App Router

- Source page: `src/app/storybook/(admin)/(others-pages)/(tables)/basic-tables/page.tsx`
- Embedded usage detected: ✅ Yes

```tsx
import BasicTableOne from "@/components/tables/BasicTableOne";

<ComponentCard title="Basic Table 1">
  <BasicTableOne />
</ComponentCard>
```

## Pagination Component

- File: `src/components/tables/Pagination.tsx`
- Props:
  - `currentPage: number`
  - `totalPages: number`
  - `onPageChange: (page: number) => void`

### Behavior summary

- Sliding page window logic (up to 3 page buttons): ✅ Detected
- Boundary safety with disabled prev/next: ✅ Detected
- Ellipsis rendering for truncated ranges: ✅ Implemented (leading/trailing)

### Integration note

Current codebase contains the reusable `Pagination` component, but no direct page-level integration with `BasicTableOne` is currently wired.

## Sorting and Filtering Patterns

### Current implementation status

- Explicit array sorting logic (`.sort(...)`) in table views: ⚠ Not currently implemented
- Explicit array filtering logic (`.filter(...)`) in table views: ⚠ Not currently implemented
- Filter action UI in complex table card: ✅ Present in `RecentOrders` header controls

### Recommended pattern for new table features

1. Keep original row data immutable
2. Apply filter step first, then sort step
3. Pass resulting slice to table rows for pagination
4. Keep pagination state in parent component and drive `Pagination` via callbacks

## RecentOrders as Complex Table Example

- File: `src/components/ecommerce/RecentOrders.tsx`
- Why it is a complex reference:
  - Composite row cell with product image + metadata
  - Header controls for actions (Filter / See all)
  - Badge-based status rendering
  - Shared table primitives for consistent semantics and styling

### Notes

- Column headers are semantic and reusable
- Data model uses a strict union for status: `"Delivered" | "Pending" | "Canceled"`
- Good baseline for extending toward server-fed product/order tables

## Responsive Table Patterns

- BasicTableOne responsive shell (`overflow-x-auto` + fixed min width): ✅ Detected
- RecentOrders horizontal overflow wrapper: ✅ Detected
- Practical pattern used in this project:
  - Wrap table in `max-w-full overflow-x-auto`
  - Keep an inner min-width container for dense column sets
  - Preserve desktop density while allowing horizontal scroll on small screens

## Cross-References

- [Component Catalog](./components.md) - full component metadata
- [Routing Guide](./routing.md) - table page route placement
- [Data Visualization Guide](./data-visualization.md) - complex dashboard cards including table-like datasets
- [State Management](./state-management.md) - local state patterns for future table interactions

---

*This documentation was automatically generated. Last updated: 2026-04-03T23:28:14.206Z*
