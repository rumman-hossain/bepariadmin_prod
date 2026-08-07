import { describe, it, expect } from 'vitest';
import { productVariationSchema } from '../productSchema';

/**
 * The two variation prices, which were one.
 *
 * `basePrice` was missing from the schema, so Zod stripped the field the server
 * sends, and the transform filled `price` from `sellingPrice`. Every wizard
 * site treats `price` as the supplier's COST — `calcRetail(v.price)`, the
 * "Base:" line on step 6, `price: parseFloatOr(variation.price, 0)` in the
 * payload builder — so editing a variant product loaded the MARGINED figure as
 * the cost, displayed it as the cost, and saved it as the cost.
 *
 * The margin compounded on every edit. At the platform default of 9.5%: a
 * variant costed at 100 sells at 109.50; reopen and save, and the stored cost
 * is 109.50 selling at 119.90; again and it is 131.29. Nothing on screen says
 * the number moved, because the field it moved in is the one being shown.
 */
describe('a variation carries a cost and a selling price, and never confuses them', () => {
  it('keeps the server basePrice instead of stripping it', () => {
    const v = productVariationSchema.parse({
      id: 'v1',
      subName: 'Red',
      basePrice: 100,
      sellingPrice: 109.5,
    });
    expect(v.basePrice).toBe(100);
    expect(v.sellingPrice).toBe(109.5);
  });

  it('never lets the selling price become the cost', () => {
    const v = productVariationSchema.parse({
      id: 'v1',
      subName: 'Red',
      basePrice: 100,
      sellingPrice: 109.5,
    });
    // `price` is the wizard's name for the cost. Filling it from sellingPrice
    // is the whole defect: the next save writes 109.50 into the base column.
    expect(v.price).toBe(100);
  });

  it('leaves the cost unset rather than inventing one from the selling price', () => {
    // A server that sends only a derived figure has told us nothing about what
    // the supplier charges. Guessing here is what compounds.
    const v = productVariationSchema.parse({ id: 'v1', sellingPrice: 109.5 });
    expect(v.price).toBeUndefined();
    expect(v.basePrice).toBeUndefined();
    expect(v.sellingPrice).toBe(109.5);
  });

  it('accepts either name for the cost and reports both', () => {
    // The wizard writes `price`; the server sends `basePrice`. One fact.
    expect(productVariationSchema.parse({ id: 'v1', price: 250 }).basePrice).toBe(250);
    expect(productVariationSchema.parse({ id: 'v1', basePrice: 250 }).price).toBe(250);
  });

  it('keeps a deliberate zero, which is a free gift variant and not an absent price', () => {
    const v = productVariationSchema.parse({ id: 'v1', basePrice: 0 });
    expect(v.price).toBe(0);
    expect(v.basePrice).toBe(0);
  });

  /*
   * The defect stated as arithmetic: three round-trips through the old
   * behaviour, at the platform default margin.
   */
  it('does not compound the margin across repeated edits', () => {
    const MARGIN = 9.5;
    let cost = 100;
    for (let i = 0; i < 3; i++) {
      const fromServer = {
        id: 'v1',
        basePrice: cost,
        sellingPrice: Math.round(cost * (1 + MARGIN / 100) * 100) / 100,
      };
      // What the wizard loads as the cost, and would write back on save.
      cost = productVariationSchema.parse(fromServer).price!;
    }
    expect(cost).toBe(100);
  });
});
