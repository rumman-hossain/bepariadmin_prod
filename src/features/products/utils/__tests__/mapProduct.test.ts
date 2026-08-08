import { describe, it, expect } from 'vitest';
import {
  extractBackendProduct,
  isBackendListResponse,
  mapDisplayStatusToBackend,
  mapDisplayVisibilityToBackend,
  mapListQueryParams,
  normalizeBackendProduct,
  normalizeProductListResponse,
  type BackendProduct,
} from '../mapProduct';

function backend(overrides: Partial<BackendProduct> = {}): BackendProduct {
  return {
    id: 42,
    wholesalerId: 'whl-1',
    name: 'Cotton Panjabi',
    sku: 'BP-1001',
    basePrice: 400,
    ...overrides,
  };
}

// ─── Boundary parsing ────────────────────────────────────

describe('extractBackendProduct', () => {
  it('unwraps a { data: product } envelope', () => {
    const product = backend();
    expect(extractBackendProduct({ data: product })).toBe(product);
  });

  it('accepts a bare product', () => {
    const product = backend();
    expect(extractBackendProduct(product)).toBe(product);
  });

  it.each([
    ['null', null],
    ['a string', 'oops'],
    ['a number', 7],
    ['an array', [backend()]],
    ['an empty object', {}],
    ['an object with no id', { name: 'x', sku: 'y' }],
    ['an object with an id but no name or sku', { id: 1 }],
  ])('returns null for %s', (_label, input) => {
    expect(extractBackendProduct(input)).toBeNull();
  });

  it('does not mistake { data: [...] } for a single product', () => {
    // The list endpoint uses the same envelope key. Treating its array as a
    // product would produce an object with no id and every field undefined.
    expect(extractBackendProduct({ data: [backend()] })).toBeNull();
  });
});

describe('isBackendListResponse', () => {
  it('accepts a well-formed list response', () => {
    expect(isBackendListResponse({ data: [], meta: { total: 0 } })).toBe(true);
  });

  it.each([
    ['null', null],
    ['a bare array', []],
    ['data that is not an array', { data: {}, meta: { total: 0 } }],
    ['a missing meta', { data: [] }],
    ['a null meta', { data: [], meta: null }],
  ])('rejects %s', (_label, input) => {
    expect(isBackendListResponse(input)).toBe(false);
  });
});

// ─── Filter translation ──────────────────────────────────

describe('mapDisplayStatusToBackend', () => {
  it('treats "All" and empty as no filter', () => {
    expect(mapDisplayStatusToBackend('All')).toBeUndefined();
    expect(mapDisplayStatusToBackend('')).toBeUndefined();
  });

  it('falls back to a snake_case guess for an unmapped label', () => {
    // Better a guess the server can reject than dropping the filter silently.
    expect(mapDisplayStatusToBackend('Pending Review')).toBe('pending_review');
  });
});

describe('mapDisplayVisibilityToBackend', () => {
  it('treats "All" as no filter', () => {
    expect(mapDisplayVisibilityToBackend('All')).toBeUndefined();
  });

  it('lowercases an unmapped label', () => {
    expect(mapDisplayVisibilityToBackend('Unlisted')).toBe('unlisted');
  });
});

describe('mapListQueryParams', () => {
  const params = (p: Parameters<typeof mapListQueryParams>[0]) =>
    Object.fromEntries(mapListQueryParams(p));

  it('is empty with no filters', () => {
    expect(params(undefined)).toEqual({});
    expect(params({})).toEqual({});
  });

  it('sends the wholesaler filter as wholesaler_id', () => {
    // Declared in the params type but never written to the query string, which
    // is why the wholesaler filter silently degraded to filtering one page of
    // results in the browser.
    expect(params({ wholesalerId: 'whl-9' })).toMatchObject({ wholesaler_id: 'whl-9' });
  });

  it('omits "All" for both category and wholesaler', () => {
    expect(params({ category: 'All', wholesalerId: 'All' })).toEqual({});
  });

  it('omits page 0 and an empty search rather than sending them', () => {
    expect(params({ page: 0, search: '' })).toEqual({});
  });

  it('carries pagination and search through', () => {
    expect(params({ page: 3, limit: 50, search: 'panjabi' })).toEqual({
      page: '3',
      limit: '50',
      search: 'panjabi',
    });
  });

  it('translates the display status and visibility labels', () => {
    const result = params({ status: 'Pending Review', visibility: 'Unlisted' });
    expect(result.status).toBe('pending_review');
    expect(result.visibility).toBe('unlisted');
  });
});

