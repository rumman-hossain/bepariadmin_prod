/**
 * Stock, MOQ and low-stock alert — the whole per-size grid in one place.
 *
 * WHY A GRID
 *
 * This is an apparel wholesale catalogue, so a product is not one number. Stock
 * lives per colour × size: three colours across four sizes is twelve figures a
 * supplier has to get right, and previously they were entered a step at a time
 * with nothing showing the shape of what was being filled in. A product could
 * be "in stock" overall and empty in the two sizes people actually buy, and
 * nothing on screen said so.
 *
 * WHY A MODE SWITCH RATHER THAN THREE NUMBERS PER CELL
 *
 * Every cell carries three: `sizeStockSet`, `moqSet` and `sizeLowStockAlertSet`
 * are parallel maps, and each variation repeats them in its own `inventory`.
 * Stacking all three would make a 12-size footwear range unreadable, so one is
 * edited at a time and the other two are shown small underneath — visible, but
 * not competing for the same space.
 *
 * A "FREE SIZE" PRODUCT IS NOT A ONE-COLUMN GRID
 *
 * `sizeConfig.type === 'UNIQUE'` yields exactly one size. Rendering a table
 * with a single column and a totals row for it is ceremony around one number,
 * so that case degrades to a plain row per colour.
 */
import { useMemo, useState } from 'react';
import { Text } from '@/src/components/data';
import { cn } from '@/src/design-system/utils/cn';
import { useAddProductStore } from '../store/useAddProductStore';
import { resolveHasVariant } from '../utils/resolveHasVariant';
import type { ProductInventoryItem } from '../../types/registration';

type Measure = 'stock' | 'moq' | 'lowStockAlert';

const MEASURE_LABEL: Record<Measure, string> = {
  stock: 'Stock',
  moq: 'MOQ',
  lowStockAlert: 'Low-stock alert',
};

/** The store map that backs each measure for a NON-variant product. */
const MAP_FOR: Record<Measure, 'sizeStockSet' | 'moqSet' | 'sizeLowStockAlertSet'> = {
  stock: 'sizeStockSet',
  moq: 'moqSet',
  lowStockAlert: 'sizeLowStockAlertSet',
};

const OTHERS: Record<Measure, Measure[]> = {
  stock: ['moq', 'lowStockAlert'],
  moq: ['stock', 'lowStockAlert'],
  lowStockAlert: ['stock', 'moq'],
};

function emptyRow(size: string): ProductInventoryItem {
  return { size, stock: 0, moq: 1, lowStockAlert: 0 };
}

