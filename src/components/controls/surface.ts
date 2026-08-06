import { cn } from '@/src/design-system/utils/cn';

/**
 * The shared look of a text-entry control: Input, Textarea and Select.
 *
 * In its own module so the component files export only components — a mixed
 * module breaks Fast Refresh, which is what `react-refresh/only-export-components`
 * warns about.
 */
export const CONTROL_SURFACE = cn(
  'w-full border bg-sheet px-3 text-ink',
  'placeholder:text-ink-4',
  'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-rule-focus',
  'disabled:cursor-not-allowed disabled:opacity-disabled',
  /*
    A read-only field is FIXED, not unavailable — a distinction `disabled`
    cannot express. `readOnly` keeps the value focusable, selectable and
    copyable, and screen readers still announce it; `disabled` drops it from the
    tab order entirely, so a keyboard user resetting a password could not read
    back which address the code was sent to.

    So the two states look similar but are not the same: read-only sits on the
    inset surface with a muted border and no focus ring, while remaining fully
    legible. Opacity is deliberately NOT reduced — the whole reason the field is
    still on screen is to be read.
  */
  'read-only:bg-sheet-2 read-only:border-rule read-only:text-ink-2',
  'read-only:cursor-default read-only:focus-visible:outline-none',
);
