# Data Visualization Guide

**Generated:** 2026-04-03T23:28:14.186Z

## Overview

This document describes the data visualization stack in TailAdmin: chart components, map integration, ecommerce metric visuals, calendar scheduling UI, and update patterns for displayed data.

## Visualization Stack

### Library integrations

- `apexcharts` (^4.7.0)
- `react-apexcharts` (^1.8.0)
- `@react-jvectormap/core` (^1.0.4)
- `@react-jvectormap/world` (^1.1.2)
- `@fullcalendar/react` (^6.1.19)
- `@fullcalendar/daygrid`, `@fullcalendar/timegrid`, `@fullcalendar/interaction`
- `flatpickr` (^4.6.13) for date range controls in analytics cards

## Chart Components (Line and Bar)

| Component | Path | Notes |
|-----------|------|-------|
| BarChartOne | `src/components/charts/bar/BarChartOne.tsx` | Bar chart with monthly categories and tooltip formatting |
| LineChartOne | `src/components/charts/line/LineChartOne.tsx` | Line/area chart with gradient fill and monthly categories |


### ApexCharts integration notes

- Dynamic import for SSR-safe rendering: ✅ Detected
- Typed chart configuration via `ApexOptions`: ✅ Detected
- Common patterns:
  - Monthly categories on x-axis
  - Hidden toolbars for cleaner dashboard UI
  - Theme-consistent colors (brand palette)
  - Horizontal overflow wrappers for smaller screens

### Example usage

```tsx
import LineChartOne from "@/components/charts/line/LineChartOne";

<ComponentCard title="Line Chart 1">
  <LineChartOne />
</ComponentCard>
```

## CountryMap and react-jvectormap

- Source: `src/components/ecommerce/CountryMap.tsx`
- Integration status: ✅ Detected (@react-jvectormap/core + world map data)
- Rendering strategy: dynamic import to avoid server-side map rendering issues
- Features used:
  - worldMill projection
  - region style and hover styling
  - custom markers by coordinates/country
  - optional `mapColor` prop for theme adaptation

### Related demographic visualization

`DemographicCard` composes `CountryMap` with country-level progress indicators for customer distribution.

## Ecommerce Metric Visualization Components

| Component | Path | Visualization Role |
|-----------|------|---------------------|
| CountryMap | `src/components/ecommerce/CountryMap.tsx` | Interactive world map with marker overlays |
| DemographicCard | `src/components/ecommerce/DemographicCard.tsx` | CountryMap container + country distribution bars |
| EcommerceMetrics | `src/components/ecommerce/EcommerceMetrics.tsx` | KPI cards with trend deltas |
| MonthlySalesChart | `src/components/ecommerce/MonthlySalesChart.tsx` | Apex bar chart for monthly sales trend |
| MonthlyTarget | `src/components/ecommerce/MonthlyTarget.tsx` | Radial progress chart for monthly target |
| RecentOrders | `src/components/ecommerce/RecentOrders.tsx` | Dashboard visualization support component |
| StatisticsChart | `src/components/ecommerce/StatisticsChart.tsx` | Apex area chart + time-range picker |


## Calendar and fullcalendar Integration

| Component | Path | Notes |
|-----------|------|-------|
| Calendar | `src/components/calendar/Calendar.tsx` | FullCalendar integration with modal event management |


### FullCalendar integration status

- FullCalendar imports: ✅ Detected
- Plugins in use: `dayGridPlugin`, `timeGridPlugin`, `interactionPlugin`
- Interaction model:
  - Date selection opens modal
  - Event click opens edit modal
  - Add/update event logic managed in component state

- Event CRUD-like state pattern detected: ✅ Yes (state updates via `setEvents` and `handleAddOrUpdateEvent`)

## Data Update Patterns

Current data visualization update approaches in this codebase:

1. **Static seeded series/data arrays** for charts (line/bar/radial) at component level
2. **Local state updates** for interactive modules (calendar events)
3. **UI-only filter controls** (e.g., chart tabs and dropdown actions) prepared for future backend wiring
4. **Date-range driven analytics controls** with flatpickr range picker: ✅ Detected in `StatisticsChart`

### Suggested real-time extension path

- Move chart series into async data hooks
- Poll or subscribe to backend endpoints for metric updates
- Keep chart options memoized and only update series payloads
- Reuse existing component boundaries (cards/charts/maps) for data source swaps

## Cross-References

- [Architecture Documentation](./architecture.md) - Overall dashboard structure
- [Components Catalog](./components.md) - Component-level references and dependencies
- [State Management](./state-management.md) - Local state and modal interaction patterns
- [Forms Documentation](./forms.md) - Shared input/date control conventions

---

*This documentation was automatically generated. Last updated: 2026-04-03T23:28:14.186Z*
