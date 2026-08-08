import { describe, it, expect } from 'vitest';
import {
  MAX_VARIANTS,
  validateStep1,
  validateStep2,
  validateStep3,
  validateStep4,
  validateStep5,
  validateWizardStep,
} from '../validateWizardStep';
import {
  INITIAL_STATE,
  emptyProductMedia,
  emptySlot,
  emptyVariationMedia,
} from '../../store/useAddProductStore';
import type {
  MediaSlot,
  ProductVariation,
  UploadStatus,
  VariationMediaState,
  WizardState,
} from '../../../types/registration';

function wizard(overrides: Partial<WizardState> = {}): WizardState {
  return { ...INITIAL_STATE, productMedia: emptyProductMedia(), ...overrides };
}

function slot(status: UploadStatus = 'done', url = 'https://cdn/img.jpg'): MediaSlot {
  return { ...emptySlot(), uploadedUrl: url, uploadStatus: status };
}

/** A variation with front and back present and uploaded. */
function variationMedia(status: UploadStatus = 'done'): VariationMediaState {
  return { ...emptyVariationMedia(), front: slot(status), back: slot(status) };
}

function variation(overrides: Partial<ProductVariation> = {}): ProductVariation {
  return {
    id: 'v1',
    color: 'Navy',
    design: 'Plain',
    price: 500,
    stock: 20,
    moq: 2,
    lowStockAlert: 5,
    media: variationMedia(),
    sizeStock: {},
    sizeMoq: {},
    sizeAlert: {},
    inventory: [],
    ...overrides,
  };
}

// ─── Step 1: identity ────────────────────────────────────

describe('validateStep1', () => {
  const complete = wizard({
    wholesalerId: 'whl-1',
    name: 'Cotton Panjabi',
    brandName: 'Bepari',
    unitType: 'piece',
    categoryId: 'cat-1',
    productGroupId: 'grp-1',
    classificationId: 'cls-1',
    sku: 'BP-1001',
  });

  it('passes a fully identified product', () => {
    expect(validateStep1(complete)).toEqual({ isValid: true, errors: {} });
  });

  it.each([
    ['wholesalerId', 'wholesalerId'],
    ['name', 'name'],
    ['brandName', 'brandName'],
    ['unitType', 'unitType'],
    ['categoryId', 'category'],
    ['productGroupId', 'productGroup'],
    ['classificationId', 'classification'],
  ] as const)('rejects a missing %s', (field, errorKey) => {
    const result = validateStep1({ ...complete, [field]: '' });
    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveProperty(errorKey);
  });

  it('treats whitespace as missing', () => {
    expect(validateStep1({ ...complete, name: '   ' }).errors).toHaveProperty('name');
  });

  it('rejects the SKU placeholder', () => {
    // 'SKU-XXXX' is what the payload builder falls back to. It is not a real
    // reserved SKU, and letting it through means a collision on the server.
    expect(validateStep1({ ...complete, sku: 'SKU-XXXX' }).errors).toHaveProperty('sku');
  });

  it('reports every missing field at once, not just the first', () => {
    const result = validateStep1(wizard());
    expect(Object.keys(result.errors)).toHaveLength(8);
  });
});

// ─── Step 2: sizes and dispatch ──────────────────────────

describe('validateStep2', () => {
  it('passes with at least one size and a dispatch time', () => {
    expect(validateStep2(wizard({ selectedSizes: ['M'], dispatchTime: '2 Day' })).isValid).toBe(
      true,
    );
  });

  it('requires at least one size', () => {
    expect(
      validateStep2(wizard({ selectedSizes: [], dispatchTime: '2 Day' })).errors,
    ).toHaveProperty('sizes');
  });

  it('requires a dispatch time', () => {
    expect(validateStep2(wizard({ selectedSizes: ['M'] })).errors).toHaveProperty('dispatchTime');
  });
});

// ─── Step 3: pricing and inventory ───────────────────────

