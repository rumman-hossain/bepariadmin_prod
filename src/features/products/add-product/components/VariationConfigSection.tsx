import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/src/components/controls';
import { Dialog, DialogFooter } from '@/src/components/feedback';
import { Input } from '@/src/components/controls';
import { Money, Text } from '@/src/components/data';
import { cn } from '@/src/design-system/utils/cn';
import { useAddProductStore } from '../store/useAddProductStore';
import type { VariationIssue } from '../utils/validateWizardStep';
import type { ProductVariation } from '../../types/registration';

interface Props {
  onGenerate: () => void;
  platformMargin: number;
  errorMessage?: string;
  /** Per-variation faults, so the manager can mark the offending row. */
  issues?: VariationIssue[];
}

function ChipList({
  label,
  items,
  input,
  onInputChange,
  onAdd,
  onRemove,
}: {
  label: string;
  items: string[];
  input: string;
  onInputChange: (v: string) => void;
  onAdd: () => void;
  onRemove: (idx: number) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-ink">{label}</p>
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder={`Add ${label.toLowerCase()}…`}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onAdd();
            }
          }}
        />
        <Button type="button" variant="outline" iconLeft={Plus} onClick={onAdd} className="shrink-0">
          Add
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((item, idx) => (
          <span
            key={`${item}-${idx}`}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sheet-2 text-sm border border-rule"
          >
            {item}
            <button type="button" onClick={() => onRemove(idx)} aria-label={`Remove ${item}`}>
              <X className="w-3.5 h-3.5 text-ink-3" />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}

export function VariationConfigSection({ onGenerate, platformMargin, errorMessage, issues = [] }: Props) {
  const { variationColors, variationDesigns, variations, sku, basePrice, selectedSizes, setField } =
    useAddProductStore();
  const [colorInput, setColorInput] = useState('');
  const [designInput, setDesignInput] = useState('');
  const [managerOpen, setManagerOpen] = useState(false);
  const [alert, setAlert] = useState('');

  const addColor = () => {
    const val = colorInput.trim();
    if (!val) return;
    if (variationColors.includes(val) || variationDesigns.includes(val)) {
      setAlert('Color already used or conflicts with a design');
      return;
    }
    if (variationColors.length >= 5) {
      setAlert('Maximum 5 colors allowed');
      return;
    }
    setField('variationColors', [...variationColors, val]);
    setColorInput('');
    setAlert('');
  };

  const addDesign = () => {
    const val = designInput.trim();
    if (!val) return;
    if (variationDesigns.includes(val) || variationColors.includes(val)) {
      setAlert('Design already used or conflicts with a color');
      return;
    }
    if (variationDesigns.length >= 5) {
      setAlert('Maximum 5 designs allowed');
      return;
    }
    setField('variationDesigns', [...variationDesigns, val]);
    setDesignInput('');
    setAlert('');
  };

  const handleGenerateClick = () => {
    if (!sku?.trim()) {
      setAlert('Complete steps 1–2 and generate SKU first');
      return;
    }
    if (variationColors.length === 0 && variationDesigns.length === 0) {
      setAlert('Add at least one color or design');
      return;
    }
    onGenerate();
    setManagerOpen(true);
    setAlert('');
  };

  const updateVariation = (index: number, updates: Partial<ProductVariation>) => {
    const next = [...variations];
    next[index] = { ...next[index], ...updates };
    setField('variations', next);
  };

  /** The validator's complaint about one variation's whole-variation field. */
  const fieldIssue = (variationId: string, field: VariationIssue['field']) =>
    issues.find((i) => i.variationId === variationId && !i.size && i.field === field)?.message;

  /** True when this variation has anything wrong with it, in any field. */
  const rowHasIssue = (variationId: string) =>
    issues.some((i) => i.variationId === variationId);

  /*
   * Once the product has sizes, `isVariationStocked` reads the per-size maps and
   * never looks at these three. The operator could fill Stock and MOQ for every
   * variation and watch the error count refuse to move, with nothing on screen
   * saying the figures they were entering did not count.
   */
  const sizedHint =
    selectedSizes.length > 0 ? 'Per-size figures below override this' : undefined;

  const base = parseFloat(basePrice) || 0;
  const calcRetail = (price?: number) => {
    const b = price ?? base;
    return b > 0 ? (b * (1 + platformMargin / 100)).toFixed(2) : '0';
  };

  return (
    <div className="space-y-4">
      <ChipList
        label="Colors"
        items={variationColors}
        input={colorInput}
        onInputChange={setColorInput}
        onAdd={addColor}
        onRemove={(idx) => setField('variationColors', variationColors.filter((_, i) => i !== idx))}
      />
      <ChipList
        label="Designs"
        items={variationDesigns}
        input={designInput}
        onInputChange={setDesignInput}
        onAdd={addDesign}
        onRemove={(idx) => setField('variationDesigns', variationDesigns.filter((_, i) => i !== idx))}
      />

      {/*
        BOTH, not one masking the other.
        
        This rendered `{alert || errorMessage}`. `alert` is this component's own
        imperative message — "Add at least one color or design", "Maximum 5
        colors allowed" — set on a button press and cleared only by the next
        successful add or generate. While it was set it HID the validator's
        message entirely, so an operator who had once pressed Generate too early
        could not see why step 3 was still refusing them.
      */}
      {alert && <Text as="p" variant="error">{alert}</Text>}
      {errorMessage && <Text as="p" variant="error">{errorMessage}</Text>}

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={handleGenerateClick}>
          Generate / Sync Variations
        </Button>
        {variations.length > 0 && (
          <Button type="button" variant="outline" onClick={() => setManagerOpen(true)}>
            Manage {variations.length} variation(s)
          </Button>
        )}
      </div>

      {/*
        `title` and `footer`, not a hand-rolled body.

        Dialog gates its header row — heading, subtitle, close button — on
        `title || subtitle`, and wires aria-labelledby to the title it renders.
        With a bare <h3> in the body this had no accessible name and no way to
        close it but the one button at the bottom. It also set its own
        `max-h-[70vh] overflow-y-auto` INSIDE Dialog's already-scrolling body,
        so a long variation list had two nested scrollers fighting each other.
      */}
      <Dialog
        open={managerOpen}
        onClose={() => setManagerOpen(false)}
        size="lg"
        title="Variation Manager"
        subtitle={
          selectedSizes.length > 0
            ? 'Per-size stock is set in the grid below this panel.'
            : undefined
        }
        footer={
          <DialogFooter>
            <Button onClick={() => setManagerOpen(false)}>Done</Button>
          </DialogFooter>
        }
      >
        <div className="space-y-4">
          {variations.length === 0 ? (
            <Text as="p" variant="secondary">No variations yet. Generate from colors/designs above.</Text>
          ) : (
            <div className="space-y-3">
              {variations.map((v, idx) => (
                <div
                  key={v.id ?? idx}
                  className={cn(
                    'p-3 rounded-xl border space-y-2',
                    // Marked on the ROW as well as the field, so a manager with
                    // a dozen colours in it can be scanned rather than read.
                    rowHasIssue(v.id) ? 'border-bad-border bg-bad-wash' : 'border-rule',
                  )}
                >
                  <div className="flex justify-between gap-2">
                    <div>
                      <p className="font-semibold text-sm">{v.displayLabel || v.subName}</p>
                      <Text as="p" variant="caption">{v.subSku}</Text>
                    </div>
                    <Money amount={calcRetail(v.price)} className="text-sm font-semibold" />
                  </div>
                  {/*
                    FOUR fields, and responsive.

                    The low-stock alert had no control anywhere in the console,
                    while `isVariationStocked` requires it above 0 for a variant
                    product with no sizes — a required field nothing could write,
                    which is the same shape as the two blockers before it. The
                    wholesale app has had this input all along.

                    `grid-cols-3` was unconditional, so three number inputs sat
                    at a third of the panel each on a phone; four would have been
                    unusable. Two columns until there is room for four.
                  */}
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <Input
                      label="Base Price"
                      type="number"
                      value={v.price != null ? String(v.price) : ''}
                      onChange={(e) => updateVariation(idx, { price: Number(e.target.value) || undefined })}
                      error={fieldIssue(v.id, 'price')}
                    />
                    <Input
                      label="Stock"
                      type="number"
                      value={v.stock != null ? String(v.stock) : ''}
                      onChange={(e) => updateVariation(idx, { stock: Number(e.target.value) || 0 })}
                      error={fieldIssue(v.id, 'stock')}
                      hint={sizedHint}
                    />
                    <Input
                      label="MOQ"
                      type="number"
                      value={v.moq != null ? String(v.moq) : ''}
                      onChange={(e) => updateVariation(idx, { moq: Number(e.target.value) || 1 })}
                      error={fieldIssue(v.id, 'moq')}
                      hint={sizedHint}
                    />
                    <Input
                      label="Low-stock alert"
                      type="number"
                      value={v.lowStockAlert != null ? String(v.lowStockAlert) : ''}
                      onChange={(e) =>
                        updateVariation(idx, { lowStockAlert: Number(e.target.value) || 0 })
                      }
                      error={fieldIssue(v.id, 'lowStockAlert')}
                      hint={sizedHint}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Dialog>
    </div>
  );
}
