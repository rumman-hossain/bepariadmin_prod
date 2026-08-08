import { describe, it, expect, beforeEach } from 'vitest';
import { validateWizardStep } from '../add-product/utils/validateWizardStep';
import { useAddProductStore } from '../add-product/store/useAddProductStore';

/**
 * RESET → STEP 6 → UPDATE MUST NOT PATCH A LIVE PRODUCT TO EMPTY.
 *
 * The sequence an operator can perform today, on a real product:
 *
 *   1. open /products/<id>/edit
 *   2. press Reset, confirm
 *   3. click step 6 in the step bar
 *   4. press Update Listing
 *
 * Every one of those is a normal thing to do, and together they issue a PATCH
 * with `name:''`, `basePrice:0`, `media:[]`. Three separate defects line up:
 *
 *   - `confirmReset` empties the store, but the hydrate effect keys on
 *     `[routeProductId]`, so nothing re-loads and `editingProductId` stays set;
 *   - edit mode marks EVERY step `done`, so step 6 is one click from anywhere;
 *   - step 6's validator was `() => ({ isValid: true })`, so nothing between
 *     the empty form and the request ever objected.
 *
 * This file pins the third, which is the structural one: with step 6 actually
 * validating, no emptied form can reach submit regardless of how it got emptied
 * or which step bar let it through.
 */

const store = () => useAddProductStore.getState();

beforeEach(() => store().reset());

describe('step 6 is not a free pass', () => {
  it('refuses an emptied form', () => {
    // Exactly what `reset()` leaves behind.
    const result = validateWizardStep(6, store());

    expect(result.isValid).toBe(false);
  });

  it('names the step the operator has to go back to', () => {
    const result = validateWizardStep(6, store());

    // "Invalid" alone would leave them clicking through six steps to find it.
    const text = Object.values(result.errors).join(' ');
    expect(text).toMatch(/step 1/i);
  });

  it('passes a form that is actually complete', () => {
    // The guard has to let real work through, or it is just a wall.
    useAddProductStore.setState({
      name: 'Cotton Panjabi',
      brandName: 'QA Brand',
      categoryId: 'c1',
      subCategoryId: 's1',
      productGroupId: 'g1',
      classificationId: 'cl1',
      sku: 'WHL-00001-GT-TS-TS-001',
      wholesalerId: 'w1',
      unitType: 'Piece',
      basePrice: '250',
      dispatchTime: '2 Day',
      hasVariant: false,
      selectedSizes: ['M'],
      sizeStockSet: { M: '40' },
      moqSet: { M: '5' },
      sizeLowStockAlertSet: { M: '3' },
      productMedia: {
        ...store().productMedia,
        poster: { localUri: 'blob:x', uploadedUrl: 'https://x/a.jpg', uploadStatus: 'done' },
      },
    });

    const result = validateWizardStep(6, useAddProductStore.getState());
    expect(result.errors).toEqual({});
    expect(result.isValid).toBe(true);
  });
});