describe('validateStep3 — product without variants', () => {
  const sized = (over: Partial<WizardState> = {}) =>
    wizard({
      hasVariant: false,
      basePrice: '400',
      selectedSizes: ['M'],
      sizeStockSet: { M: '20' },
      moqSet: { M: '2' },
      sizeLowStockAlertSet: { M: '5' },
      ...over,
    });

  it('passes a complete per-size configuration', () => {
    expect(validateStep3(sized())).toEqual({ isValid: true, errors: {} });
  });

  it('requires a base price above zero', () => {
    expect(validateStep3(sized({ basePrice: '0' })).errors).toHaveProperty('basePrice');
    expect(validateStep3(sized({ basePrice: '' })).errors).toHaveProperty('basePrice');
  });

  it('requires the variant question to be answered', () => {
    const result = validateStep3(wizard({ hasVariant: null, basePrice: '400' }));
    expect(result.errors).toHaveProperty('hasVariant');
  });

  it('does not re-ask the variant question when variations already exist', () => {
    // A hydrated product carries variations but no stored answer.
    const result = validateStep3(
      wizard({ hasVariant: null, basePrice: '400', variations: [variation()] }),
    );
    expect(result.errors).not.toHaveProperty('hasVariant');
  });

  it.each([
    ['sizeStockSet', 'sizeStockSet'],
    ['moqSet', 'moqSet'],
    ['sizeLowStockAlertSet', 'sizeLowStockAlertSet'],
  ] as const)('requires %s for every active size', (field, errorKey) => {
    expect(validateStep3(sized({ [field]: {} })).errors).toHaveProperty(errorKey);
  });

  it('skips sizes the operator marked out of stock', () => {
    const state = sized({
      selectedSizes: ['M', 'L'],
      stockedOutSizes: ['L'],
      // Nothing at all for 'L' — that is the point.
    });
    expect(validateStep3(state).isValid).toBe(true);
  });

  it('rejects an MOQ at or above the stock held', () => {
    expect(validateStep3(sized({ moqSet: { M: '20' } })).errors).toHaveProperty('moqSetLimit');
    expect(validateStep3(sized({ moqSet: { M: '21' } })).errors).toHaveProperty('moqSetLimit');
    expect(validateStep3(sized({ moqSet: { M: '19' } })).errors).not.toHaveProperty('moqSetLimit');
  });

  it('rejects a low-stock alert at or above the stock held', () => {
    expect(validateStep3(sized({ sizeLowStockAlertSet: { M: '20' } })).errors).toHaveProperty(
      'alertSetLimit',
    );
    expect(validateStep3(sized({ sizeLowStockAlertSet: { M: '19' } })).errors).not.toHaveProperty(
      'alertSetLimit',
    );
  });

  describe('with no sizes selected', () => {
    const unsized = (over: Partial<WizardState> = {}) =>
      wizard({
        hasVariant: false,
        basePrice: '400',
        selectedSizes: [],
        stock: '20',
        moq: '2',
        lowStockAlert: '5',
        ...over,
      });

    it('checks the product-wide figures instead', () => {
      expect(validateStep3(unsized()).isValid).toBe(true);
      expect(validateStep3(unsized({ stock: '0' })).errors).toHaveProperty('stock');
      expect(validateStep3(unsized({ moq: '' })).errors).toHaveProperty('moq');
      expect(validateStep3(unsized({ lowStockAlert: '0' })).errors).toHaveProperty('lowStockAlert');
    });

    it('applies the same MOQ-below-stock rule', () => {
      expect(validateStep3(unsized({ moq: '20' })).errors).toHaveProperty('moqLimit');
    });

    it('skips inventory entirely when the product is marked out of stock', () => {
      const result = validateStep3(
        unsized({ generalStockedOut: true, stock: '', moq: '', lowStockAlert: '' }),
      );
      expect(result.isValid).toBe(true);
    });
  });
});

