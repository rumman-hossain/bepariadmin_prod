// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { queryKeys } from '@/src/app/queryClient';
import { useAdminProductsQuery } from '../queries';
import type { AdminProductListParams } from '../types/adminProduct';

/**
 * The product-list race, and why it is now structurally impossible.
 *
 * The store version had no staleness guard: with an undebounced search box
 * firing one request per keystroke, whichever response landed last won, so the
 * list could settle on results for "shi" after "shirt" had already returned.
 * I first fixed that with a generation counter — a correct but hand-rolled
 * guard that every future fetch would have had to remember to use.
 *
 * Keying the cache by params removes the class of bug rather than the instance:
 * two searches are two cache entries, so there is no shared slot to race over.
 *
 * THIS FILE NOW TARGETS `useAdminProductsQuery`, because that is the hook the
 * list actually uses. It used to target `useProductsQuery`, which reads the
 * catalogue route — and when the list moved to `/admin/products`, these tests
 * kept passing against a hook with no remaining caller. A test that cannot fail
 * for the screen it names is worse than no test, so it moved with the screen.
 */

const listAdminProducts = vi.fn();

vi.mock('@/src/api/adminProducts', () => ({
  listAdminProducts: (...args: unknown[]) => listAdminProducts(...args),
  approveProduct: vi.fn(),
  rejectProduct: vi.fn(),
  publishProduct: vi.fn(),
  takeDownProduct: vi.fn(),
  submitProduct: vi.fn(),
  getProductAudit: vi.fn(),
}));

function page(names: string[], total = names.length) {
  return {
    ok: true,
    status: 200,
    data: {
      products: names.map((name, i) => ({
        id: `p-${name}`,
        name,
        sku: `WHL-00001-CAT-SUB-GRP-00${i}`,
        status: 'pending_review',
        visibility: 'private',
        state: 'PENDING',
        categoryId: 'cat-1',
        supplierId: 'ws-1',
        supplierName: 'Karim Textiles',
        supplierCode: 'WHL-00001',
        hasVariant: false,
        variantCount: 0,
        basePrice: 100,
        sellingPrice: 120,
        marginPercent: 20,
        stock: 5,
        imageCount: 1,
        thumbnailUrl: '',
        createdBy: '',
        createdAt: '2026-08-01T00:00:00Z',
        updatedAt: '2026-08-01T00:00:00Z',
        deletedAt: null,
        deletionRequestedAt: null,
      })),
      page: 1,
      limit: 25,
      total,
      counts: { draft: 0, pending: total, approved: 0, public: 0, rejected: 0, removed: 0 },
    },
  };
}

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

const BASE: AdminProductListParams = { page: 1, limit: 25 };

let client: QueryClient;

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

/** Renders the query for a given search term and reports what it holds. */
function Probe({ search }: { search?: string }) {
  const { data } = useAdminProductsQuery({ ...BASE, search });
  return <div data-testid="names">{(data?.products ?? []).map((p) => p.name).join(',')}</div>;
}

beforeEach(() => {
  listAdminProducts.mockReset();
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
});

afterEach(() => {
  cleanup();
  client.clear();
});

describe('product list query keys', () => {
  it('gives each search term its own cache entry', () => {
    const a = queryKeys.products.adminList({ ...BASE, search: 'shi' });
    const b = queryKeys.products.adminList({ ...BASE, search: 'shirt' });
    expect(a).not.toEqual(b);
  });

  /*
   * The admin list and the catalogue list must NOT share a key.
   *
   * They answer different questions over different populations — one is
   * narrowed to approved+public — so a catalogue response sitting in the
   * admin screen's slot would show an operator a filtered catalogue and call
   * it every state. This is the same shape as the two category hooks that
   * shared a key and returned different types, which blanked the console.
   */
  it('does not collide with the catalogue list key', () => {
    const admin = queryKeys.products.adminList({ ...BASE });
    const catalogue = queryKeys.products.list({ ...BASE });
    expect(admin).not.toEqual(catalogue);
  });

  it('a slow response for an earlier search cannot overwrite a newer one', async () => {
    const slowOld = deferred<ReturnType<typeof page>>();
    const fastNew = deferred<ReturnType<typeof page>>();
    listAdminProducts.mockReturnValueOnce(slowOld.promise).mockReturnValueOnce(fastNew.promise);

    // "shi" is requested first, then superseded by "shirt".
    const view = render(<Probe search="shi" />, { wrapper });
    view.rerender(<Probe search="shirt" />);

    fastNew.resolve(page(['shirt']));
    await waitFor(() => expect(view.getByTestId('names').textContent).toBe('shirt'));

    // The stale response now lands. It writes to ITS OWN cache entry, so what
    // is on screen is untouched.
    slowOld.resolve(page(['shi-stale']));
    await new Promise((r) => setTimeout(r, 0));
    expect(view.getByTestId('names').textContent).toBe('shirt');
  });

  it('reuses the cache when the same search is requested again', async () => {
    listAdminProducts.mockResolvedValue(page(['lentil']));

    const view = render(<Probe search="lentil" />, { wrapper });
    await waitFor(() => expect(view.getByTestId('names').textContent).toBe('lentil'));
    const callsAfterFirst = listAdminProducts.mock.calls.length;

    view.rerender(<Probe search="lentil" />);
    await new Promise((r) => setTimeout(r, 0));

    // No second request: the params, and therefore the key, are unchanged.
    expect(listAdminProducts.mock.calls.length).toBe(callsAfterFirst);
  });

  it('sends the supplier filter to the API', async () => {
    listAdminProducts.mockResolvedValue(page([]));
    function WithSupplier() {
      useAdminProductsQuery({ ...BASE, supplierId: 'ws-42' });
      return null;
    }
    render(<WithSupplier />, { wrapper });
    await waitFor(() => expect(listAdminProducts).toHaveBeenCalled());
    expect((listAdminProducts.mock.calls[0][0] as AdminProductListParams).supplierId).toBe('ws-42');
  });

  it('sends the state filter, so a tab change refetches', async () => {
    listAdminProducts.mockResolvedValue(page([]));
    function WithState() {
      useAdminProductsQuery({ ...BASE, state: 'APPROVED' });
      return null;
    }
    render(<WithState />, { wrapper });
    await waitFor(() => expect(listAdminProducts).toHaveBeenCalled());
    expect((listAdminProducts.mock.calls[0][0] as AdminProductListParams).state).toBe('APPROVED');
  });
});