// ─── Normalisation ───────────────────────────────────────

describe('normalizeBackendProduct', () => {
  it('stringifies a numeric id', () => {
    // Route params are strings; a number here breaks `===` comparisons.
    expect(normalizeBackendProduct(backend({ id: 42 })).id).toBe('42');
  });

  it('computes margin as a percentage of the base price', () => {
    const p = normalizeBackendProduct(backend({ basePrice: 400, platformPrice: 500 }));
    expect(p.margin).toBe(25);
    expect(p.sellingPrice).toBe(500);
  });

  it('rounds margin to two decimal places', () => {
    const p = normalizeBackendProduct(backend({ basePrice: 3, platformPrice: 4 }));
    expect(p.margin).toBe(33.33);
  });

  it('reports zero margin rather than Infinity for a zero base price', () => {
    const p = normalizeBackendProduct(backend({ basePrice: 0, platformPrice: 100 }));
    expect(p.margin).toBe(0);
  });

  it('handles a negative margin — sold below cost', () => {
    expect(normalizeBackendProduct(backend({ basePrice: 400, platformPrice: 300 })).margin).toBe(-25);
  });

  it('falls back to the base price when no platform price is sent', () => {
    const p = normalizeBackendProduct(backend({ basePrice: 400, platformPrice: undefined }));
    expect(p.sellingPrice).toBe(400);
    expect(p.margin).toBe(0);
  });

  it('defaults MOQ to 1, not 0 — a zero minimum order is unorderable', () => {
    expect(normalizeBackendProduct(backend({ moq: undefined })).moq).toBe(1);
    expect(normalizeBackendProduct(backend({ moq: 0 })).moq).toBe(1);
  });

  describe('stock', () => {
    it('mirrors total stock into available when the server omits it', () => {
      const p = normalizeBackendProduct(backend({ stock: 30, availableStock: undefined }));
      expect(p.availableStock).toBe(30);
      expect(p.reservedStock).toBe(0);
    });

    it('keeps a genuine zero available stock — everything is reserved', () => {
      // `??` not `||`: with `||`, a fully reserved product would display its
      // total stock as available and be over-sold.
      const p = normalizeBackendProduct(backend({ stock: 30, availableStock: 0, reservedStock: 30 }));
      expect(p.availableStock).toBe(0);
      expect(p.reservedStock).toBe(30);
    });
  });

  describe('image selection', () => {
    it('prefers an explicit imageUrl', () => {
      const p = normalizeBackendProduct(
        backend({ imageUrl: 'https://cdn/hero.jpg', media: [{ url: 'https://cdn/other.jpg', position: 0 }] }),
      );
      expect(p.imageUrl).toBe('https://cdn/hero.jpg');
    });

    it('picks position 0 from media, not the first array entry', () => {
      // The server does not guarantee media order; position is the identity.
      const p = normalizeBackendProduct(
        backend({
          media: [
            { url: 'https://cdn/back.jpg', position: 2 },
            { url: 'https://cdn/poster.jpg', position: 0 },
          ],
        }),
      );
      expect(p.imageUrl).toBe('https://cdn/poster.jpg');
    });

    it('falls back to the first entry when no position 0 exists', () => {
      const p = normalizeBackendProduct(backend({ media: [{ url: 'https://cdn/a.jpg', position: 3 }] }));
      expect(p.imageUrl).toBe('https://cdn/a.jpg');
    });

    it('is an empty string when there is no media at all', () => {
      expect(normalizeBackendProduct(backend()).imageUrl).toBe('');
    });
  });

  describe('status and visibility', () => {
    it('defaults a missing status to Approved', () => {
      expect(normalizeBackendProduct(backend({ status: undefined })).status).toBe('Approved');
    });

    it('title-cases an unmapped status instead of showing raw snake_case', () => {
      expect(normalizeBackendProduct(backend({ status: 'awaiting_stock' })).status).toBe(
        'Awaiting stock',
      );
    });

    it('defaults a missing visibility to Public', () => {
      expect(normalizeBackendProduct(backend({ visibility: undefined })).visibility).toBe('Public');
    });

    it('treats anything that is not Private as Public', () => {
      // Visibility is binary in the UI; an unknown value must not render blank.
      expect(normalizeBackendProduct(backend({ visibility: 'nonsense' })).visibility).toBe('Public');
    });
  });

  describe('catalogue labels', () => {
    const labels = {
      categories: { 'cat-1': 'Menswear' },
      subCategories: {},
      productGroups: {},
      classifications: {},
      productDetails: {},
    };

    it('resolves a known category id to its name', () => {
      expect(normalizeBackendProduct(backend({ categoryId: 'cat-1' }), labels).category).toBe(
        'Menswear',
      );
    });

    it('shows a truncated id when the name is not loaded yet', () => {
      // Better a recognisable stub than a blank cell that reads as "no category".
      const p = normalizeBackendProduct(backend({ categoryId: '01234567-89ab' }), labels);
      expect(p.category).toBe('01234567…');
    });

    it('shows an em dash when there is no category at all', () => {
      expect(normalizeBackendProduct(backend({ categoryId: undefined }), labels).category).toBe('—');
    });
  });

  it('coerces every absent field to a safe empty value', () => {
    // The table renders these directly; `undefined` shows as blank but breaks
    // any `.toLowerCase()` in a filter.
    const p = normalizeBackendProduct(backend());
    expect(p.name).toBe('Cotton Panjabi');
    expect(p.description).toBe('');
    expect(p.brandName).toBe('');
    expect(p.videoUrl).toBe('');
    expect(p.trendTags).toEqual([]);
    expect(p.variations).toEqual([]);
    expect(p.availableSizes).toEqual([]);
    expect(p.isFeatured).toBe(false);
  });

  it('ignores non-array tags and variations rather than crashing', () => {
    const p = normalizeBackendProduct(
      backend({ productTags: 'not-an-array' as never, variations: null as never }),
    );
    expect(p.trendTags).toEqual([]);
    expect(p.variations).toEqual([]);
  });

  it('ignores a non-string description', () => {
    expect(normalizeBackendProduct(backend({ description: 42 as never })).description).toBe('');
  });
});