describe('validateStep3 — product with variants', () => {
  const base = (over: Partial<WizardState> = {}) =>
    wizard({ hasVariant: true, basePrice: '400', selectedSizes: [], ...over });

  it('demands variations be generated first', () => {
    expect(validateStep3(base({ variations: [] })).errors).toHaveProperty('variations');
  });

  it('passes a complete variation', () => {
    expect(validateStep3(base({ variations: [variation()] })).isValid).toBe(true);
  });

  it('rejects a variation priced below the base price', () => {
    // The base price is the floor the margin was calculated against.
    const result = validateStep3(base({ variations: [variation({ price: 399 })] }));
    expect(result.errors.variations).toContain('1 variation(s)');
  });

  it('accepts a variation priced above the base price', () => {
    expect(validateStep3(base({ variations: [variation({ price: 900 })] })).isValid).toBe(true);
  });

  it('falls back to the base price when the variation has none', () => {
    expect(
      validateStep3(base({ variations: [variation({ price: undefined })] })).isValid,
    ).toBe(true);
  });

  it('counts how many variations are incomplete', () => {
    const result = validateStep3(
      base({
        variations: [variation({ id: 'a' }), variation({ id: 'b', stock: 0 }), variation({ id: 'c', moq: 0 })],
      }),
    );
    expect(result.errors.variations).toContain('2 variation(s)');
  });

  describe('with sizes selected', () => {
    const sizedVariation = (over: Partial<ProductVariation> = {}) =>
      variation({
        sizeStock: { M: '20' },
        sizeMoq: { M: '2' },
        sizeAlert: { M: '5' },
        ...over,
      });

    const state = (v: ProductVariation) =>
      base({ selectedSizes: ['M'], variations: [v] });

    it('passes when every size is filled in', () => {
      expect(validateStep3(state(sizedVariation())).isValid).toBe(true);
    });

    it('rejects a size left blank', () => {
      // Blank and zero are both invalid, but blank means "not looked at yet".
      expect(validateStep3(state(sizedVariation({ sizeStock: { M: '' } }))).isValid).toBe(false);
      expect(validateStep3(state(sizedVariation({ sizeStock: {} }))).isValid).toBe(false);
    });

    /*
     * THE DEADLOCK, PINNED.
     *
     * This asserted a per-variation `stockedOutSizes` — a field nothing in the
     * app ever wrote. The only control is the In/Out toggle in the stock grid,
     * which writes the PRODUCT-level list AND disables that size's cell in
     * every variation row. So marking a size Out greyed out its inputs while
     * this validator went on demanding stock, MOQ and an alert for it: "N
     * variation(s) have invalid stock/moq/alert logic", permanently, with
     * nothing on screen able to clear it.
     *
     * The test passed the whole time, because it set a field by hand that no
     * operator could. That is the shape to watch for — a fixture supplying
     * something the UI cannot.
     */
    it('skips a size the PRODUCT marks out of stock — the list the toggle writes', () => {
      const v = sizedVariation({ sizeStock: {}, sizeMoq: {}, sizeAlert: {} });
      const blocked = base({ selectedSizes: ['M'], variations: [v] });
      expect(validateStep3(blocked).isValid).toBe(false);

      const out = base({ selectedSizes: ['M'], variations: [v], stockedOutSizes: ['M'] });
      expect(validateStep3(out).isValid).toBe(true);
    });

    it('still demands the sizes that are NOT marked out', () => {
      // Marking one size out must not wave the rest through.
      const v = sizedVariation({ sizeStock: {}, sizeMoq: {}, sizeAlert: {} });
      const partial = base({
        selectedSizes: ['M', 'L'],
        variations: [v],
        stockedOutSizes: ['L'],
      });
      expect(validateStep3(partial).isValid).toBe(false);
    });

    it('rejects an MOQ equal to stock, matching the no-variant rule', () => {
      // This used to differ by branch: without variants `moq === stock` was
      // rejected, with variants it was accepted. Same concept, one rule now.
      expect(validateStep3(state(sizedVariation({ sizeMoq: { M: '20' } }))).isValid).toBe(false);
    });

    it('requires an MOQ of at least 1', () => {
      expect(validateStep3(state(sizedVariation({ sizeMoq: { M: '0' } }))).isValid).toBe(false);
    });
  });
});

