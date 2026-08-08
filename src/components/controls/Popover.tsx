import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/src/design-system/utils/cn';

export interface PopoverProps {
  /** The control that opens it. Gets the ARIA wiring; no ref is required. */
  trigger: React.ReactElement<{
    onClick?: (e: React.MouseEvent) => void;
    'aria-expanded'?: boolean;
    'aria-haspopup'?: string;
  }>;
  children: React.ReactNode;
  /** Which trigger edge to align to. Default `end` (right). */
  align?: 'start' | 'end';
  /** Accessible name for the surface. */
  label: string;
  className?: string;
}

const GUTTER = 6;

/**
 * A floating surface anchored to a trigger.
 *
 * **Portalled to `document.body`, which is the whole point.** `DropdownMenu`
 * rendered `absolute z-40` in place, which caused two failures that only show
 * up in real layouts: it was clipped by any `overflow: hidden` ancestor — every
 * `Card`, every scrolling table container — and it sat *below* a `Modal` at
 * `z-50`, so a menu opened inside a dialog was invisible. Neither is fixable
 * from inside the component without a portal, which is why it was never
 * adopted anywhere.
 *
 * Position is computed from the trigger's viewport rect and recomputed on
 * scroll and resize. Fixed positioning, so an ancestor's transform or overflow
 * cannot affect it.
 */
export function Popover({ trigger, children, align = 'end', label, className }: PopoverProps) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  /*
   * The anchor is a wrapper around the trigger, not the trigger itself.
   * Passing a ref through `cloneElement` is what `react-hooks/refs` forbids —
   * it reads a ref during render — and it is also fragile, because it silently
   * does nothing if the trigger is a function component that does not forward.
   * An `inline-flex` wrapper has the same box as its child, so measuring it
   * measures the trigger.
   */
  const anchorRef = useRef<HTMLSpanElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const id = useId();

  const focusTrigger = useCallback(() => {
    anchorRef.current?.querySelector<HTMLElement>('button, [href], [tabindex]')?.focus();
  }, []);

  const reposition = useCallback(() => {
    const el = anchorRef.current;
    if (el) setRect(el.getBoundingClientRect());
  }, []);

  useLayoutEffect(() => {
    if (open) reposition();
  }, [open, reposition]);

  useEffect(() => {
    if (!open) return;

    const close = (returnFocus: boolean) => {
      setOpen(false);
      if (returnFocus) focusTrigger();
    };

    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (surfaceRef.current?.contains(target) || anchorRef.current?.contains(target)) return;
      close(false);
    };
    // Escape returns focus to the trigger; a click elsewhere does not, because
    // the pointer has already moved the user's attention.
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(true);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    // `true` so a scroll in ANY ancestor repositions, not just the window.
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);

    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [open, reposition, focusTrigger]);

  // Props only — never a ref. See the note on `anchorRef`.
  const anchored = React.cloneElement(trigger, {
    'aria-expanded': open,
    'aria-haspopup': 'dialog',
    onClick: (e: React.MouseEvent) => {
      trigger.props.onClick?.(e);
      setOpen((v) => !v);
    },
  });

  return (
    <>
      <span ref={anchorRef} className="inline-flex">
        {anchored}
      </span>
      {open &&
        rect &&
        createPortal(
          <div
            ref={surfaceRef}
            role="dialog"
            aria-label={label}
            id={id}
            style={{
              position: 'fixed',
              top: rect.bottom + GUTTER,
              // Aligning by `right` keeps the surface pinned to the trigger's
              // right edge as it grows, which is what an end-aligned menu wants.
              ...(align === 'end'
                ? { right: Math.max(GUTTER, window.innerWidth - rect.right) }
                : { left: Math.max(GUTTER, rect.left) }),
              maxHeight: `calc(100vh - ${rect.bottom + GUTTER * 2}px)`,
            }}
            className={cn(
              'z-(--z-dropdown) overflow-auto rounded-lg border border-rule bg-sheet shadow-overlay',
              className,
            )}
          >
            {children}
          </div>,
          document.body,
        )}
    </>
  );
}
