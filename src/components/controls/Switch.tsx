import React, { forwardRef, useId } from 'react';
import { cn } from '@/src/design-system/utils/cn';

export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: string;
  description?: string;
}

/**
 * Switch.
 *
 * This was the worst of the three: BOTH the track and the thumb were children
 * of the `<label>` while the peer input was the label's sibling, so neither
 * `peer-checked:bg-switch-track-checked` nor `peer-checked:translate-x-5` ever
 * matched. The switch could not change appearance when toggled — it rendered
 * as a permanently grey, permanently left-aligned control.
 *
 * Track and thumb are now siblings of the input, which sits on top at
 * `opacity-0` so the whole control stays clickable.
 *
 * The colours had a SECOND bug that outlived that fix. They referenced
 * `--color-switch-track`, `--color-switch-track-checked` and
 * `--color-switch-thumb`, none of which were ever defined — so Tailwind emitted
 * no rule at all for them and the control rendered with no track and no thumb.
 * The peer-selector test passed throughout, because it asserted the class was
 * WRITTEN, not that it resolved to anything.
 *
 * They are semantic tokens now, not bespoke ones. `rule-input` for the off
 * track specifically because a switch track is a non-text UI component and
 * needs 3:1 against the page under WCAG 1.4.11 — it measures 3.21:1, and every
 * lighter neutral in the ramp fails (mute-border 1.62, rule-strong 1.96).
 */
export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ label, description, disabled, className, id: idProp, ...rest }, ref) => {
    const autoId = useId();
    const id = idProp || autoId;

    return (
      <div className={cn('flex items-start gap-3', className)}>
        <span className={cn('relative inline-flex h-5 w-9 shrink-0 mt-0.5', disabled && 'opacity-40')}>
          <input
            ref={ref}
            id={id}
            type="checkbox"
            role="switch"
            disabled={disabled}
            aria-describedby={description ? `${id}-desc` : undefined}
            className={cn(
              'peer absolute inset-0 z-10 m-0 h-full w-full appearance-none rounded-full',
              disabled ? 'cursor-not-allowed' : 'cursor-pointer',
            )}
            {...rest}
          />
          {/* sibling 1 — the track */}
          <span
            aria-hidden="true"
            className={cn(
              'absolute inset-0 rounded-full bg-rule-input transition-colors duration-150',
              'peer-checked:bg-brass',
              'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-rule-focus',
            )}
          />
          {/* sibling 2 — the thumb */}
          <span
            aria-hidden="true"
            className={cn(
              'pointer-events-none absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-sheet',
              'shadow-raised transition-transform duration-150 ease-smooth',
              'peer-checked:translate-x-4',
            )}
          />
        </span>

        {(label || description) && (
          <div className="flex min-w-0 flex-col gap-0.5">
            {label && (
              <label
                htmlFor={id}
                className={cn(
                  'text-base font-medium text-ink select-none',
                  disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer',
                )}
              >
                {label}
              </label>
            )}
            {description && (
              <p id={`${id}-desc`} className="text-sm text-ink-3">
                {description}
              </p>
            )}
          </div>
        )}
      </div>
    );
  },
);

Switch.displayName = 'Switch';
