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

/**
 * REMOVING THE SIDE SLOTS MUST NOT REMOVE THE IMAGES.
 *
 * `left` and `right` were positions 3 and 4, and every product created before
 * they were dropped still has media there. Hydrate folds anything past position
 * 2 into the gallery — silently losing two images on open would be a worse bug
 * than the slots ever were.
 */
describe('media hydrated from a product that predates the slot change', () => {
  const withMedia = (positions: number[]): Product =>
    ({
      id: 'p1',
      name: 'Old Product',
      sku: 'WHL-1',
      basePrice: 100,
      media: positions.map((position) => ({ url: `img-${position}`, position })),
    }) as unknown as Product;

  it('keeps the old left and right shots as detail images', () => {
    const m = mapProductToWizardState(withMedia([0, 1, 2, 3, 4])).productMedia!;

    expect(m.poster.uploadedUrl).toBe('img-0');
    expect(m.front.uploadedUrl).toBe('img-1');
    expect(m.back.uploadedUrl).toBe('img-2');
    // The two that no longer have a slot of their own.
    expect(m.more.map((s) => s.uploadedUrl)).toEqual(['img-3', 'img-4']);
  });

  it('loses nothing from a product with more images than the new cap', () => {
    // The cap limits ADDING. A product that already carries more must still
    // show all of them, or opening it to edit one field discards the rest.
    const m = mapProductToWizardState(withMedia([0, 1, 2, 3, 4, 5, 6])).productMedia!;
    expect(m.more).toHaveLength(4);
  });
});

/**
 * EDITING A PRODUCT THAT HAS PHOTOGRAPHS MUST NOT ASK FOR PHOTOGRAPHS.
 *
 * Found on dev by opening a real product: three stored images, six empty
 * tiles, and Continue refusing with "Upload at least one product image". The
 * hydrate was correct; `normalizeBackendProduct` had dropped `media` on the way
 * in, so the mapper was handed a product with no media at all.
 *
 * The assertion is on the VALIDATOR as well as the slots, because that is what
 * the operator actually hit: a step that would not let them past.
 */
describe('a product that already has media', () => {
  const withMedia = () =>
    ({
      id: 'p2',
      name: 'Somsher',
      sku: 'WHL-00001-H&-S&-P/-084',
      basePrice: 1000,
      hasVariant: false,
      availableSizes: ['Free Size'],
      sizeType: 'UNIQUE',
      inventory: [{ size: 'Free Size', stock: 100, moq: 24, lowStockAlert: 32 }],
      media: [
        { url: 'https://x/a.jpg', mediaType: 'image', position: 0 },
        { url: 'https://x/b.jpg', mediaType: 'image', position: 1 },
        { url: 'https://x/c.jpg', mediaType: 'image', position: 2 },
      ],
    }) as unknown as Product;

  it('lands each stored image in the slot its position names', () => {
    const m = mapProductToWizardState(withMedia()).productMedia!;
    expect(m.poster.uploadedUrl).toBe('https://x/a.jpg');
    expect(m.front.uploadedUrl).toBe('https://x/b.jpg');
    expect(m.back.uploadedUrl).toBe('https://x/c.jpg');
    expect(m.more).toHaveLength(0);
  });

  it('opens with step 4 already satisfied', () => {
    useAddProductStore.getState().reset();
    useAddProductStore.getState().hydrate(mapProductToWizardState(withMedia()));

    const result = validateWizardStep(4, useAddProductStore.getState());
    expect(result.errors.productMedia).toBeUndefined();
    expect(result.isValid).toBe(true);
  });

  it('does not put a video row into an image slot', () => {
    const p = withMedia() as unknown as { media: Array<Record<string, unknown>> };
    p.media = [{ url: 'https://x/clip.mp4', mediaType: 'video', position: 0 }];

    const m = mapProductToWizardState(p as unknown as Product).productMedia!;
    // The clip reaches the wizard through `videoUrl`. Placed by position it
    // would become the catalogue thumbnail.
    expect(m.poster.uploadedUrl).toBe('');
  });
});

/**
 * `draftId` IS AN UPLOAD DRAFT, NOT THE PRODUCT.
 *
 * Hydrate used to seed it with `p.id`, purely so submit could compute
 * `hasNewMedia = draftId !== editingProductId` — "unchanged" falling out of an
 * inequality. But `uploadSlot` hands the same field to `createDraft` as the
 * draft to append a file to:
 *
 *   POST /api/v1/uploads/drafts?draftId=5e993cca-…  → 404
 *
 * No upload draft carries a product's id, so EVERY image added or replaced
 * during an edit failed. The only product whose photographs could be changed
 * was one that had none. Found on dev by adding a detail shot to a real
 * product — the new readiness banner reported "1 upload failed" immediately,
 * which is how it surfaced at all.
 *
 * An edit has no upload draft until the operator uploads something. That is
 * what null means, and submit now reads it directly.
 */
describe('hydrating does not invent an upload draft', () => {
  it('leaves draftId null for a product being edited', () => {
    const mapped = mapProductToWizardState({ id: 'prod-1', name: 'X' } as unknown as Product);

    expect(mapped.draftId).toBeNull();
    // Specifically NOT the product id: that value gets sent to the uploads API.
    expect(mapped.draftId).not.toBe('prod-1');
  });
});