describe('normalizeProductListResponse', () => {
  it('maps every row and carries the pagination meta', () => {
    const result = normalizeProductListResponse({
      data: [backend({ id: 1 }), backend({ id: 2 })],
      meta: { total: 57, page: 3, limit: 20 },
    });
    expect(result.products.map((p) => p.id)).toEqual(['1', '2']);
    expect(result).toMatchObject({ total: 57, page: 3, limit: 20 });
  });

  it('defaults to page 1 with 20 per page', () => {
    const result = normalizeProductListResponse({ data: [], meta: { total: 0 } });
    expect(result).toMatchObject({ page: 1, limit: 20 });
  });

  it('falls back to the row count when the server omits the total', () => {
    // Otherwise the pager reads "0 total" over a page that clearly has rows.
    const result = normalizeProductListResponse({
      data: [backend()],
      meta: { total: undefined as never },
    });
    expect(result.total).toBe(1);
  });

  it('survives a missing data array', () => {
    const result = normalizeProductListResponse({
      data: undefined as never,
      meta: { total: 0 },
    });
    expect(result.products).toEqual([]);
  });

  it('applies the category names to every row', () => {
    const result = normalizeProductListResponse(
      { data: [backend({ categoryId: 'cat-1' })], meta: { total: 1 } },
      { 'cat-1': 'Menswear' },
    );
    expect(result.products[0]!.category).toBe('Menswear');
  });
});

