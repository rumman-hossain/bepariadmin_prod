# BepariBD Design System

Apple-inspired design system for the BepariBD Admin React application.

## Quick Start

```tsx
import { Button, Input, Select, Checkbox, Switch, Modal, Toast } from '@/src/components/ui';
```

## Design Tokens

All visual properties are defined as CSS custom properties in `index.css`. Never hardcode colors, shadows, or radii in components.

### Colors

| Token | Usage |
|-------|-------|
| `text-text-default` | Primary text |
| `text-text-muted` | Secondary/helper text |
| `text-text-placeholder` | Input placeholders |
| `text-text-inverse` | Text on dark backgrounds |
| `bg-surface-primary` | Card/container backgrounds |
| `bg-surface-secondary` | Input/row backgrounds |
| `bg-surface-glass` | Frosted glass panels |
| `border-border-default` | Card/container borders |
| `border-border-input` | Form input borders |
| `border-border-focus` | Focus ring color |
| `text-accent-primary` | Primary accent (#007AFF light, #0A84FF dark) |
| `text-semantic-success` | Success states (#34C759 / #30D158) |
| `text-semantic-danger` | Error states (#FF3B30 / #FF453A) |
| `text-semantic-warning` | Warning states (#FF9500 / #FF9F0A) |

### Radius

| Token | Value |
|-------|-------|
| `rounded-lg` | 8px (inputs sm) |
| `rounded-xl` | 12px (inputs md) |
| `rounded-2xl` | 16px (buttons, cards) |

### Shadows

| Class | Usage |
|-------|-------|
| `shadow-card` | Flat cards |
| `shadow-elevated` | Hover states |
| `shadow-modal` | Modals |
| `shadow-float` | Floating UI |

## Core Components

### Button

```tsx
// ✅ DO
<Button variant="primary" size="md" onClick={handleClick}>
  Submit
</Button>

<Button variant="outline" loading={isLoading}>
  Saving...
</Button>

<Button iconLeft={Plus} variant="secondary" size="sm">
  Add Item
</Button>

// ❌ DON'T
<button className="bg-blue-500 text-white rounded-xl px-4 py-2">
  Submit
</button>
```

**Props:**
- `variant`: `'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'`
- `size`: `'sm' | 'md' | 'lg'`
- `loading`: boolean — replaces content with spinner
- `disabled`: boolean
- `iconLeft` / `iconRight`: LucideIcon
- `fullWidth`: boolean
- `asChild`: boolean — renders children as-is (for link-buttons)

### Input

```tsx
// ✅ DO
<Input
  label="Email"
  type="email"
  placeholder="you@example.com"
  error={errors.email}
  helperText="We won't share your email"
  prefixIcon={Mail}
/>

<Input
  type="password"
  label="Password"
  error={errors.password}
/>

// ❌ DON'T — hardcode styles
<input className="bg-gray-100 rounded p-2" />
```

**Props:**
- `type`: `'text' | 'email' | 'password' | 'number' | 'search'`
- `size`: `'sm' | 'md' | 'lg'`
- `label`, `error`, `success`, `helperText`: string
- `prefixIcon` / `suffixIcon`: LucideIcon
- `loading`: boolean
- `fullWidth`: boolean

### Textarea

```tsx
<Textarea
  label="Description"
  placeholder="Enter description..."
  error={errors.description}
  helperText="Maximum 500 characters"
/>
```

### Select

```tsx
<Select
  label="Category"
  options={[
    { label: 'Electronics', value: 'electronics' },
    { label: 'Clothing', value: 'clothing' },
  ]}
  placeholder="Select a category"
  error={errors.category}
/>
```

### Checkbox

```tsx
<Checkbox
  label="I agree to terms"
  description="Read our privacy policy"
  checked={agreed}
  onChange={(e) => setAgreed(e.target.checked)}
  error={errors.terms}
/>
```

### Radio

```tsx
<Radio
  label="Standard Shipping"
  description="5-7 business days"
  name="shipping"
  value="standard"
  checked={shipping === 'standard'}
  onChange={handleShippingChange}
/>
```

### Switch

```tsx
<Switch
  label="Notifications"
  description="Receive push notifications"
  checked={notifications}
  onChange={(e) => setNotifications(e.target.checked)}
/>
```

### DatePicker

```tsx
<DatePicker
  label="Start Date"
  value={startDate}
  onChange={handleDateChange}
  error={errors.startDate}
  allowClear
  onClear={() => setStartDate('')}
/>
```

### Modal

```tsx
<Modal open={isOpen} onClose={handleClose} title="Confirm Action">
  <p>Are you sure you want to delete this item?</p>
  <div className="flex gap-3 mt-4">
    <Button variant="secondary" onClick={handleClose}>Cancel</Button>
    <Button variant="danger" onClick={handleDelete}>Delete</Button>
  </div>
</Modal>
```

### Toast

```tsx
// Via Redux
dispatch(addToast({ type: 'success', message: 'Item saved!' }));
dispatch(addToast({ type: 'error', message: 'Failed to save' }));
dispatch(addToast({ type: 'info', message: 'Processing...' }));
```

## Accessibility

- All form inputs have associated `<label>` elements (via `useId()` + `htmlFor`)
- Error states use `role="alert"` for screen reader announcement
- Invalid inputs have `aria-invalid="true"`
- Focus indicators use `focus-visible:ring-[3px]` (visible only on keyboard navigation)
- Color is never the sole indicator of state — icons and text labels always accompany
- All touch targets meet Apple HIG minimum of 44px height
- Modals trap focus and use `aria-modal="true"`

## Dark Mode

Dark mode is supported automatically by toggling the `.dark` class on the `<html>` element. All components use CSS variables that switch values in the `.dark` scope. No component contains `dark:` overrides — all theming is in `index.css`.

```tsx
// Toggle dark mode
document.documentElement.classList.toggle('dark');
```

## Architecture Rules

1. **Parent controlled**: All components are fully controlled. Pass `value`/`checked` and `onChange`. Use `ref` for DOM access.
2. **No hardcoded styles**: Use design token classes only. No `#hex`, `rgba()`, or `px` values in components.
3. **Composition over props**: Complex behavior = wrap primitive components, don't add massive prop objects.
4. **One file, one component**: Each `.tsx` exports a single component.
5. **TypeScript strict**: Every component has a named `Props` interface. No `any`.
6. **`cn()` is the only class merger**: Import from `@/src/design-system/utils/cn`.

## File Structure

```
src/
├── design-system/
│   ├── DESIGN_SYSTEM.md          ← You are here
│   ├── tokens.ts                 ← TypeScript token definitions
│   └── utils/
│       └── cn.ts                 ← clsx + tailwind-merge
├── components/
│   ├── ui/                       ← Design system primitives
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Textarea.tsx
│   │   ├── Select.tsx
│   │   ├── Checkbox.tsx
│   │   ├── Radio.tsx
│   │   ├── Switch.tsx
│   │   ├── DatePicker.tsx
│   │   ├── Modal.tsx
│   │   ├── Toast.tsx
│   │   ├── DataTable.tsx
│   │   ├── StatusBadge.tsx
│   │   ├── EmptyState.tsx
│   │   └── SearchFilterBar.tsx
│   ├── forms/                    ← Form composition wrappers
│   │   ├── FormField.tsx
│   │   └── FormSection.tsx
│   ├── layout/                   ← App shell
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   └── AppLayout.tsx
│   └── shared/                   ← Domain-specific shared
│       ├── FileUploadBox.tsx
│       └── EntityDetailsCard.tsx
```

## Adding a New Component

1. Create file in `src/components/ui/`
2. Use `forwardRef` for DOM access
3. Define `Props` interface extending native HTML attrs where appropriate
4. Use `useId()` for unique IDs
5. Use design token classes only (no hardcoded values)
6. Support `disabled` -> `opacity-40 pointer-events-none`
7. Support `className` via `cn()` for parent overrides
8. Add `aria-*` attributes for accessibility
9. Add `displayName` for React DevTools
10. Export as named export

## Performance

- All icons are from `lucide-react` (tree-shakeable)
- `cn()` deduplicates Tailwind classes
- No unnecessary re-renders: components are pure, stateless where possible
- No runtime CSS-in-JS: all styles are Tailwind utility classes compiled at build time
- Modals use React Portal to avoid z-index stacking context issues