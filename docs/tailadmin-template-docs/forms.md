# Forms & Inputs Guide

**Generated:** 2026-04-03T23:28:14.166Z

## Overview

This document describes the form system used in TailAdmin, including reusable form inputs, composition with `Form` and `Label`, validation patterns, authentication form examples, and date-picker integration with flatpickr.

## Form Component Inventory

### Core reusable form components

| Component | Path | Props Count |
|-----------|------|-------------|
| Checkbox | `src/components/form/input/Checkbox.tsx` | 6 |
| CheckboxComponents | `src/components/form/form-elements/CheckboxComponents.tsx` | 0 |
| DatePicker | `src/components/form/date-picker.tsx` | 0 |
| DefaultInputs | `src/components/form/form-elements/DefaultInputs.tsx` | 0 |
| DropzoneComponent | `src/components/form/form-elements/DropZone.tsx` | 0 |
| FileInput | `src/components/form/input/FileInput.tsx` | 2 |
| FileInputExample | `src/components/form/form-elements/FileInputExample.tsx` | 0 |
| Form | `src/components/form/Form.tsx` | 3 |
| Input | `src/components/form/input/InputField.tsx` | 14 |
| InputGroup | `src/components/form/form-elements/InputGroup.tsx` | 0 |
| InputStates | `src/components/form/form-elements/InputStates.tsx` | 0 |
| Label | `src/components/form/Label.tsx` | 3 |
| MultiSelect | `src/components/form/MultiSelect.tsx` | 5 |
| PhoneInput | `src/components/form/group-input/PhoneInput.tsx` | 4 |
| Radio | `src/components/form/input/Radio.tsx` | 8 |
| RadioButtons | `src/components/form/form-elements/RadioButtons.tsx` | 0 |
| RadioSm | `src/components/form/input/RadioSm.tsx` | 7 |
| Select | `src/components/form/Select.tsx` | 5 |
| SelectInputs | `src/components/form/form-elements/SelectInputs.tsx` | 0 |
| Switch | `src/components/form/switch/Switch.tsx` | 5 |
| TextArea | `src/components/form/input/TextArea.tsx` | 8 |
| TextAreaInput | `src/components/form/form-elements/TextAreaInput.tsx` | 0 |
| ToggleSwitch | `src/components/form/form-elements/ToggleSwitch.tsx` | 0 |


### Main input components requested in requirements

- `Form.tsx`
- `Label.tsx`
- `Select.tsx`
- `MultiSelect.tsx`
- `date-picker.tsx`
- `switch/Switch.tsx`
- `input/InputField.tsx`
- `input/Checkbox.tsx`
- `input/TextArea.tsx`


## Form + Label Composition Pattern

### Form component

- File: `src/components/form/Form.tsx`
- Purpose: central wrapper for form submission handling
- Behavior: prevents default submit and forwards event to `onSubmit`

### Label component

- File: `src/components/form/Label.tsx`
- Purpose: consistent form label typography/spacings
- Utility: uses `twMerge` for safe class override composition

### Typical usage

```tsx
<Form onSubmit={handleSubmit}>
  <Label htmlFor="email">Email</Label>
  <Input id="email" type="email" placeholder="info@gmail.com" />
</Form>
```

## Validation Patterns

Validation is primarily handled at component/page level (client-side), with visual states in shared inputs.

### Detected patterns

- Email regex validation in demo states: ✅ Detected in `InputStates.tsx`
- Visual state props (`error`, `success`, `hint`): ✅ Detected
- Required field markers in auth forms (`*`): ✅ Detected

### State-driven validation style example

```tsx
<Input
  type="email"
  error={hasError}
  success={!hasError}
  hint={hasError ? "This is an invalid email address." : "Valid email!"}
/>
```

## Authentication Forms as Reference Implementations

| Component | Path | Purpose |
|-----------|------|---------|
| SignInForm | `src/components/auth/SignInForm.tsx` | Authentication component - SignInForm |
| SignUpForm | `src/components/auth/SignUpForm.tsx` | Authentication component - SignUpForm |


### Common patterns in auth forms

- Reuse `Label` + `Input` primitives
- Password visibility toggle with icon state
- Checkbox-based consent/session behaviors
- Client-side state via `useState` for interactive controls

- Shared input/label usage in SignIn and SignUp: ✅ Yes

## Date Picker and flatpickr Integration

### Integration status

- `flatpickr` usage in `date-picker.tsx`: ✅ Detected
- CSS import: `flatpickr/dist/flatpickr.css`
- Wrapper component: `DatePicker` with `mode`, `defaultDate`, `onChange`, `placeholder`

### Flatpickr behavior notes

- Initializes in `useEffect` using the element id
- Supports modes: `single`, `multiple`, `range`, `time`
- Destroys flatpickr instance on unmount to avoid leaks

### Example

```tsx
<DatePicker
  id="invoice-date"
  label="Invoice date"
  mode="single"
  placeholder="Select a date"
  onChange={(dates) => console.log(dates)}
/>
```

## Form State Management Patterns

- Local `useState` for input values and UI toggles (password visibility, checkbox state)
- Controlled components for custom widgets (e.g. `MultiSelect`, `PhoneInput`)
- Callback-driven updates to parent scope (`onChange` props)
- Shared visual styles for disabled, error, and success states

## Recommended Extension Pattern

When creating new forms:

1. Start from `Label` + input primitives
2. Keep validation and UI state local unless globally needed
3. Expose typed `onChange` callbacks in custom form controls
4. Reuse existing styles/hint conventions to keep consistency

## Cross-References

- [Component Catalog](./components.md) - Detailed component metadata
- [State Management](./state-management.md) - Local/global state usage principles
- [Styling Guide](./styling.md) - Input styling and theme behavior
- [Routing Guide](./routing.md) - Form pages under App Router

---

*This documentation was automatically generated. Last updated: 2026-04-03T23:28:14.166Z*
