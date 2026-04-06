# Modals & Dropdowns Guide

**Generated:** 2026-04-03T23:28:14.223Z

## Overview

This document describes modal and dropdown interaction patterns in TailAdmin, including the reusable `Modal` and `Dropdown` primitives, the `useModal` hook, modal examples, and header dropdown implementations.

## Modal Core Component and Variants

### Core modal primitive

- File: `src/components/ui/modal/index.tsx`
- Main props: `isOpen`, `onClose`, `className`, `children`, `showCloseButton`, `isFullscreen`
- Escape key closes modal: ✅ Detected
- Backdrop click closes modal: ✅ Detected
- Fullscreen support (variant behavior): ✅ Detected via `isFullscreen`
- Optional close button visibility: ✅ Detected via `showCloseButton`

### Implemented modal variants in examples

- `src/components/example/ModalExample/DefaultModal.tsx`
- `src/components/example/ModalExample/VerticallyCenteredModal.tsx`
- `src/components/example/ModalExample/FormInModal.tsx`
- `src/components/example/ModalExample/FullScreenModal.tsx`
- `src/components/example/ModalExample/ModalBasedAlerts.tsx`


### Modals showcase page

- File: `src/app/storybook/(admin)/(ui-elements)/modals/page.tsx`
- Aggregates modal examples on one screen: ✅ Detected

## useModal Hook Integration

### Hook API

- File: `src/hooks/useModal.ts`
- API status: ✅ Returns `isOpen`, `openModal`, `closeModal`, `toggleModal`
- Backed by local `useState` with memoized callbacks using `useCallback`

### Detected usage footprint

- Components/pages using `useModal`: **9**

- `src/components/calendar/Calendar.tsx`
- `src/components/example/ModalExample/DefaultModal.tsx`
- `src/components/example/ModalExample/FormInModal.tsx`
- `src/components/example/ModalExample/FullScreenModal.tsx`
- `src/components/example/ModalExample/ModalBasedAlerts.tsx`
- `src/components/example/ModalExample/VerticallyCenteredModal.tsx`
- `src/components/user-profile/UserAddressCard.tsx`
- `src/components/user-profile/UserInfoCard.tsx`
- `src/components/user-profile/UserMetaCard.tsx`


### Typical pattern

```tsx
const { isOpen, openModal, closeModal } = useModal();

<Button onClick={openModal}>Open Modal</Button>
<Modal isOpen={isOpen} onClose={closeModal}>...</Modal>
```

## ModalExample Reference Set

The `ModalExample` directory provides reference implementations for common modal UX:

- **DefaultModal**: standard content dialog with actions
- **VerticallyCenteredModal**: center-aligned layout without top-right close icon
- **FormInModal**: form composition inside modal container
- **FullScreenModal**: full-screen takeover using `isFullscreen`
- **ModalBasedAlerts**: success/info/warning/error alert-style modal patterns

## Dropdown Components

### Reusable dropdown primitives

- File: `src/components/ui/dropdown/Dropdown.tsx`
  - Outside click close behavior: ✅ Detected (`handleClickOutside` + `.dropdown-toggle` guard)
  - Controlled visibility via `isOpen` prop
- File: `src/components/ui/dropdown/DropdownItem.tsx`
  - Supports `a` and `button` item tags
  - Item click close callback support: ✅ Detected (`onItemClick`)

### Header dropdown implementations

| Component | Path | Open/Close State Pattern |
|-----------|------|--------------------------|
| NotificationDropdown | `src/components/header/NotificationDropdown.tsx` | Local `isOpen` + `notifying` indicator + close callback passed to `Dropdown` |
| UserDropdown | `src/components/header/UserDropdown.tsx` | Local `isOpen` + click toggle (`stopPropagation`) + close callback |


### Header usage footprint

- Dropdown consumers in layout tree: **1**

- `src/layout/AppHeader.tsx`


### Additional behavior notes

- Notification unread indicator state (ping dot): ✅ Detected in `NotificationDropdown`
- User menu caret rotation on open: ✅ Detected in `UserDropdown`

## Open/Close State Management Patterns

Patterns used consistently across modals and dropdowns:

1. **Local boolean state** (`isOpen`) for visibility
2. **Dedicated open/close callbacks** for explicit transitions
3. **Outside interaction handling** (backdrop click / click-outside listener)
4. **Keyboard escape handling** for modal dismissal
5. **Item-level close hooks** in dropdown menus for immediate collapse after action

These patterns keep interaction logic predictable and reusable without introducing unnecessary global state.

## Cross-References

- [State Management](./state-management.md) - custom hooks and local state patterns
- [Components Catalog](./components.md) - component metadata and dependencies
- [Routing Guide](./routing.md) - location of modals showcase route
- [Forms Documentation](./forms.md) - form composition patterns reused in modals

---

*This documentation was automatically generated. Last updated: 2026-04-03T23:28:14.223Z*