export function StockMatrix() {
  const store = useAddProductStore();
  const {
    selectedSizes,
    variations,
    hasVariant: hasVariantRaw,
    // Read through `store[MAP_FOR[m]]` rather than destructured, because the
    // measure decides which map. Named here only so the memos below can depend
    // on the one that feeds every total.
    sizeStockSet,
    stockedOutSizes,
    setField,
    updateVariation,
  } = store;

  const [measure, setMeasure] = useState<Measure>('stock');
  const hasVariant = resolveHasVariant(hasVariantRaw, variations);

  const sizes = selectedSizes;
  const isFreeSize = sizes.length === 1 && sizes[0]?.toLowerCase() === 'free size';

  // ── Reading and writing one cell ────────────────────────────────
  //
  // Two backing stores behind one interface: a variant product keeps figures on
  // each variation's `inventory`, a plain one keeps them in the three maps.
  // Everything below this line works in cells, not in whichever it happens
  // to be.

  const readCell = (variationId: string | null, size: string, m: Measure): number => {
    if (variationId) {
      const v = variations.find((x) => x.id === variationId);
      const row = v?.inventory?.find((i) => i.size === size);
      return row ? row[m] : 0;
    }
    return Number(store[MAP_FOR[m]][size] ?? '') || 0;
  };

  const writeCell = (variationId: string | null, size: string, m: Measure, raw: string) => {
    // Negative stock is not a state the catalogue can be in, and a blank field
    // means zero rather than NaN.
    const value = Math.max(0, Number.parseInt(raw, 10) || 0);

    if (variationId) {
      updateVariation(variationId, (v) => {
        const inventory = v.inventory ? [...v.inventory] : [];
        const at = inventory.findIndex((i) => i.size === size);
        if (at === -1) inventory.push({ ...emptyRow(size), [m]: value });
        else inventory[at] = { ...inventory[at], [m]: value };
        return { ...v, inventory };
      });
      return;
    }

    setField(MAP_FOR[m], { ...store[MAP_FOR[m]], [size]: String(value) });
  };

  const rows = hasVariant
    ? variations.map((v) => ({
        id: v.id,
        label: [v.color, v.design].filter(Boolean).join(' · ') || v.subName || 'Variant',
        sku: v.subSku,
      }))
    : [{ id: null as string | null, label: 'This product', sku: undefined }];

  const columnTotals = useMemo(
    () => sizes.map((size) => rows.reduce((sum, r) => sum + readCell(r.id, size, 'stock'), 0)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sizes, rows, variations, sizeStockSet],
  );

  const grandTotal = columnTotals.reduce((a, b) => a + b, 0);

  const emptyCells = useMemo(
    () =>
      rows.reduce(
        (n, r) =>
          n +
          sizes.filter((s) => !stockedOutSizes.includes(s) && readCell(r.id, s, 'stock') === 0)
            .length,
        0,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, sizes, stockedOutSizes, variations, sizeStockSet],
  );

  const toggleStockedOut = (size: string) => {
    setField(
      'stockedOutSizes',
      stockedOutSizes.includes(size)
        ? stockedOutSizes.filter((s) => s !== size)
        : [...stockedOutSizes, size],
    );
  };

  if (sizes.length === 0) {
    return (
      <Text as="p" variant="secondary">
        Choose the sizes this product comes in, and the stock grid appears here.
      </Text>
    );
  }

  const cellInput = (variationId: string | null, size: string) => {
    const out = stockedOutSizes.includes(size);
    const value = readCell(variationId, size, measure);
    const zeroStock = measure === 'stock' && value === 0 && !out;

    return (
      <div className="flex flex-col items-center gap-0.5">
        <input
          type="number"
          min={0}
          inputMode="numeric"
          disabled={out}
          value={String(value)}
          onChange={(e) => writeCell(variationId, size, measure, e.target.value)}
          aria-label={`${MEASURE_LABEL[measure]} for ${size}`}
          className={cn(
            'w-16 rounded-sm border px-1.5 py-1 text-center text-sm tabular-nums',
            'bg-sheet text-ink focus-visible:border-brass',
            out
              ? 'border-rule bg-sheet-2 text-ink-4'
              : zeroStock
                ? 'border-bad-border bg-bad-wash text-bad'
                : 'border-rule-input',
          )}
        />
        {/* The other two measures, small — present, not competing. */}
        <span className="text-2xs text-ink-3 tabular-nums">
          {OTHERS[measure].map((m) => readCell(variationId, size, m)).join(' · ')}
        </span>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div
          role="group"
          aria-label="Which figure to edit"
          className="inline-flex gap-0.5 rounded-md border border-rule bg-sheet-2 p-0.5"
        >
          {(Object.keys(MEASURE_LABEL) as Measure[]).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={measure === m}
              onClick={() => setMeasure(m)}
              className={cn(
                'rounded-sm px-2.5 py-1 text-xs font-medium',
                measure === m
                  ? 'bg-sheet font-semibold text-ink shadow-raised'
                  : 'text-ink-2 hover:text-ink',
              )}
            >
              {MEASURE_LABEL[m]}
            </button>
          ))}
        </div>
        <Text variant="caption">
          Editing {MEASURE_LABEL[measure].toLowerCase()} · the other two are shown under each cell
        </Text>
        <span
          className={cn(
            'ml-auto rounded-full border px-2 py-0.5 text-2xs font-semibold',
            emptyCells === 0
              ? 'border-ok-border bg-ok-wash text-ok'
              : 'border-bad-border bg-bad-wash text-bad',
          )}
        >
          {emptyCells === 0
            ? 'Every size stocked'
            : `${emptyCells} empty cell${emptyCells === 1 ? '' : 's'}`}
        </span>
      </div>

      {isFreeSize ? (
        /* One size: a grid would be ceremony around a single number. */
        <ul className="divide-y divide-rule-subtle rounded-md border border-rule">
          {rows.map((r) => (
            <li key={r.id ?? 'single'} className="flex items-center justify-between gap-3 px-3 py-2">
              <span className="min-w-0">
                <span className="block truncate text-sm text-ink">{r.label}</span>
                {r.sku && <span className="block truncate font-mono text-2xs text-ink-2">{r.sku}</span>}
              </span>
              {cellInput(r.id, sizes[0])}
            </li>
          ))}
        </ul>
      ) : (
        /* responsive-table-reviewed: the grid IS the content — a size column
           per size, which is the thing being compared across. Card-stacking it
           would turn a 3×4 matrix into twelve labelled lines and destroy the
           comparison the operator came for. It scrolls horizontally instead,
           with the colour column pinned. */
        <div className="overflow-x-auto rounded-md border border-rule">
          <table className="w-full border-collapse">
            <caption className="sr-only">Stock by colour and size</caption>
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-sheet-2 px-3 py-2 text-left">
                  <Text variant="label">Colour · design</Text>
                </th>
                {sizes.map((size) => (
                  <th key={size} className="bg-sheet-2 px-2 py-2 text-center">
                    <Text variant="label">{size}</Text>
                    <button
                      type="button"
                      aria-pressed={stockedOutSizes.includes(size)}
                      onClick={() => toggleStockedOut(size)}
                      title="Mark this size unavailable. Different from zero: a stock-out is a decision, a zero is stock that ran down."
                      className={cn(
                        'mt-1 block w-full rounded-full border px-1.5 text-2xs',
                        stockedOutSizes.includes(size)
                          ? 'border-bad-border bg-bad-wash font-semibold text-bad'
                          : 'border-rule text-ink-3 hover:text-ink',
                      )}
                    >
                      {stockedOutSizes.includes(size) ? 'Out' : 'In'}
                    </button>
                  </th>
                ))}
                <th className="bg-sheet-2 px-3 py-2 text-right">
                  <Text variant="label">Total</Text>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const rowTotal = sizes.reduce((sum, s) => sum + readCell(r.id, s, 'stock'), 0);
                return (
                  <tr key={r.id ?? 'single'} className="border-t border-rule-subtle">
                    <td className="sticky left-0 z-10 border-r border-rule-subtle bg-sheet px-3 py-2">
                      <span className="block truncate text-sm text-ink">{r.label}</span>
                      {r.sku && (
                        <span className="block truncate font-mono text-2xs text-ink-2">{r.sku}</span>
                      )}
                    </td>
                    {sizes.map((size) => (
                      <td key={size} className="px-2 py-2 text-center">
                        {cellInput(r.id, size)}
                      </td>
                    ))}
                    <td
                      className={cn(
                        'px-3 py-2 text-right text-sm font-semibold tabular-nums',
                        rowTotal === 0 ? 'text-bad' : 'text-ink',
                      )}
                    >
                      {rowTotal}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-rule bg-sheet-2">
                <td className="sticky left-0 z-10 bg-sheet-2 px-3 py-2">
                  <Text variant="label">Total</Text>
                </td>
                {columnTotals.map((total, i) => (
                  <td
                    key={sizes[i]}
                    className="px-2 py-2 text-center text-sm font-semibold tabular-nums text-ink"
                  >
                    {total}
                  </td>
                ))}
                <td className="px-3 py-2 text-right text-sm font-semibold tabular-nums text-ink">
                  {grandTotal}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <Text as="p" variant="caption">
        <b className="font-semibold text-ink">“Out” is not the same as zero.</b> A stocked-out size
        is a decision that it is unavailable; a zero is stock that ran down and will be reordered.
        They are stored separately, so the form keeps them apart.
      </Text>
    </div>
  );
}
