import { describe, it, expect } from 'vitest';
import {
  applyMargin,
  buildProductPayload,
  collectProductMedia,
  hasPendingUploads,
  parseIntOr,
  resolveProductInventory,
  resolveVariationInventory,
} from '../buildProductPayload';
import {
  INITIAL_STATE,
  emptyProductMedia,
  emptySlot,
  emptyVariationMedia,
} from '../../store/useAddProductStore';
import type {
  MediaSlot,
  ProductVariation,
  VariationMediaState,
  WizardState,
} from '../../../types/registration';

/** Fixtures are built from the real INITIAL_STATE, so a new field cannot drift. */
function wizard(overrides: Partial<WizardState> = {}): WizardState {
  return { ...INITIAL_STATE, productMedia: emptyProductMedia(), ...overrides };
}

function uploaded(url: string): MediaSlot {
  return { ...emptySlot(), uploadedUrl: url, uploadStatus: 'done' };
}

/** The video slot carries a poster frame, so it needs its own helper. */
function uploadedVideo(url: string): MediaSlot & { thumbnail: string } {
  return { ...uploaded(url), thumbnail: '' };
}

function variation(overrides: Partial<ProductVariation> = {}): ProductVariation {
  return {
    id: 'v1',
    color: 'Navy',
    design: 'Plain',
    subName: 'Shirt - Navy Plain',
    subSku: 'SKU-1-V01',
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

describe('parseIntOr', () => {
  it.each([
    ['', 7, 7],
    [null, 7, 7],
    [undefined, 7, 7],
    ['not a number', 7, 7],
    ['0', 7, 0],
    ['12', 7, 12],
    [3, 7, 3],
  ])('parseIntOr(%o, %i) === %i', (input, fallback, expected) => {
    expect(parseIntOr(input, fallback)).toBe(expected);
  });

  it('keeps a real zero rather than falling back', () => {
    // The distinction the whole inventory transform rests on: an out-of-stock
    // size must submit 0, not the default.
    expect(parseIntOr('0', 5)).toBe(0);
  });
});

describe('applyMargin', () => {
  it('applies a percentage margin to the base price', () => {
    expect(applyMargin(100, 25)).toBe(125);
  });

  it('leaves the price alone at zero margin', () => {
    expect(applyMargin(430, 0)).toBe(430);
  });

  it('supports a negative margin (selling below cost)', () => {
    expect(applyMargin(100, -10)).toBeCloseTo(90);
  });
});

describe('hasPendingUploads', () => {
  it('is false when every slot is idle or done', () => {
    const media = emptyProductMedia();
    media.front = uploaded('https://cdn/front.jpg');
    expect(hasPendingUploads(media)).toBe(false);
  });

  it.each(['front', 'back', 'poster', 'video'] as const)(
    'detects an in-flight upload in the %s slot',
    (key) => {
      const media = emptyProductMedia();
      media[key].uploadStatus = 'uploading';
      expect(hasPendingUploads(media)).toBe(true);
    },
  );

  it('detects an in-flight upload in the additional-images list', () => {
    const media = emptyProductMedia();
    media.more = [uploaded('https://cdn/a.jpg'), { ...emptySlot(), uploadStatus: 'uploading' }];
    expect(hasPendingUploads(media)).toBe(true);
  });
});

describe('collectProductMedia', () => {
  it('numbers positions by slot, not by how many were filled', () => {
    // Skipping the poster must not renumber the front image to 0 — position is
    // the slot's identity, and the storefront orders by it.
    const media = emptyProductMedia();
    media.front = uploaded('https://cdn/front.jpg');
    media.right = uploaded('https://cdn/right.jpg');

    expect(collectProductMedia(media, false)).toEqual([
      { url: 'https://cdn/front.jpg', mediaType: 'image', position: 1 },
      { url: 'https://cdn/right.jpg', mediaType: 'image', position: 4 },
    ]);
  });

  it('orders poster, front, back, left, right, then extras', () => {
    const media = emptyProductMedia();
    media.poster = uploaded('p');
    media.front = uploaded('f');
    media.back = uploaded('b');
    media.left = uploaded('l');
    media.right = uploaded('r');
    media.more = [uploaded('m0'), uploaded('m1')];

    expect(collectProductMedia(media, false).map((m) => m.url)).toEqual([
      'p',
      'f',
      'b',
      'l',
      'r',
      'm0',
      'm1',
    ]);
    expect(collectProductMedia(media, false).map((m) => m.position)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it('sends only the poster when the product has variants', () => {
    // Each variant carries its own imagery; shipping the product shots too
    // would duplicate them under every variant.
    const media = emptyProductMedia();
    media.poster = uploaded('poster');
    media.front = uploaded('front');

    expect(collectProductMedia(media, true)).toEqual([
      { url: 'poster', mediaType: 'image', position: 0 },
    ]);
  });

  it('returns nothing when a variant product has no poster', () => {
    expect(collectProductMedia(emptyProductMedia(), true)).toEqual([]);
  });

  it('never emits an entry for an unfilled slot', () => {
    expect(collectProductMedia(emptyProductMedia(), false)).toEqual([]);
  });
});

describe('resolveProductInventory', () => {
  it('is empty for a product with variants — inventory lives on the variants', () => {
    expect(resolveProductInventory(wizard({ hasVariant: true, selectedSizes: ['M'] }))).toEqual([]);
  });

  it('falls back to the product-wide figures for a size with no override', () => {
    const state = wizard({
      hasVariant: false,
      selectedSizes: ['M', 'L'],
      stock: '40',
      moq: '6',
      lowStockAlert: '9',
    });

    expect(resolveProductInventory(state)).toEqual([
      { size: 'M', stock: 40, moq: 6, lowStockAlert: 9 },
      { size: 'L', stock: 40, moq: 6, lowStockAlert: 9 },
    ]);
  });

  it('prefers a per-size override over the product-wide figure', () => {
    const state = wizard({
      hasVariant: false,
      selectedSizes: ['M', 'L'],
      stock: '40',
      moq: '6',
      lowStockAlert: '9',
      sizeStockSet: { L: '0' },
      moqSet: { L: '2' },
      sizeLowStockAlertSet: { L: '1' },
    });

    expect(resolveProductInventory(state)).toEqual([
      { size: 'M', stock: 40, moq: 6, lowStockAlert: 9 },
      // Zero is an override, not an absence — an out-of-stock size must submit 0.
      { size: 'L', stock: 0, moq: 2, lowStockAlert: 1 },
    ]);
  });

  it('uses the documented defaults when nothing at all is set', () => {
    const state = wizard({ hasVariant: false, selectedSizes: ['XL'] });
    expect(resolveProductInventory(state)).toEqual([
      { size: 'XL', stock: 0, moq: 1, lowStockAlert: 5 },
    ]);
  });
});

describe('resolveVariationInventory', () => {
  it('is keyed off the selected sizes, dropping deselected ones', () => {
    const v = variation({
      inventory: [
        { size: 'S', stock: 5, moq: 1, lowStockAlert: 2 },
        { size: 'M', stock: 8, moq: 1, lowStockAlert: 2 },
      ],
    });

    // 'S' was deselected in the wizard; 'L' was added and has no server row.
    expect(resolveVariationInventory(v, ['M', 'L']).map((i) => i.size)).toEqual(['M', 'L']);
  });

  it('keeps the existing server row for a size with no wizard override', () => {
    const v = variation({ inventory: [{ size: 'M', stock: 8, moq: 3, lowStockAlert: 4 }] });
    expect(resolveVariationInventory(v, ['M'])).toEqual([
      { size: 'M', stock: 8, moq: 3, lowStockAlert: 4 },
    ]);
  });

  it('lets a wizard override beat the existing server row', () => {
    const v = variation({
      inventory: [{ size: 'M', stock: 8, moq: 3, lowStockAlert: 4 }],
      sizeStock: { M: '99' },
    });
    const [row] = resolveVariationInventory(v, ['M']);
    expect(row.stock).toBe(99);
    // Untouched fields still come from the server row.
    expect(row.moq).toBe(3);
  });

  it('defaults a newly selected size with no history', () => {
    expect(resolveVariationInventory(variation(), ['XXL'])).toEqual([
      { size: 'XXL', stock: 0, moq: 1, lowStockAlert: 5 },
    ]);
  });
});

describe('buildProductPayload', () => {
  const base = wizard({
    name: 'Cotton Panjabi',
    brandName: 'Bepari',
    unitType: 'piece',
    sku: 'BP-1001',
    categoryId: 'cat-1',
    wholesalerId: 'whl-1',
    basePrice: '400',
    margin: '25',
    hasVariant: false,
    selectedSizes: ['M'],
    stock: '30',
  });

  /*
   * THIS TEST USED TO ASSERT THE BUG.
   *
   * It required the payload to carry a selling price computed from
   * `state.margin` — and `state.margin` is empty whenever the operator does not
   * type one, which is always, because the form only ever DISPLAYED a fallback.
   * So the "derived" price was `base × (1 + 0/100)`: the base price, sent as
   * though it were the selling price, with a margin of 0 beside it. Measured on
   * dev: 24 of 24 live products stored exactly that, which the console then
   * reported as a platform margin of ৳0.00.
   *
   * The margin belongs to the supplier and the server derives the price from
   * it. A client cannot compute this correctly, so it must not send it at all.
   */
  it('sends no price except the base price', () => {
    const payload = buildProductPayload(base) as unknown as Record<string, unknown>;

    expect(payload.basePrice).toBe(400);
    expect('sellingPrice' in payload).toBe(false);
    expect('platformPrice' in payload).toBe(false);
    expect('margin' in payload).toBe(false);
  });

  it('still sends no price fields when the operator typed a margin', () => {
    // A margin typed into the form is not authority to set one. The supplier's
    // margin governs, and the server applies it.
    const payload = buildProductPayload(wizard({ margin: '25' })) as unknown as Record<string, unknown>;
    expect('margin' in payload).toBe(false);
    expect('sellingPrice' in payload).toBe(false);
  });

  it('coerces unparseable numeric fields to zero rather than NaN', () => {
    // NaN survives JSON.stringify as null and reaches the database as a null
    // price — worth an explicit test.
    const payload = buildProductPayload(wizard({ basePrice: '', margin: 'abc', weight: '' }));
    expect(payload.basePrice).toBe(0);
    expect(payload.weight).toBe(0);
  });

  it('sends hasVariant as a boolean even though the store models it as null', () => {
    expect(buildProductPayload(wizard({ hasVariant: null })).hasVariant).toBe(false);
  });

  it('drops colour and design lists when the product has no variants', () => {
    const payload = buildProductPayload(
      wizard({ hasVariant: false, variationColors: ['Navy'], variationDesigns: ['Plain'] }),
    );
    expect(payload.variationColors).toEqual([]);
    expect(payload.variationDesigns).toEqual([]);
  });

  it('keeps colour and design lists when the product has variants', () => {
    const payload = buildProductPayload(
      wizard({ hasVariant: true, variationColors: ['Navy'], variationDesigns: ['Plain'] }),
    );
    expect(payload.variationColors).toEqual(['Navy']);
  });

  it('substitutes a placeholder SKU rather than sending an empty one', () => {
    expect(buildProductPayload(wizard({ sku: '' })).sku).toBe('SKU-XXXX');
  });

  it('prefers the published CDN video URL over the raw upload URL', () => {
    const media = emptyProductMedia();
    media.video = uploadedVideo('https://uploads/raw.mp4');
    const payload = buildProductPayload(wizard({ productMedia: media }), {
      videoUrl: 'https://cdn/published.mp4',
    });
    expect(payload.videoUrl).toBe('https://cdn/published.mp4');
  });

  it('falls back to the upload URL when nothing was published', () => {
    const media = emptyProductMedia();
    media.video = uploadedVideo('https://uploads/raw.mp4');
    expect(buildProductPayload(wizard({ productMedia: media })).videoUrl).toBe(
      'https://uploads/raw.mp4',
    );
  });

  describe('variation roll-up', () => {
    const withVariant = (v: ProductVariation, sizes: string[]) =>
      buildProductPayload(
        wizard({ hasVariant: true, selectedSizes: sizes, basePrice: '400', variations: [v] }),
      ).variations![0]!;

    it('sums stock across sizes', () => {
      const v = variation({ sizeStock: { M: '10', L: '15' } });
      expect(withVariant(v, ['M', 'L']).stock).toBe(25);
    });

    it('takes the MINIMUM moq — the variant is orderable at its easiest size', () => {
      const v = variation({ sizeMoq: { M: '12', L: '3' } });
      expect(withVariant(v, ['M', 'L']).moq).toBe(3);
    });

    it('takes the MAXIMUM low-stock alert — it warns on the first size to run low', () => {
      const v = variation({ sizeAlert: { M: '2', L: '20' } });
      expect(withVariant(v, ['M', 'L']).lowStockAlert).toBe(20);
    });

    it('reports zero when every size is out of stock', () => {
      // The original did `sum || Number(v.stock) || 0`, so a fully sold-out
      // variant fell back to the stale top-level figure and was submitted as
      // still in stock. Sum of zeroes is zero.
      const v = variation({ stock: 500, sizeStock: { M: '0', L: '0' } });
      expect(withVariant(v, ['M', 'L']).stock).toBe(0);
    });

    it('falls back to the variation-level figures when no sizes are selected', () => {
      const v = variation({ stock: 42, moq: 4, lowStockAlert: 7 });
      expect(withVariant(v, [])).toMatchObject({ stock: 42, moq: 4, lowStockAlert: 7 });
    });

    it('inherits the base price when the variation has none', () => {
      expect(withVariant(variation({ price: undefined }), ['M']).price).toBe(400);
    });

    it('keeps a variation-specific price', () => {
      expect(withVariant(variation({ price: 550 }), ['M']).price).toBe(550);
    });

    it('orders variation media front, back, then extras', () => {
      const media = emptyVariationMedia();
      media.front = uploaded('vf');
      media.more = [uploaded('vm')];
      const built = withVariant(variation({ media: media as VariationMediaState }), ['M']);

      expect(built.media).toEqual([
        { url: 'vf', mediaType: 'image', position: 0 },
        // Position 1 is the back slot, which is empty — the extra keeps its own.
        { url: 'vm', mediaType: 'image', position: 2 },
      ]);
    });

    it('survives a variation with no media object at all', () => {
      const v = { ...variation(), media: undefined } as unknown as ProductVariation;
      expect(withVariant(v, ['M']).media).toEqual([]);
    });
  });

  it('does not mutate the state it was given', () => {
    const state = wizard({
      hasVariant: true,
      selectedSizes: ['M'],
      variations: [variation({ sizeStock: { M: '4' } })],
    });
    const snapshot = JSON.parse(JSON.stringify(state));
    buildProductPayload(state);
    expect(JSON.parse(JSON.stringify(state))).toEqual(snapshot);
  });
});

