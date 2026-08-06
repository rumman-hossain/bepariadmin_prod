import type { ProductVariation } from '../../types/registration';

/** Only the fields the size reconciliation actually reads. */
export interface SizeSyncInput {
  selectedSizes: string[];
  sizeStockSet: Record<string, string>;
  moqSet: Record<string, string>;
  sizeLowStockAlertSet: Record<string, string>;
  stock: string;
  moq: string;
  lowStockAlert: string;
  hasVariant: boolean | null;
  variations: ProductVariation[];
}

/**
 * Fields that changed. Absent keys mean "leave this alone" — the caller writes
 * only what is present, so an unchanged size selection produces no state write
 * and therefore no re-render.
 */
export interface SizeSyncPatch {
  sizeStockSet?: Record<string, string>;
  moqSet?: Record<string, string>;
  sizeLowStockAlertSet?: Record<string, string>;
  variations?: ProductVariation[];
}

/** Drops entries whose size is no longer selected. Returns null if unchanged. */
function pruneToSelected(
  current: Record<string, string>,
  selected: ReadonlySet<string>,
): Record<string, string> | null {
  const surviving = Object.keys(current).filter((size) => selected.has(size));
  if (surviving.length === Object.keys(current).length) return null;
  return Object.fromEntries(surviving.map((size) => [size, current[size]!]));
}

function numberOr(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed !== 0 ? parsed : fallback;
}

/**
 * Reconcile per-size data after the operator changes which sizes a product
 * comes in.
 *
 * Deselecting a size must drop its stock, MOQ and alert overrides — otherwise
 * they linger invisibly and reappear if the size is selected again, which is how
 * a product ends up submitted with stock for a size it no longer sells.
 * Selecting a new size must seed a row on every existing variation, or that
 * variation silently has no inventory for it.
 *
 * This was ~50 lines inside a `useEffect` whose dependency array deliberately
 * omitted four of the values it read, to stop it looping. Pulling the logic out
 * makes that omission unnecessary: the function is pure and its output is
 * compared, not blindly written.
 */
export function syncSizeSelection(state: SizeSyncInput): SizeSyncPatch {
  const { selectedSizes } = state;
  if (selectedSizes.length === 0) return {};

  const selected = new Set(selectedSizes);
  const patch: SizeSyncPatch = {};

  const nextStock = pruneToSelected(state.sizeStockSet, selected);
  if (nextStock) patch.sizeStockSet = nextStock;

  const nextMoq = pruneToSelected(state.moqSet, selected);
  if (nextMoq) patch.moqSet = nextMoq;

  const nextAlert = pruneToSelected(state.sizeLowStockAlertSet, selected);
  if (nextAlert) patch.sizeLowStockAlertSet = nextAlert;

  if (!state.hasVariant || state.variations.length === 0) return patch;

  // Sort by the operator's chosen size order, not alphabetically — S/M/L/XL is
  // meaningful and L-before-M is not.
  const sizeOrder = new Map(selectedSizes.map((size, index) => [size, index]));
  let anyVariationChanged = false;

  const variations = state.variations.map((variation) => {
    const currentInventory = variation.inventory ?? [];
    const present = new Set(currentInventory.map((item) => item.size));
    const kept = currentInventory.filter((item) => selected.has(item.size));
    const added = selectedSizes
      .filter((size) => !present.has(size))
      .map((size) => ({
        size,
        // A single-size product carries its figures at the top level, so a new
        // row inherits them. With several sizes there is no sensible per-size
        // default and it starts at zero.
        stock:
          Number(state.sizeStockSet[size]) ||
          (selectedSizes.length === 1 ? numberOr(state.stock, 0) : 0),
        moq: Number(state.moqSet[size]) || numberOr(state.moq, 1),
        lowStockAlert:
          Number(state.sizeLowStockAlertSet[size]) || numberOr(state.lowStockAlert, 5),
      }));

    if (added.length === 0 && kept.length === currentInventory.length) return variation;

    anyVariationChanged = true;
    const inventory = [...kept, ...added].sort(
      (a, b) => (sizeOrder.get(a.size) ?? 0) - (sizeOrder.get(b.size) ?? 0),
    );
    return { ...variation, inventory };
  });

  if (anyVariationChanged) patch.variations = variations;
  return patch;
}
