import { describe, it, expect } from 'vitest';
import { normalizeBackendProduct } from '../utils/mapProduct';
import { productResponseSchema } from '../schemas/productSchema';
import { deriveProductState, LEGAL_VERBS } from '../types/adminProduct';

/**
 * WHAT THE SERVER SENDS HAS TO SURVIVE THE TRIP TO THE SCREEN.
 *
 * The product detail page rendered 21 of the 39 fields its own mapper produced,
 * and three more facts never got that far: Zod strips what it does not declare,
 * so `inventory`, `deleted` and `marginPercent` were dropped before any
 * component could ask for them.
 *
 * That page is the approval gate — approving publishes to retailers — so each
 * omission was an approver certifying something they could not see. These are
 * the two lossy joints, tested where the loss happened rather than through a
 * rendered page: a component test would pass against a mapper that silently
 * dropped the field, because there would be nothing to render either way.
 */

/** The shape `GET /api/v1/products/:id` actually returns. */
function serverPayload(overrides: Record<string, unknown> = {}) {
  return {
    id: 'p1',
    wholesalerId: 'w1',
    name: 'Cotton Shirt',
    sku: 'WHL-00001-GT-TS-TS-001',
    categoryId: 'c1',
    basePrice: 100,
    platformPrice: 120,
    marginPercent: 20,
    supplierName: 'Karim Textiles',
    supplierCode: 'WHL-99001',
    stock: 30,
    material: 'Cotton 100%',
    availableSizes: ['S', 'M', 'L'],
    videoUrl: 'gs://bucket/clip.mp4',
    productTags: ['eid', 'summer'],
    media: [
      { url: 'gs://bucket/a.jpg', mediaType: 'image', position: 0 },
      { url: 'gs://bucket/b.jpg', mediaType: 'image', position: 1 },
    ],
    inventory: [
      { size: 'S', stock: 20, moq: 5, lowStockAlert: 3 },
      { size: 'M', stock: 0, moq: 5, lowStockAlert: 3 },
      { size: 'L', stock: 10, moq: 5, lowStockAlert: 3 },
    ],
    ...overrides,
  };
}

describe('the mapper keeps what the approval screen judges on', () => {
  it('carries the per-size rows, not just a stock total', () => {
    const p = normalizeBackendProduct(serverPayload());
    // 20 + 0 + 10 = 30. The total looks healthy while M is empty — the size
    // people buy. A single number cannot express that, which is why the rows
    // have to arrive.
    expect(p.stock).toBe(30);
    expect(p.inventory).toHaveLength(3);
    expect(p.inventory?.find((r) => r.size === 'M')?.stock).toBe(0);
  });

  it('carries the sixth lifecycle state', () => {
    expect(normalizeBackendProduct(serverPayload({ deleted: true })).deleted).toBe(true);
    expect(normalizeBackendProduct(serverPayload()).deleted).toBe(false);
  });

  it("carries the server's margin so nothing re-derives it from two prices", () => {
    expect(normalizeBackendProduct(serverPayload()).marginPercent).toBe(20);
  });

  it('counts every image, not just the poster', () => {
    // `imageUrls` used to be `raw.imageUrls ?? []` against a server that sends
    // `media`, so it was always empty and the checklist read 0 for every
    // product ever shipped.
    const p = normalizeBackendProduct(serverPayload());
    expect(p.imageUrls).toHaveLength(2);
  });

  it('names the supplier, so an approver can see whose product they are judging', () => {
    // The payload carried only a UUID. Every rule on the detail screen is about
    // the supplier, and it could not say who they were.
    const p = normalizeBackendProduct(serverPayload());
    expect(p.supplierName).toBe('Karim Textiles');
    expect(p.supplierCode).toBe('WHL-99001');
  });

  it.each(['material', 'availableSizes', 'videoUrl', 'trendTags'])(
    'carries %s, which the specification tab omitted entirely',
    (field) => {
      const p = normalizeBackendProduct(serverPayload()) as Record<string, unknown>;
      expect(p[field]).toBeTruthy();
    },
  );
});

describe('the response schema does not strip them back out', () => {
  it('keeps inventory, deleted and marginPercent through validation', () => {
    const mapped = normalizeBackendProduct(serverPayload({ deleted: true }));
    const parsed = productResponseSchema.parse(mapped);

    expect(parsed.inventory).toHaveLength(3);
    expect(parsed.deleted).toBe(true);
    expect(parsed.marginPercent).toBe(20);
  });

  it('defaults them rather than failing a product that predates them', () => {
    const parsed = productResponseSchema.parse(normalizeBackendProduct(serverPayload()));
    expect(parsed.deleted).toBe(false);
    expect(parsed.marginPercent).toBe(20);
  });
});

describe('a taken-down product resolves to REMOVED and offers no verbs', () => {
  it('folds deleted ahead of status and visibility', () => {
    // The detail page called this with two arguments, so the third defaulted to
    // false and this branch was unreachable: a taken-down product rendered as
    // PUBLIC with an action rail offering verbs the server would refuse.
    expect(deriveProductState('Approved', 'Public', true)).toBe('REMOVED');
    expect(deriveProductState('Approved', 'Public', false)).toBe('PUBLIC');
  });

  it('has nothing left to do to it', () => {
    expect(LEGAL_VERBS.REMOVED).toEqual([]);
  });
});
