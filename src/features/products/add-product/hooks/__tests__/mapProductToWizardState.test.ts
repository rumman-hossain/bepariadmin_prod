import { describe, it, expect } from 'vitest';
import { mapProductToWizardState } from '../useProductFormLifecycle';
import { validateWizardStep } from '../../utils/validateWizardStep';
import { useAddProductStore } from '../../store/useAddProductStore';
import type { Product } from '@/src/features/products/types';

/**
 * OPENING AN EXISTING PRODUCT FOR EDIT MUST NOT DEMAND WHAT IT ALREADY HAS.
 *
 * The server sends each variation's per-size figures as `inventory[]`. The
 * wizard edits them through `sizeStock`/`sizeMoq`/`sizeAlert`, and those are
 * what `isVariationStocked` reads — so hydrating without filling them left
 * every cell "unfilled" to the validator.
 *
 * The screen made that unreadable rather than merely wrong: StockMatrix falls
 * back to `inventory[]` for DISPLAY, so the grid showed 50 in every cell while
 * marking each one red with "Stock required" and reporting "4 cells to fill".
 * Editing any existing sized variant product meant retyping figures that were
 * already on screen.
 *
 * Found by opening a real product on dev. No unit test caught it because every
 * other wizard test builds state directly rather than arriving at it the way an
 * operator does — which is why this file tests the mapper itself.
 */

const serverProduct = (): Product =>
  ({
    id: 'p1',
    name: 'Hdhdhd',
    sku: 'WHL-00001-GT-PU-PU-055',
    basePrice: 258,
    hasVariant: true,
    availableSizes: ['S', 'M'],
    variations: [
      {
        id: 'v1',
        color: 'Red',
        price: 260,
        inventory: [
          { size: 'S', stock: 50, moq: 5, lowStockAlert: 3 },
          { size: 'M', stock: 50, moq: 5, lowStockAlert: 3 },
        ],
      },
    ],
  }) as unknown as Product;

describe('hydrating a product for edit', () => {
  it('fills the per-size maps the validator reads', () => {
    const state = mapProductToWizardState(serverProduct());
    const v = state.variations![0];

    expect(v.sizeStock).toEqual({ S: '50', M: '50' });
    expect(v.sizeMoq).toEqual({ S: '5', M: '5' });
    expect(v.sizeAlert).toEqual({ S: '3', M: '3' });
  });

  it('lands on a state step 3 already accepts', () => {
    // The operator has changed nothing; the product was valid when it was
    // saved, so re-opening it must not report faults.
    const hydrated = { ...useAddProductStore.getState(), ...mapProductToWizardState(serverProduct()) };
    const result = validateWizardStep(3, hydrated);

    expect(result.errors.variations).toBeUndefined();
    expect(result.variationIssues).toBeUndefined();
  });

  it('leaves a variation with no server rows alone', () => {
    const p = serverProduct();
    (p.variations as unknown as Array<{ inventory: unknown[] }>)[0].inventory = [];
    const v = mapProductToWizardState(p).variations![0];

    expect(v.sizeStock).toBeUndefined();
  });
});