// ─── Step 4: variants and media ──────────────────────────

describe('validateStep4 — media for a product without variants', () => {
  const withMedia = (over: Partial<ReturnType<typeof emptyProductMedia>> = {}) =>
    wizard({ hasVariant: false, productMedia: { ...emptyProductMedia(), ...over } });

  it('requires at least one image', () => {
    expect(validateStep4(wizard({ hasVariant: false })).errors).toHaveProperty('productMedia');
  });

  it('passes with one uploaded image', () => {
    expect(validateStep4(withMedia({ poster: slot('done') })).isValid).toBe(true);
  });

  it('blocks while an upload is still in flight', () => {
    const result = validateStep4(withMedia({ poster: slot('done'), front: slot('uploading') }));
    expect(result.errors.mediaUpload).toContain('1 image(s) in queue');
  });

  it('reports a failure ahead of a queue — the failure needs action', () => {
    const result = validateStep4(
      withMedia({ poster: slot('error'), front: slot('uploading'), back: slot('done') }),
    );
    expect(result.errors.mediaUpload).toContain('failed');
  });

  it('counts a locally-selected file as present even before it uploads', () => {
    const local: MediaSlot = { ...emptySlot(), localUri: 'blob:x', uploadStatus: 'idle' };
    const result = validateStep4(withMedia({ poster: local }));
    expect(result.errors).not.toHaveProperty('productMedia');
    expect(result.errors.mediaUpload).toContain('queue');
  });
});

describe('validateStep4 — variant configuration', () => {
  const variants = (over: Partial<WizardState> = {}) =>
    wizard({ hasVariant: true, variations: [variation()], ...over });

  it('passes a generated set with complete media', () => {
    expect(validateStep4(variants({ variationColors: ['Navy'] })).isValid).toBe(true);
  });

  it('asks the operator to generate variations once axes are entered', () => {
    const result = validateStep4(
      variants({ variations: [], variationColors: ['Navy'], variationDesigns: ['Plain'] }),
    );
    expect(result.errors.variations).toContain('Generate Variations');
  });

  it(`caps the grid at ${MAX_VARIANTS} combinations`, () => {
    const colors = Array.from({ length: 6 }, (_, i) => `C${i}`);
    const designs = Array.from({ length: 5 }, (_, i) => `D${i}`);
    const result = validateStep4(variants({ variationColors: colors, variationDesigns: designs }));
    expect(result.errors.variantCount).toContain('30');
  });

  it(`allows exactly ${MAX_VARIANTS}`, () => {
    const five = Array.from({ length: 5 }, (_, i) => `${i}`);
    const result = validateStep4(variants({ variationColors: five, variationDesigns: five }));
    expect(result.errors).not.toHaveProperty('variantCount');
  });

  it('enforces the cap when only ONE axis is used', () => {
    /*
     * The generator pairs each colour with a single blank design when the
     * design list is empty, so 40 colours produces 40 variants. The cap was
     * computed as `colors * designs` — 40 × 0 = 0 — so it never fired. This is
     * the only place the limit is enforced anywhere in the app.
     */
    const colors = Array.from({ length: 40 }, (_, i) => `C${i}`);
    const result = validateStep4(variants({ variationColors: colors, variationDesigns: [] }));
    expect(result.errors.variantCount).toContain('40');
  });

  it('does not complain about the cap before any axis is entered', () => {
    const result = validateStep4(variants({ variationColors: [], variationDesigns: [] }));
    expect(result.errors).not.toHaveProperty('variantCount');
  });
});

