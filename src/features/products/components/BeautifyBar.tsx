import { useState } from 'react';
import { Sparkles, Check, Trash2, AlertTriangle } from 'lucide-react';
import { Button, Input } from '@/src/components/controls';
import { Text } from '@/src/components/data';
import { cn } from '@/src/design-system/utils/cn';
import type { BeautifyMode } from '@/src/api/beautify';
import { slotKey, type BeautifySlot, type SlotState } from '../hooks/useBeautify';

/**
 * The control that starts a beautify run, and the bar that ends one.
 *
 * Two pieces of one decision, so they live in one file: what the operator sets
 * before spending money, and what they choose after seeing the result.
 */

interface StartProps {
  /** How many images this run would produce. */
  imageCount: number;
  /** USD, estimated from the per-job model prices. */
  estimatedCost: number;
  disabled: boolean;
  onRun: (mode: BeautifyMode, modelDescription: string) => void;
}

const EXAMPLE = 'young Bangladeshi woman, mid-20s, natural makeup';

/**
 * With Model needs a description; Without Model does not.
 *
 * There is no gender field on a product and the category tree is editable, so
 * inferring one would break silently the day somebody renamed a category. The
 * admin types it instead — which is also the only way to say "a boy of about
 * eight" for a children's line.
 *
 * The button stays disabled while the box is empty rather than falling back to
 * a generic model. A silent default would defeat the point of asking.
 */
export function BeautifyStart({ imageCount, estimatedCost, disabled, onRun }: StartProps) {
  const [description, setDescription] = useState('');
  const canModel = description.trim().length > 0;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-rule bg-sheet-2 p-3">
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-brass" aria-hidden="true" />
          <Text as="p" variant="label">
            Studio images
          </Text>
        </div>
        {/* The price BEFORE the click, not after. Every press of these buttons
            spends money, and an operator should never learn the amount from
            an invoice. */}
        <Text variant="caption">
          {imageCount} {imageCount === 1 ? 'image' : 'images'} · about $
          {estimatedCost.toFixed(2)}
        </Text>
      </div>

      <Text variant="caption">
        Re-renders the front and back on a plain white background. The back is
        never put on a model.
      </Text>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Input
            label="Describe the model"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={EXAMPLE}
            maxLength={300}
            disabled={disabled}
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="primary"
            size="md"
            disabled={disabled || !canModel}
            onClick={() => onRun('with_model', description.trim())}
          >
            With model
          </Button>
          <Button
            variant="secondary"
            size="md"
            disabled={disabled}
            onClick={() => onRun('without_model', '')}
          >
            Without model
          </Button>
        </div>
      </div>
    </div>
  );
}

interface StripProps {
  slots: BeautifySlot[];
  states: Record<string, SlotState>;
}

/**
 * THE RUN, WATCHABLE WITHOUT SCROLLING.
 *
 * The buttons sit above the tiles they act on. On anything shorter than a
 * desktop monitor — and on every variant product, where the tiles are spread
 * down a long page inside variation cards — pressing the button scrolled the
 * effect out of sight, so the honest report was "it does nothing".
 *
 * This is the whole run in one strip, directly under the button: every front
 * and back being worked on, each with its own sheen, in the place the operator
 * is already looking. It wraps rather than scrolls sideways, because a strip
 * you have to drag is the same problem one step smaller.
 *
 * The full-size tiles keep their own overlays. This does not replace them — it
 * answers "is anything happening", which is the question at the moment of the
 * click. The tiles answer "is this one any good", which is the question after.
 */
export function BeautifyStrip({ slots, states }: StripProps) {
  if (slots.length === 0) return null;
  const anyActive = slots.some((s) => {
    const st = states[slotKey(s.variationId, s.side)];
    return st && st.status !== 'idle';
  });
  if (!anyActive) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {slots.map((slot) => {
        const state = states[slotKey(slot.variationId, slot.side)];
        const ready = state?.status === 'ready' ? state.job.previewUrl : undefined;
        return (
          <figure key={slotKey(slot.variationId, slot.side)} className="w-[4.5rem]">
            <div className="relative aspect-square overflow-hidden rounded-lg border border-rule bg-sheet-2">
              {(ready ?? slot.thumbUrl) && (
                <img
                  src={ready ?? slot.thumbUrl}
                  alt=""
                  className={cn(
                    'absolute inset-0 h-full w-full object-cover',
                    ready && 'animate-fade-in',
                    state?.status === 'queued' && 'opacity-60',
                  )}
                />
              )}

              {state?.status === 'working' && (
                <div
                  aria-hidden="true"
                  className="beautify-sheen pointer-events-none absolute inset-0"
                />
              )}

              {state?.status === 'failed' && (
                <div className="absolute inset-0 flex items-center justify-center bg-sheet-inverse/70">
                  <AlertTriangle className="h-4 w-4 text-bad" aria-hidden="true" />
                </div>
              )}

              {state?.status === 'ready' && (
                <span className="absolute bottom-0.5 right-0.5 rounded bg-ok px-1 text-2xs font-semibold text-ink-inverse">
                  ✓
                </span>
              )}
            </div>
            {/* The caption is what carries the state under prefers-reduced-motion,
                where the sheen is flattened to nothing. */}
            <figcaption className="mt-1 truncate text-2xs text-ink-3" title={slot.label}>
              {state?.status === 'working'
                ? 'Beautifying…'
                : state?.status === 'queued'
                  ? 'In line'
                  : slot.label}
            </figcaption>
          </figure>
        );
      })}
    </div>
  );
}

interface ReviewProps {
  done: number;
  total: number;
  readyCount: number;
  busy: boolean;
  onApply: () => void;
  onDiscard: () => void;
}

/**
 * One decision for the run, not one per tile.
 *
 * Twelve separate approvals would be twelve chances to lose track. Each tile
 * still carries its own Redo, so the granularity is there where it is useful —
 * rejecting one image — without making acceptance a chore.
 *
 * Sticky, because at 390px the grid is two columns and twelve tiles put this
 * far below the fold. The decision has to be reachable from wherever the
 * operator stopped scrolling.
 */
export function BeautifyReview({
  done,
  total,
  readyCount,
  busy,
  onApply,
  onDiscard,
}: ReviewProps) {
  if (total === 0) return null;
  const finished = done >= total;

  return (
    <div
      className={cn(
        'sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center justify-between gap-3',
        'rounded-xl border border-rule bg-sheet px-3 py-2.5 shadow-lg',
      )}
    >
      <div className="flex flex-col">
        {/*
          ONE live region for the whole run. Announcing each of twelve tiles
          as it lands would talk over everything else a screen reader user is
          doing, so this is the running total and nothing else is polite.
        */}
        <span aria-live="polite" className="text-sm font-medium text-ink">
          {finished ? `${readyCount} of ${total} ready` : `${done} of ${total} ready`}
        </span>
        {finished && readyCount > 0 && (
          // Said out loud because it is the thing that makes Apply safe to
          // press, and an operator who does not know it will hesitate.
          <Text variant="caption">Originals are kept.</Text>
        )}
      </div>

      <div className="flex gap-2">
        <Button variant="ghost" size="md" onClick={onDiscard} disabled={busy}>
          <Trash2 className="mr-1.5 h-4 w-4" aria-hidden="true" />
          Discard
        </Button>
        <Button
          variant="primary"
          size="md"
          onClick={onApply}
          disabled={busy || readyCount === 0}
        >
          <Check className="mr-1.5 h-4 w-4" aria-hidden="true" />
          Use these
        </Button>
      </div>
    </div>
  );
}
