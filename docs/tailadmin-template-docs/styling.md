# Styling Guide

**Generated:** 2026-04-03T23:28:14.133Z

## Overview

This document explains the styling system used in TailAdmin, including Tailwind CSS v4 setup, dark mode behavior, ThemeContext integration, custom utility classes, color tokens, and responsive patterns.

## Tailwind CSS V4 Configuration

### Core Setup

- **Tailwind Version:** ^4.1.17
- **PostCSS Plugin:** @tailwindcss/postcss
- **Global Entry File:** `src/app/globals.css`
- **Import Strategy:** Uses `@import 'tailwindcss';` (v4 style, no explicit `tailwind.config.ts` required for base setup)

### Theme Tokens via `@theme`

The project defines design tokens directly in CSS using Tailwind v4 primitives:

- Font tokens (e.g. `--font-outfit`)
- Breakpoint tokens (e.g. `--breakpoint-sm`, `--breakpoint-2xl`)
- Color tokens (brand, gray, success, error, warning, etc.)
- Shadow and z-index tokens

### PostCSS Configuration

`postcss.config.js` registers Tailwind with:

```js
module.exports = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};
```

## Dark Mode System

### Dark Variant Definition

Dark mode is implemented with a custom Tailwind variant in `globals.css`:

```css
@custom-variant dark (&:is(.dark *));
```

This means all `dark:*` classes are activated when the `.dark` class exists in the DOM tree.

### Runtime Behavior

- Theme value is persisted in `localStorage` (key: `theme`)
- On startup, saved theme is restored on the client
- The `.dark` class is toggled on `document.documentElement`
- The codebase currently contains approximately **752** usages of `dark:` variant utilities

## ThemeContext and Usage

### Context API

The app exposes a dedicated theme API:

- `theme: 'light' | 'dark'`
- `toggleTheme(): void`
- `useTheme()` hook for consuming components

### Provider Hierarchy

`ThemeProvider` wraps the full application in `src/app/layout.tsx`, so any client component can call `useTheme()`.

### Example

```tsx
const { theme, toggleTheme } = useTheme();

<button onClick={toggleTheme}>
  Current theme: {theme}
</button>
```

## Custom Tailwind Utilities

The project defines custom reusable utility classes using `@utility`.

**Detected utilities:** 17

- `custom-scrollbar`
- `menu-dropdown-badge`
- `menu-dropdown-badge-active`
- `menu-dropdown-badge-inactive`
- `menu-dropdown-item`
- `menu-dropdown-item-active`
- `menu-dropdown-item-inactive`
- `menu-item`
- `menu-item-active`
- `menu-item-arrow`
- `menu-item-arrow-active`
- `menu-item-arrow-inactive`
- `menu-item-icon`
- `menu-item-icon-active`
- `menu-item-icon-inactive`
- `menu-item-inactive`
- `no-scrollbar`


### Why this pattern is used

- Reduces repeated long class strings
- Centralizes sidebar and dropdown visual rules
- Keeps component markup more maintainable

## Color Palette

The palette is tokenized through `--color-*` variables in `@theme`.

### Palette Families

| Family | Token Count | Example Tokens |
|--------|-------------|----------------|
| black | 1 | `black` |
| blue | 12 | `blue-light-25`, `blue-light-50`, `blue-light-100` |
| brand | 12 | `brand-25`, `brand-50`, `brand-100` |
| current | 1 | `current` |
| error | 12 | `error-25`, `error-50`, `error-100` |
| gray | 13 | `gray-25`, `gray-50`, `gray-100` |
| orange | 12 | `orange-25`, `orange-50`, `orange-100` |
| success | 12 | `success-25`, `success-50`, `success-100` |
| theme | 2 | `theme-pink-500`, `theme-purple-500` |
| transparent | 1 | `transparent` |
| warning | 12 | `warning-25`, `warning-50`, `warning-100` |
| white | 1 | `white` |


### Example Brand Scale

| Token | Value |
|-------|-------|
| `brand-25` | `#f2f7ff` |
| `brand-50` | `#ecf3ff` |
| `brand-100` | `#dde9ff` |
| `brand-200` | `#c2d6ff` |
| `brand-300` | `#9cb9ff` |
| `brand-400` | `#7592ff` |
| `brand-500` | `#465fff` |
| `brand-600` | `#3641f5` |
| `brand-700` | `#2a31d8` |
| `brand-800` | `#252dae` |
| `brand-900` | `#262e89` |
| `brand-950` | `#161950` |


## Responsive Design Patterns

### Breakpoint Tokens

| Breakpoint | Min Width |
|------------|-----------|
| `2xl` | `1536px` |
| `2xsm` | `375px` |
| `3xl` | `2000px` |
| `lg` | `1024px` |
| `md` | `768px` |
| `sm` | `640px` |
| `xl` | `1280px` |
| `xsm` | `425px` |


### Prefix usage across source code

| Prefix | Approx. Occurrences |
|--------|---------------------|
| `sm:` | 116 |
| `lg:` | 109 |
| `xl:` | 42 |
| `md:` | 11 |
| `2xsm:` | 5 |
| `2xl:` | 5 |
| `xsm:` | 2 |
| `3xl:` | 1 |


### Common responsive patterns used

- Mobile-first layouts with progressive enhancement (`sm:`, `md:`, `lg:`, `xl:`)
- Dashboard column changes by breakpoint (e.g. `grid-cols-12`, `xl:col-span-*`)
- Adaptive spacing and sizing (e.g. `md:gap-6`, `lg:p-6`, `2xl:gap-x-32`)
- Visibility and alignment changes by viewport (e.g. `xl:flex-row`, `sm:w-[361px]`)

## Cross-References

- [Architecture Documentation](./architecture.md) - Layout hierarchy and providers
- [State Management](./state-management.md) - Context patterns and hooks
- [Component Catalog](./components.md) - Components consuming theme and responsive classes
- [Configuration](./configuration.md) - Tooling and build setup

---

*This documentation was automatically generated. Last updated: 2026-04-03T23:28:14.133Z*