describe('validateStep4 — variant media', () => {
  const withVariations = (...vs: ProductVariation[]) =>
    wizard({ hasVariant: true, variations: vs, variationColors: ['Navy'] });

  it('requires both a front and a back image', () => {
    const noBack = variation({ media: { ...variationMedia(), back: emptySlot() } });
    expect(validateStep4(withVariations(noBack)).errors.variations).toContain('1 variation(s)');
  });

  it('counts a variation missing BOTH images once, not twice', () => {
    // Front and back are two slots but one incomplete variation. Counting slots
    // reported "2 variation(s) missing" for a single variation.
    const bare = variation({ media: emptyVariationMedia() as VariationMediaState });
    expect(validateStep4(withVariations(bare)).errors.variations).toContain('1 variation(s)');
  });

  it('counts each incomplete variation separately', () => {
    const bare = () => variation({ media: emptyVariationMedia() as VariationMediaState });
    expect(validateStep4(withVariations(bare(), bare())).errors.variations).toContain(
      '2 variation(s)',
    );
  });

  it('treats a variation with no media object at all as missing', () => {
    const v = { ...variation(), media: undefined } as ProductVariation;
    expect(validateStep4(withVariations(v)).errors).toHaveProperty('variations');
  });

  it('blocks while variant uploads are queued', () => {
    const v = variation({ media: variationMedia('uploading') });
    expect(validateStep4(withVariations(v)).errors.mediaUpload).toContain('queue');
  });

  it('reports a failed variant upload ahead of a queued one', () => {
    const failing = variation({
      id: 'a',
      media: { ...variationMedia(), front: slot('error'), back: slot('uploading') },
    });
    expect(validateStep4(withVariations(failing)).errors.mediaUpload).toContain('failed');
  });
});

// ─── Step 5: policies ────────────────────────────────────

describe('validateStep5', () => {
  it('passes when every policy is switched off', () => {
    expect(validateStep5(wizard())).toEqual({ isValid: true, errors: {} });
  });

  it.each([
    ['warrantyEnabled', 'warrantyDuration', 'warrantyDescription'],
    ['returnPolicyEnabled', 'returnWindow', 'returnCondition'],
    ['exchangeEnabled', 'exchangeWindow', 'exchangeDescription'],
  ] as const)('requires both fields once %s is on', (toggle, fieldA, fieldB) => {
    const result = validateStep5(wizard({ [toggle]: true }));
    expect(result.errors).toHaveProperty(fieldA);
    expect(result.errors).toHaveProperty(fieldB);
  });

  it('ignores stale values from a policy that is switched off', () => {
    // Toggling a policy off must not strand its half-filled fields as errors.
    const result = validateStep5(wizard({ warrantyEnabled: false, warrantyDuration: '' }));
    expect(result.isValid).toBe(true);
  });

  it('treats whitespace as unfilled', () => {
    const result = validateStep5(
      wizard({ warrantyEnabled: true, warrantyDuration: '  ', warrantyDescription: 'x' }),
    );
    expect(result.errors).toHaveProperty('warrantyDuration');
  });
});

// ─── Dispatcher ──────────────────────────────────────────

describe('validateWizardStep', () => {
  it('routes each step to its validator', () => {
    expect(validateWizardStep(1, wizard()).errors).toHaveProperty('name');
    expect(validateWizardStep(2, wizard()).errors).toHaveProperty('sizes');
  });

  /*
   * CHANGED DELIBERATELY. This used to read "always passes the read-only summary
   * step", asserting `{isValid: true, errors: {}}` for any state at all.
   *
   * The premise was that the summary has no inputs, so there is nothing on it to
   * get wrong. True of the step, false of the moment — step 6 is where Submit
   * and Update live, and "this screen has no fields" is not the same claim as
   * "the form behind it is valid".
   *
   * The gap was reachable and expensive: in edit mode every step is marked done,
   * so the step bar jumps to 6 from anywhere, and Reset emptied the store
   * without re-hydrating. Reset → step 6 → Update PATCHed a live product to
   * `name:''`, `basePrice:0`, `media:[]`, and nothing in between objected.
   */
  it('re-runs steps 1-5, so an empty form cannot reach submit', () => {
    const result = validateWizardStep(6, wizard());

    expect(result.isValid).toBe(false);
    // Naming the step matters: the step bar is one click, and "invalid" alone
    // leaves the operator hunting through six screens for the field.
    expect(Object.values(result.errors).join(' ')).toMatch(/step 1/i);
  });

  it('fails closed on an unknown step', () => {
    // A step number the wizard does not have must not be treated as passing.
    expect(validateWizardStep(99, wizard())).toEqual({
      isValid: false,
      errors: { unknown: 'Invalid step' },
    });
  });
});

