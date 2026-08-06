import React, { createContext, useContext, useId } from 'react';
import { cn } from '@/src/design-system/utils/cn';
import type { ControlSize } from './Button';

// ─── SegmentedControl ────────────────────────────────────

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  disabled?: boolean;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Accessible name for the group. */
  label: string;
  size?: Exclude<ControlSize, 'lg'>;
  className?: string;
}

/**
 * A small set of mutually exclusive choices, all visible at once.
 *
 * Replaces the bespoke `ToggleBar` in the add-product wizard. Uses
 * `role="radiogroup"` rather than tabs: these choose a *value*, they do not
 * switch a view, and announcing them as tabs tells a screen-reader user to
 * expect panelled content that does not exist.
 *
 * Only the selected option is in the tab order, with arrows moving between —
 * the standard radio-group interaction, and the reason this is not just a row
 * of buttons.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  size = 'md',
  className,
}: SegmentedControlProps<T>) {
  const enabled = options.filter((o) => !o.disabled);

  function onKeyDown(e: React.KeyboardEvent) {
    if (enabled.length === 0) return;
    const pos = enabled.findIndex((o) => o.value === value);
    let next: number;

    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        next = pos < 0 ? 0 : (pos + 1) % enabled.length;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        next = pos < 0 ? enabled.length - 1 : (pos - 1 + enabled.length) % enabled.length;
        break;
      default:
        return;
    }
    e.preventDefault();
    onChange(enabled[next]!.value);
  }

  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn(
        'inline-flex rounded-md border border-rule bg-sheet-2 p-0.5',
        /*
          This was `inline-flex` with `whitespace-nowrap` children and nothing
          else — no wrapping, no scroller. Logistics puts five segments in the
          page header ("Overview · To dispatch (12) · In transit · Delivered ·
          Rates"), roughly 480px of buttons in the 343px a 375px phone actually
          offers, and the overflow pushed the whole page sideways. Twelve
          screens use this control.

          A horizontal scroller rather than a `<select>` below `sm`: one
          control, one set of semantics, nothing to keep in sync. A scrolling
          strip of segments is also what every phone OS does with the same
          problem.

          `max-w-full` is what actually contains it — without it the flex item
          sizes to its content and there is nothing for `overflow-x` to clip.
        */
        'max-w-full overflow-x-auto',
        className,
      )}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            disabled={option.disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              // `shrink-0`: inside a scroller the segments must keep their
              // natural width. Without it flex compresses them to fit and the
              // labels truncate instead of scrolling.
              'shrink-0 rounded-sm font-medium whitespace-nowrap transition-colors',
              'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-rule-focus',
              size === 'sm' ? 'h-7 px-2.5 text-sm' : 'h-8 px-3 text-base',
              selected ? 'bg-sheet text-ink shadow-xs' : 'text-ink-3 hover:text-ink',
              option.disabled && 'pointer-events-none opacity-disabled',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── RadioGroup ──────────────────────────────────────────

interface RadioGroupContextValue {
  name: string;
  value: string | undefined;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const RadioGroupContext = createContext<RadioGroupContextValue | null>(null);

export interface RadioGroupProps {
  /** Shared across every radio; without it they are not one group. */
  name?: string;
  value?: string;
  onChange: (value: string) => void;
  label: string;
  /** Hide the group label visually but keep it for assistive tech. */
  hideLabel?: boolean;
  description?: string;
  error?: string;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
}

/**
 * A set of radios that behave as one control.
 *
 * `Radio` shipped with no group wrapper, so every caller had to wire `name`,
 * `checked` and `onChange` by hand — and a shared `name` is what makes the
 * browser treat them as one control at all. Without it, arrow keys do not move
 * between options and more than one can be checked. It had zero call sites
 * outside its own test, which is what an unusable primitive looks like.
 *
 * Renders a real `<fieldset>`/`<legend>`, so the group's question is announced
 * before its options rather than each option arriving without context.
 */
export function RadioGroup({
  name,
  value,
  onChange,
  label,
  hideLabel = false,
  description,
  error,
  disabled,
  children,
  className,
}: RadioGroupProps) {
  const autoName = useId();
  const errorId = useId();

  return (
    <fieldset
      className={cn('min-w-0 border-0 p-0', className)}
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? errorId : undefined}
      disabled={disabled}
    >
      <legend className={cn('text-sm font-medium text-ink-2', hideLabel && 'sr-only')}>
        {label}
      </legend>
      {description && !hideLabel && <p className="mt-0.5 text-xs text-ink-3">{description}</p>}

      <div className="mt-2 flex flex-col gap-2">
        <RadioGroupContext.Provider
          value={{ name: name ?? autoName, value, onChange, disabled }}
        >
          {children}
        </RadioGroupContext.Provider>
      </div>

      {error && (
        <p id={errorId} role="alert" className="mt-1.5 text-sm text-bad">
          {error}
        </p>
      )}
    </fieldset>
  );
}

export interface RadioProps {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
  className?: string;
}

export function Radio({ value, label, description, disabled, className }: RadioProps) {
  const ctx = useContext(RadioGroupContext);
  const id = useId();

  if (!ctx) throw new Error('Radio must be rendered inside <RadioGroup>.');

  const checked = ctx.value === value;
  const isDisabled = disabled || ctx.disabled;

  return (
    <div className={cn('flex items-start gap-2.5', className)}>
      {/*
        The input is a real radio, visually hidden behind the custom control
        rather than replaced by it — so keyboard, form submission and the
        browser's own group semantics all still work. The visual pieces are
        SIBLINGS of the input, never children: Tailwind compiles `peer-checked:`
        to a general-sibling selector, and nesting them is what left every
        checkbox, radio and switch in this app rendering blank when checked.
      */}
      <span className="relative flex h-[18px] w-[18px] shrink-0 items-center justify-center">
        <input
          type="radio"
          id={id}
          name={ctx.name}
          value={value}
          checked={checked}
          disabled={isDisabled}
          onChange={() => ctx.onChange(value)}
          className="peer absolute inset-0 z-(--z-raised) cursor-pointer opacity-0 disabled:cursor-not-allowed"
        />
        <span
          aria-hidden="true"
          className={cn(
            'h-[18px] w-[18px] rounded-full border bg-sheet transition-colors',
            'peer-checked:border-brass peer-disabled:opacity-disabled',
            'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-rule-focus',
            'border-rule-input',
          )}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute h-2 w-2 scale-0 rounded-full bg-brass transition-transform peer-checked:scale-100"
        />
      </span>

      <label htmlFor={id} className={cn('min-w-0 cursor-pointer', isDisabled && 'opacity-disabled')}>
        <span className="block text-base text-ink">{label}</span>
        {description && <span className="block text-xs text-ink-3">{description}</span>}
      </label>
    </div>
  );
}