/**
 * THE FIELD THE NORMALISER DELETED.
 *
 * `normalizeBackendProduct` builds an explicit object. It read `raw.media` to
 * derive `imageUrls` and then did not carry it, so `Product.media` was
 * `undefined` for every product in the console. The Add/Edit wizard hydrates
 * its six media slots from exactly that field — it needs `position` to know
 * which URL is the poster and which is the back — so opening ANY product with
 * photographs for edit showed six empty tiles, and step 4 then refused to
 * advance with "Upload at least one product image".
 *
 * Nothing caught it because the wizard's own tests build state directly, and
 * the hydrate read the field through a cast (`p as Product & { media?: ... }`)
 * that made the compiler accept a field the type did not have.
 */
describe('normalizeBackendProduct carries the media rows, not only their urls', () => {
  const rows = [
    { url: 'https://x/poster.jpg', mediaType: 'image', position: 0 },
    { url: 'https://x/detail.jpg', mediaType: 'image', position: 3 },
  ];

  it('keeps position, which imageUrls cannot express', () => {
    const p = normalizeBackendProduct(backend({ media: rows } as Partial<BackendProduct>));

    expect(p.media).toHaveLength(2);
    // Sparse on purpose: a poster and one detail shot are positions 0 and 3.
    // Flattened to `imageUrls` they are indices 0 and 1, and rebuilding slots
    // from that slides the detail shot into the FRONT.
    expect(p.media?.map((m) => m.position)).toEqual([0, 3]);
  });

  it('still derives imageUrls from them, as the catalogue expects', () => {
    const p = normalizeBackendProduct(backend({ media: rows } as Partial<BackendProduct>));
    expect(p.imageUrls).toEqual(['https://x/poster.jpg', 'https://x/detail.jpg']);
  });
});

/**
 * FIVE MORE FIELDS THIS FUNCTION DELETED.
 *
 * Same shape as the `media` case above: an explicit field list, and anything
 * absent from it does not exist downstream. The Add/Edit wizard reads all of
 * these, through casts that hid their absence from the compiler.
 *
 * One assertion per field, by name, so a future drop says which one.
 */
describe('normalizeBackendProduct carries the fields the wizard edits', () => {
  const raw = () =>
    backend({
      hasVariant: true,
      sizeType: 'LETTER',
      variationColors: ['Red', 'Blue'],
      variationDesigns: ['Matte'],
      productTags: ['new'],
      lowStockAlert: 12,
    } as Partial<BackendProduct>);

  it.each([
    ['hasVariant', true],
    ['sizeType', 'LETTER'],
    ['lowStockAlert', 12],
  ])('carries %s', (field, expected) => {
    expect(normalizeBackendProduct(raw())[field as 'sizeType']).toEqual(expected);
  });

  it('carries the variant axes', () => {
    const p = normalizeBackendProduct(raw());
    expect(p.variationColors).toEqual(['Red', 'Blue']);
    expect(p.variationDesigns).toEqual(['Matte']);
  });

  it('carries productTags AND keeps trendTags', () => {
    // The catalogue reads `trendTags`; the wizard reads `productTags`. Renaming
    // one into the other is what lost tags on every edit, so both are emitted
    // rather than one being renamed out from under its reader.
    const p = normalizeBackendProduct(raw());
    expect(p.productTags).toEqual(['new']);
    expect(p.trendTags).toEqual(['new']);
  });
});
