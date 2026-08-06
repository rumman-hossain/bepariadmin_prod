import { describe, it, expect } from 'vitest';
import { syncSizeSelection, type SizeSyncInput } from '../syncSizeSelection';
import { emptyVariationMedia } from '../../store/useAddProductStore';
import type { ProductVariation, VariationMediaState } from '../../../types/registration';

function input(overrides: Partial<SizeSyncInput> = {}): SizeSyncInput {
  return {
    selectedSizes: [],
    sizeStockSet: {},
    moqSet: {},
    sizeLowStockAlertSet: {},
    stock: '',
    moq: '',
    lowStockAlert: '',
    hasVariant: false,
    variations: [],
    ...overrides,
  };
}

function variation(overrides: Partial<ProductVariation> = {}): ProductVariation {
  return {
    id: 'v1',
    color: 'Navy',
    design: 'Plain',
    subName: 'Navy Plain',
    subSku: 'SKU-V01',
    seq: 1,
    displayLabel: 'Navy / Plain',
    stock: 0,
    media: emptyVariationMedia() as VariationMediaState,
    sizeStock: {},
    sizeMoq: {},
    sizeAlert: {},
    inventory: [],
    moq: 0,
    lowStockAlert: 0,
    ...overrides,
  };
}

describe('syncSizeSelection', () => {
  it('does nothing while no sizes are selected', () => {
    // Guard against wiping per-size data during the moment between clearing the
    // selection and picking the replacement.
    expect(syncSizeSelection(input({ sizeStockSet: { M: '5' } }))).toEqual({});
  });

  it('returns an empty patch when nothing changed', () => {
    // An empty patch is what stops the caller writing state and re-rendering.
    const patch = syncSizeSelection(
      input({ selectedSizes: ['M'], sizeStockSet: { M: '5' }, moqSet: { M: '2' } }),
    );
    expect(patch).toEqual({});
  });

  it('drops overrides for a size that is no longer selected', () => {
    const patch = syncSizeSelection(
      input({
        selectedSizes: ['M'],
        sizeStockSet: { M: '5', L: '9' },
        moqSet: { M: '2', L: '3' },
        sizeLowStockAlertSet: { L: '1' },
      }),
    );

    expect(patch.sizeStockSet).toEqual({ M: '5' });
    expect(patch.moqSet).toEqual({ M: '2' });
    expect(patch.sizeLowStockAlertSet).toEqual({});
  });

  it('leaves a map alone when every one of its sizes survives', () => {
    const patch = syncSizeSelection(
      input({ selectedSizes: ['M', 'L'], sizeStockSet: { M: '5' }, moqSet: { L: '9', S: '1' } }),
    );
    expect(patch.sizeStockSet).toBeUndefined();
    expect(patch.moqSet).toEqual({ L: '9' });
  });

  it('omits the variations key entirely when no variation needed changing', () => {
    // Not just "the same contents" — the key must be absent, or the caller
    // writes `variations` on every size render and re-renders the whole list.
    const patch = syncSizeSelection(
      input({
        selectedSizes: ['M'],
        hasVariant: true,
        variations: [variation({ inventory: [{ size: 'M', stock: 4, moq: 1, lowStockAlert: 2 }] })],
      }),
    );
    expect(patch).not.toHaveProperty('variations');
  });

  it('ignores variations when the product has none', () => {
    const patch = syncSizeSelection(
      input({ selectedSizes: ['M'], hasVariant: false, variations: [variation()] }),
    );
    expect(patch.variations).toBeUndefined();
  });

  it('seeds a row on every variation for a newly selected size', () => {
    const patch = syncSizeSelection(
      input({
        selectedSizes: ['M', 'L'],
        hasVariant: true,
        variations: [variation({ inventory: [{ size: 'M', stock: 4, moq: 1, lowStockAlert: 2 }] })],
      }),
    );

    expect(patch.variations![0]!.inventory).toEqual([
      { size: 'M', stock: 4, moq: 1, lowStockAlert: 2 },
      { size: 'L', stock: 0, moq: 1, lowStockAlert: 5 },
    ]);
  });

  it('removes variation rows for a deselected size', () => {
    const patch = syncSizeSelection(
      input({
        selectedSizes: ['M'],
        hasVariant: true,
        variations: [
          variation({
            inventory: [
              { size: 'M', stock: 4, moq: 1, lowStockAlert: 2 },
              { size: 'XL', stock: 7, moq: 1, lowStockAlert: 2 },
            ],
          }),
        ],
      }),
    );

    expect(patch.variations![0]!.inventory!.map((i) => i.size)).toEqual(['M']);
  });

  it('orders rows by the operator’s size order, not alphabetically', () => {
    // S/M/L/XL is meaningful; sorted alphabetically it reads L, M, S, XL.
    const patch = syncSizeSelection(
      input({
        selectedSizes: ['S', 'M', 'L', 'XL'],
        hasVariant: true,
        variations: [variation({ inventory: [{ size: 'XL', stock: 1, moq: 1, lowStockAlert: 1 }] })],
      }),
    );

    expect(patch.variations![0]!.inventory!.map((i) => i.size)).toEqual(['S', 'M', 'L', 'XL']);
  });

  it('inherits the product figures for a single-size product', () => {
    const patch = syncSizeSelection(
      input({
        selectedSizes: ['M'],
        stock: '30',
        moq: '6',
        lowStockAlert: '9',
        hasVariant: true,
        variations: [variation()],
      }),
    );

    expect(patch.variations![0]!.inventory).toEqual([
      { size: 'M', stock: 30, moq: 6, lowStockAlert: 9 },
    ]);
  });

  it('starts a new row at zero stock once there are several sizes', () => {
    // With more than one size there is no sensible way to split the single
    // product-wide stock figure between them, so it is not guessed at.
    const patch = syncSizeSelection(
      input({
        selectedSizes: ['M', 'L'],
        stock: '30',
        hasVariant: true,
        variations: [variation()],
      }),
    );

    expect(patch.variations![0]!.inventory!.map((i) => i.stock)).toEqual([0, 0]);
  });

  it('prefers a per-size override when seeding a new row', () => {
    const patch = syncSizeSelection(
      input({
        selectedSizes: ['M', 'L'],
        sizeStockSet: { L: '12' },
        hasVariant: true,
        variations: [variation()],
      }),
    );

    const row = patch.variations![0]!.inventory!.find((i) => i.size === 'L');
    expect(row!.stock).toBe(12);
  });

  it('leaves an already-correct variation object untouched by reference', () => {
    // Reference stability is what keeps the memoised rows from re-rendering.
    const settled = variation({
      id: 'settled',
      inventory: [{ size: 'M', stock: 4, moq: 1, lowStockAlert: 2 }],
    });
    const stale = variation({ id: 'stale', inventory: [] });

    const patch = syncSizeSelection(
      input({ selectedSizes: ['M'], hasVariant: true, variations: [settled, stale] }),
    );

    expect(patch.variations![0]).toBe(settled);
    expect(patch.variations![1]).not.toBe(stale);
  });

  it('does not mutate the state it was given', () => {
    const state = input({
      selectedSizes: ['M'],
      sizeStockSet: { M: '5', L: '9' },
      hasVariant: true,
      variations: [variation({ inventory: [{ size: 'XL', stock: 1, moq: 1, lowStockAlert: 1 }] })],
    });
    const snapshot = JSON.parse(JSON.stringify(state));

    syncSizeSelection(state);

    expect(JSON.parse(JSON.stringify(state))).toEqual(snapshot);
  });
});
