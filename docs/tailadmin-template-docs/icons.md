# Icon System Guide

**Generated:** 2026-04-03T23:28:14.243Z

## Overview

This document describes the SVG icon system used in TailAdmin, including `src/icons` inventory, barrel exports in `icons/index.tsx`, import/usage patterns, styling conventions, and extension steps for adding new icons.

## Icons Directory and Inventory

- Icons directory: `src/icons`
- Total SVG files detected: **57**
- Icons imported in `index.tsx`: **53**
- Icons exported from barrel: **53**

### SVG files currently not re-exported from barrel

- `src/icons/angle-left.svg`
- `src/icons/angle-right.svg`
- `src/icons/calendar.svg`
- `src/icons/task.svg`


## Barrel File: icons/index.tsx

- Source: `src/icons/index.tsx`
- Purpose: central icon export surface for concise imports like `import { PlusIcon } from "@/icons"`

### Exported icon map

| Export Name | SVG File |
|-------------|----------|
| AlertIcon | `src/icons/alert.svg` |
| AngleDownIcon | `src/icons/angle-down.svg` |
| AngleUpIcon | `src/icons/angle-up.svg` |
| ArrowDownIcon | `src/icons/arrow-down.svg` |
| ArrowRightIcon | `src/icons/arrow-right.svg` |
| ArrowUpIcon | `src/icons/arrow-up.svg` |
| AudioIcon | `src/icons/audio.svg` |
| BellIcon | `src/icons/bell.svg` |
| BoltIcon | `src/icons/bolt.svg` |
| BoxCubeIcon | `src/icons/box-cube.svg` |
| BoxIcon | `src/icons/box.svg` |
| BoxIconLine | `src/icons/box-line.svg` |
| CalenderIcon | `src/icons/calender-line.svg` |
| ChatIcon | `src/icons/chat.svg` |
| CheckCircleIcon | `src/icons/check-circle.svg` |
| CheckLineIcon | `src/icons/check-line.svg` |
| ChevronDownIcon | `src/icons/chevron-down.svg` |
| ChevronLeftIcon | `src/icons/chevron-left.svg` |
| ChevronUpIcon | `src/icons/chevron-up.svg` |
| CloseIcon | `src/icons/close.svg` |
| CloseLineIcon | `src/icons/close-line.svg` |
| CopyIcon | `src/icons/copy.svg` |
| DocsIcon | `src/icons/docs.svg` |
| DollarLineIcon | `src/icons/dollar-line.svg` |
| DownloadIcon | `src/icons/download.svg` |
| EnvelopeIcon | `src/icons/envelope.svg` |
| ErrorIcon | `src/icons/info-hexa.svg` |
| EyeCloseIcon | `src/icons/eye-close.svg` |
| EyeIcon | `src/icons/eye.svg` |
| FileIcon | `src/icons/file.svg` |
| FolderIcon | `src/icons/folder.svg` |
| GridIcon | `src/icons/grid.svg` |
| GroupIcon | `src/icons/group.svg` |
| HorizontaLDots | `src/icons/horizontal-dots.svg` |
| InfoIcon | `src/icons/info.svg` |
| ListIcon | `src/icons/list.svg` |
| LockIcon | `src/icons/lock.svg` |
| MailIcon | `src/icons/mail-line.svg` |
| MoreDotIcon | `src/icons/more-dot.svg` |
| PageIcon | `src/icons/page.svg` |
| PaperPlaneIcon | `src/icons/paper-plane.svg` |
| PencilIcon | `src/icons/pencil.svg` |
| PieChartIcon | `src/icons/pie-chart.svg` |
| PlugInIcon | `src/icons/plug-in.svg` |
| PlusIcon | `src/icons/plus.svg` |
| ShootingStarIcon | `src/icons/shooting-star.svg` |
| TableIcon | `src/icons/table.svg` |
| TaskIcon | `src/icons/task-icon.svg` |
| TimeIcon | `src/icons/time.svg` |
| TrashBinIcon | `src/icons/trash.svg` |
| UserCircleIcon | `src/icons/user-circle.svg` |
| UserIcon | `src/icons/user-line.svg` |
| VideoIcon | `src/icons/videos.svg` |


## Type Support for SVG Imports

- Declaration file: `src/svg.d.ts`
- SVG module declaration detected: ✅ Yes
- Current setup allows SVG imports as default source and as React component typing metadata.

## Import and Usage Patterns

### Canonical import style

```tsx
import { PlusIcon, EyeIcon } from "@/icons";
```

### Usage examples

```tsx
<Button startIcon={<PlusIcon />}>Add item</Button>

<EyeIcon className="fill-gray-500 dark:fill-gray-400" />
```

### Consumer footprint

- Files importing from `@/icons`: **9**

- `src/app/storybook/(admin)/(ui-elements)/badge/page.tsx`
- `src/app/storybook/(admin)/(ui-elements)/buttons/page.tsx`
- `src/components/auth/SignInForm.tsx`
- `src/components/auth/SignUpForm.tsx`
- `src/components/ecommerce/DemographicCard.tsx`
- `src/components/ecommerce/EcommerceMetrics.tsx`
- `src/components/ecommerce/MonthlySalesChart.tsx`
- `src/components/ecommerce/MonthlyTarget.tsx`
- `src/components/form/form-elements/SelectInputs.tsx`


### Frequently seen imported icons (sample)

- `ArrowDownIcon`
- `ArrowUpIcon`
- `BoxIcon`
- `BoxIconLine`
- `ChevronDownIcon`
- `ChevronLeftIcon`
- `EyeCloseIcon`
- `EyeIcon`
- `GroupIcon`
- `MoreDotIcon`
- `PlusIcon`


## Size and Color Styling Conventions

- SVG internals using `currentColor`: ✅ Detected
- Class-based icon styling in consumers (size/color): ✅ Detected

Common patterns used in this project:

1. **Color via utility classes** (e.g., `text-gray-800`, `fill-gray-500`, `dark:text-white/90`)
2. **Size via utilities** (e.g., `size-6`, `w-5 h-5`) or SVG intrinsic dimensions
3. **Contextual coloring** by parent components (badges, buttons, cards)

Because many SVG paths are authored with `fill="currentColor"`, icon color can be themed through regular Tailwind text/fill classes.

## How to Add a New Icon

1. Add the SVG file under `src/icons` (e.g., `new-feature.svg`)
2. In `src/icons/index.tsx`, add:
   - import: `import NewFeatureIcon from "./new-feature.svg";`
   - export entry: `NewFeatureIcon`
3. Consume from barrel:
   - `import { NewFeatureIcon } from "@/icons";`
4. Apply styling classes where needed:
   - `<NewFeatureIcon className="size-5 text-brand-500" />`

## Cross-References

- [Component Catalog](./components.md) - components that consume icons
- [Styling Guide](./styling.md) - theme and utility class conventions used on icons
- [Modals & Dropdowns](./modals-dropdowns.md) - interaction components with icon-heavy UI
- [Integration Patterns](./integration-patterns.md) - conventions for extending shared primitives

---

*This documentation was automatically generated. Last updated: 2026-04-03T23:28:14.243Z*
