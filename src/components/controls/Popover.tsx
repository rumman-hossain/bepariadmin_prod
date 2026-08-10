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
  /**
   * The surface's contents.
   *
   * As a function it is handed a `close`, which a menu needs: dismissal is
   * wired to a click OUTSIDE the surface, so choosing an item — which is a
   * click inside it — would otherwise leave the menu standing open behind
   * whatever the item just opened.
   */
  children: React.ReactNode | ((close: () => void) => React.ReactNode);
  /** Which trigger edge to align to. Default `end` (right). */
  align?: 'start' | 'end';
  /** Accessible name for the surface. */
  label: string;
  className?: string;
  /**
   * Classes for the wrapper span, which is the box the surface is anchored to.
   *
   * Defaults to `inline-flex`, which makes the wrapper the same box as the
   * trigger — right for a button in normal flow, and what every existing caller
   * gets. Pass something else when the thing being anchored to is not the
   * trigger's own box: a product media tile hands this `absolute inset-0` so
   * the menu is positioned against the whole tile rather than against the
   * invisible full-bleed button inside it.
   */
  anchorClassName?: string;
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
export function Popover({
  trigger,
  children,
  align = 'end',
  label,
  className,
  anchorClassName = 'inline-flex',
}: PopoverProps) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  /*
   * How tall the surface WANTS to be, which decides whether it opens downward.
   *
   * Taken in a callback ref rather than an effect: it is a measurement made at
   * commit, and `react-hooks/set-state-in-effect` is right that an effect which
   * immediately sets state is a cascading render waiting to happen. `0` until
   * the surface has mounted once, which reads as "assume it fits".
   */
  const [surfaceHeight, setSurfaceHeight] = useState(0);
  /*
   * And how wide it is, which decides nothing but has to be CLAMPED.
   *
   * `align: 'end'` pins the surface's right edge to the trigger's, so a narrow
   * trigger near the left of the window pushes the surface's LEFT edge off it.
   * Seen on dev: a 224px menu on a variant tile 196px from the edge hung 28px
   * into nowhere, with the first characters of every label cut off.
   */
  const [surfaceWidth, setSurfaceWidth] = useState(0);
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

  const anchorId = `${id}-anchor`;

  const focusTrigger = useCallback(() => {
    anchorRef.current?.querySelector<HTMLElement>('button, [href], [tabindex]')?.focus();
  }, []);

  /*
   * Closing from a menu item, which asks for focus back on the trigger —
   * otherwise choosing an item drops the keyboard at the top of the document.
   *
   * Found by id rather than through `anchorRef`, because this function is
   * handed to `children` during render and `react-hooks/refs` — correctly —
   * refuses a ref read reachable from that path. Synchronous, so a dialog the
   * item goes on to open still takes the focus afterwards.
   */
  const closeFromContent = useCallback(() => {
    setOpen(false);
    document
      .getElementById(anchorId)
      ?.querySelector<HTMLElement>('button, [href], [tabindex]')
      ?.focus();
  }, [anchorId]);

  const reposition = useCallback(() => {
    const el = anchorRef.current;
    if (el) setRect(el.getBoundingClientRect());
  }, []);

  useLayoutEffect(() => {
    if (open) reposition();
  }, [open, reposition]);

  /*
   * The surface's own node, measured as it mounts.
   *
   * `scrollHeight` rather than the rect, so this is the height the content
   * WANTS — not the height `maxHeight` has already clamped it to, which would
   * make the decision self-confirming.
   */
  const measureSurface = useCallback((node: HTMLDivElement | null) => {
    surfaceRef.current = node;
    setSurfaceHeight(node ? node.scrollHeight : 0);
    setSurfaceWidth(node ? node.offsetWidth : 0);
  }, []);

  /*
   * Below the trigger unless it does not fit there.
   *
   * The surface used to be pinned under the trigger unconditionally, with
   * `maxHeight` absorbing whatever was left — so a trigger near the foot of the
   * window opened a menu a few pixels tall that scrolled internally. That is
   * where the product media tiles are: the variant cards are the last section
   * on Step 4, and their menus have five items.
   *
   * Flipping only when there is genuinely MORE room above avoids trading a
   * cramped menu for an equally cramped one on a short window.
   */
  const roomBelow = rect ? window.innerHeight - rect.bottom : 0;
  const placement =
    rect && surfaceHeight + GUTTER * 2 > roomBelow && rect.top > roomBelow ? 'above' : 'below';

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
      <span ref={anchorRef} id={anchorId} className={anchorClassName}>
        {anchored}
      </span>
      {open &&
        rect &&
        createPortal(
          <div
            ref={measureSurface}
            role="dialog"
            aria-label={label}
            id={id}
            style={{
              position: 'fixed',
              // Anchored by the edge nearest the trigger in both directions, so
              // the surface grows AWAY from it rather than drifting off it —
              // the same reasoning as the `right` alignment below.
              ...(placement === 'above'
                ? {
                    bottom: window.innerHeight - rect.top + GUTTER,
                    maxHeight: `${Math.max(0, rect.top - GUTTER * 2)}px`,
                  }
                : {
                    top: rect.bottom + GUTTER,
                    maxHeight: `calc(100vh - ${rect.bottom + GUTTER * 2}px)`,
                  }),
              /*
               * Aligning by `right` keeps the surface pinned to the trigger's
               * right edge as it grows, which is what an end-aligned menu
               * wants — but only up to the point where the OPPOSITE edge would
               * leave the window. Both alignments are clamped to keep the whole
               * surface on screen, since a menu you can only partly read is the
               * problem this component exists to avoid.
               */
              ...(align === 'end'
                ? {
                    right: Math.min(
                      Math.max(GUTTER, window.innerWidth - rect.right),
                      Math.max(GUTTER, window.innerWidth - surfaceWidth - GUTTER),
                    ),
                  }
                : {
                    left: Math.min(
                      Math.max(GUTTER, rect.left),
                      Math.max(GUTTER, window.innerWidth - surfaceWidth - GUTTER),
                    ),
                  }),
            }}
            className={cn(
              'z-(--z-dropdown) overflow-auto rounded-lg border border-rule bg-sheet shadow-overlay',
              className,
            )}
          >
            {typeof children === 'function' ? children(closeFromContent) : children}
          </div>,
          document.body,
        )}
    </>
  );
}
