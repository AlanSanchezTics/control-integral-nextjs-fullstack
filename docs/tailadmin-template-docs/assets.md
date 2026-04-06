# Assets Management Guide

**Generated:** 2026-04-03T23:28:14.279Z

## Overview

This document explains how static assets are organized and referenced in TailAdmin, focusing on `public/images`, key image categories, logo variants, and error page assets.

## public/images Structure

- Root assets directory: `public/images`
- Detected category folders: **14**

| Category | Files | Usage in src | Example Assets |
|----------|-------|--------------|----------------|
| `brand` | 15 | 0 | `brand/brand-01.svg`, `brand/brand-02.svg`, `brand/brand-03.svg` |
| `cards` | 6 | 0 | `cards/card-01.jpg`, `cards/card-01.png`, `cards/card-02.jpg` |
| `carousel` | 4 | 0 | `carousel/carousel-01.png`, `carousel/carousel-02.png`, `carousel/carousel-03.png` |
| `chat` | 1 | 0 | `chat/chat.jpg` |
| `country` | 8 | 2 | `country/country-01.svg`, `country/country-02.svg`, `country/country-03.svg` |
| `error` | 10 | 4 | `error/404-dark.svg`, `error/404.svg`, `error/500-dark.svg` |
| `grid-image` | 6 | 6 | `grid-image/image-01.png`, `grid-image/image-02.png`, `grid-image/image-03.png` |
| `icons` | 6 | 0 | `icons/file-image-dark.svg`, `icons/file-image.svg`, `icons/file-pdf-dark.svg` |
| `logo` | 4 | 6 | `logo/auth-logo.svg`, `logo/logo-dark.svg`, `logo/logo-icon.svg` |
| `product` | 5 | 5 | `product/product-01.jpg`, `product/product-02.jpg`, `product/product-03.jpg` |
| `shape` | 1 | 2 | `shape/grid-01.svg` |
| `task` | 4 | 0 | `task/google-drive.svg`, `task/pdf.svg`, `task/task.jpg` |
| `user` | 38 | 51 | `user/owner.jpg`, `user/user-01.jpg`, `user/user-02.jpg` |
| `video-thumb` | 2 | 0 | `video-thumb/thumb-16.png`, `video-thumb/youtube-icon-84.svg` |


## Required Image Categories

The following categories requested by requirements are present in this project:

- `brand`: ✅ Present
- `cards`: ✅ Present
- `user`: ✅ Present
- `error`: ✅ Present
- `logo`: ✅ Present
- `icons`: ✅ Present

## Referencing Images from Components

### Current path patterns detected

- Absolute from public root (recommended): ✅ Detected (`/images/...`)
- Relative-like image paths (`./images/...`): ✅ Detected (should be normalized when possible)

### Recommended usage example

```tsx
import Image from "next/image";

<Image
  src="/images/user/user-01.jpg"
  alt="User avatar"
  width={40}
  height={40}
/>
```

### Image reference footprint

- Files in `src` referencing `images/`: **16**

- `src/app/storybook/(admin)/(ui-elements)/avatars/page.tsx`
- `src/app/storybook/(full-width-pages)/(auth)/layout.tsx`
- `src/app/storybook/(full-width-pages)/(error-pages)/error-404/page.tsx`
- `src/app/not-found.tsx`
- `src/components/common/GridShape.tsx`
- `src/components/ecommerce/DemographicCard.tsx`
- `src/components/ecommerce/RecentOrders.tsx`
- `src/components/header/NotificationDropdown.tsx`
- `src/components/header/UserDropdown.tsx`
- `src/components/tables/BasicTableOne.tsx`
- `src/components/ui/images/ResponsiveImage.tsx`
- `src/components/ui/images/ThreeColumnImageGrid.tsx`
- `src/components/ui/images/TwoColumnImageGrid.tsx`
- `src/components/user-profile/UserMetaCard.tsx`
- `src/layout/AppHeader.tsx`
- `src/layout/AppSidebar.tsx`


## Logo System

Logo variants in `public/images/logo`:

- `logo.svg`: ✅ Present
- `logo-dark.svg`: ✅ Present
- `logo-icon.svg`: ✅ Present
- `auth-logo.svg`: ✅ Present

### Usage notes

- Sidebar/header commonly use `logo.svg` and `logo-dark.svg` for light/dark theme toggling.
- Compact brand slot uses `logo-icon.svg`.
- Auth layout uses `auth-logo.svg` in split-screen branding.

## Error Images and Error Pages

- Error asset directory: `public/images/error`
- Error variants detected: **10**

- `public/images/error/404-dark.svg`
- `public/images/error/404.svg`
- `public/images/error/500-dark.svg`
- `public/images/error/500.svg`
- `public/images/error/503-dark.svg`
- `public/images/error/503.svg`
- `public/images/error/maintenance-dark.svg`
- `public/images/error/maintenance.svg`
- `public/images/error/success-dark.svg`
- `public/images/error/success.svg`


### Error image usage footprint

- Files in `src` referencing `/images/error/`: **2**

- `src/app/storybook/(full-width-pages)/(error-pages)/error-404/page.tsx`
- `src/app/not-found.tsx`


### Current behavior

- 404 pages render both light and dark variants (e.g., `404.svg` + `404-dark.svg`).
- Additional assets for 500/503/maintenance/success are available for future dedicated pages.

## Asset Addition Guidelines

When adding new image assets:

1. Place files in the most specific category under `public/images/<category>`
2. Use descriptive kebab-case names (e.g., `feature-hero-01.png`)
3. Prefer `/images/...` absolute paths in `next/image` components
4. Add dark variants where needed for theme-aware screens
5. Reuse existing category conventions to keep discoverability high

## Cross-References

- [Architecture Documentation](./architecture.md) - high-level static asset placement
- [Styling Guide](./styling.md) - dark mode implications for image variants
- [Routing Guide](./routing.md) - error page routing context
- [Icons Guide](./icons.md) - SVG icon system (separate from image assets)

---

*This documentation was automatically generated. Last updated: 2026-04-03T23:28:14.279Z*
