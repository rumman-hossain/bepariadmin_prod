import { useState } from 'react';
import { Sparkles, Check, Trash2 } from 'lucide-react';
import { Button, Input } from '@/src/components/controls';
import { Text } from '@/src/components/data';
import { cn } from '@/src/design-system/utils/cn';
import type { BeautifyMode } from '@/src/api/beautify';

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