/**
 * A COUNT IS NOT SOMETHING AN OPERATOR CAN ACT ON.
 *
 * Step 3 said "4 variation(s) have invalid stock/moq/alert logic" and nothing
 * else. It did not say which variation, which size, or which of the three
 * figures — and it said "stock/moq/alert" even when the fault was the price,
 * which sent operators to a grid where nothing was wrong. With four colours
 * across three sizes that is one sentence about thirty-six cells.
 */
describe('step 3 names what is wrong, not just how much', () => {
  const sized = (over: Partial<ProductVariation> = {}): ProductVariation => ({
    id: 'v1',
    color: 'Red',
    subName: 'Red',
    sizeStock: { M: '20' },
    sizeMoq: { M: '5' },
    sizeAlert: { M: '3' },
    ...over,
  });
  const withVariation = (v: ProductVariation, over: Partial<WizardState> = {}) =>
    wizard({
      hasVariant: true,
      basePrice: '400',
      selectedSizes: ['M'],
      variations: [v],
      ...over,
    });

  /*
   * An empty base price is ONE fault, not one per variation.
   *
   * `price` falls back to `basePrice`, so a blank base fails every variation at
   * once. The original message called that "N variation(s) have invalid
   * stock/moq/alert logic" and sent the operator to a grid where nothing was
   * wrong. Naming it a price fault was better but still wrong: walking the live
   * wizard showed "Base price must be greater than 0" AND "2 variation(s) need
   * attention" side by side, which is the same misdirection in a new costume.
   */
  it('blames the base price box, not the variations', () => {
    const result = validateStep3(withVariation(sized(), { basePrice: '' }));

    expect(result.errors.basePrice).toBeTruthy();
    // Nothing is wrong with the variations, so nothing may say there is.
    expect(result.errors.variations).toBeUndefined();
    expect(result.variationIssues).toBeUndefined();
  });

  it('still reports a genuine stock fault while the base price is empty', () => {
    // The base price must not mask real problems — only stop inventing ones.
    const result = validateStep3(
      withVariation(sized({ sizeMoq: {} }), { basePrice: '' }),
    );
    expect(result.errors.basePrice).toBeTruthy();
    expect((result.variationIssues ?? []).some((i) => i.field === 'moq')).toBe(true);
  });

  it('names the size and the field for a blank cell', () => {
    const result = validateStep3(withVariation(sized({ sizeMoq: {} })));
    const issue = (result.variationIssues ?? []).find((i) => i.field === 'moq');

    expect(issue).toBeDefined();
    expect(issue!.size).toBe('M');
    expect(issue!.label).toBe('Red');
    expect(issue!.message).toMatch(/required/i);
  });

  it('explains a limit rather than restating the rule', () => {
    // MOQ 20 against stock 20 — legal-looking until you know the rule.
    const result = validateStep3(withVariation(sized({ sizeMoq: { M: '20' } })));
    const issue = (result.variationIssues ?? []).find((i) => i.field === 'moq');
    expect(issue!.message).toMatch(/below the stock of 20/i);
  });

  it('counts variations, not faults', () => {
    // One variation, three blank figures — that is one variation to fix.
    const result = validateStep3(
      withVariation(sized({ sizeStock: {}, sizeMoq: {}, sizeAlert: {} })),
    );
    expect(result.errors.variations).toMatch(/^1 variation/);
    expect((result.variationIssues ?? []).length).toBe(3);
  });

  it('reports nothing when the step passes', () => {
    const result = validateStep3(withVariation(sized()));
    expect(result.isValid).toBe(true);
    expect(result.variationIssues).toBeUndefined();
  });
});
