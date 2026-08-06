// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { queryKeys } from '@/src/app/queryClient';
import { useProductsQuery, type ProductListParams } from '../queries';

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
 * These tests assert that property directly, because it is the thing that
 * replaced the guard.
 */

const getProducts = vi.fn();

vi.mock('@/src/api/products', () => ({
  getProducts: (...args: unknown[]) => getProducts(...args),
  getProductById: vi.fn(),
  getCategories: vi.fn(),
  updateProductStatus: vi.fn(),
  deleteProduct: vi.fn(),
}));

function page(names: string[], total = names.length) {
  return {
    ok: true,
    status: 200,
    data: {
      products: names.map((name, i) => ({
        id: `p-${name}`,
        name,
        sku: `SKU-${i}`,
        category: 'Rice',
        basePrice: 100,
        stock: 5,
        visibility: 'Public',
        wholesalerId: 'ws-1',
        status: 'Approved',
      })),
      page: 1,
      limit: 20,
      total,
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

const BASE: ProductListParams = { page: 1, limit: 20 };

let client: QueryClient;

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

/** Renders the query for a given search term and reports what it holds. */
function Probe({ search }: { search?: string }) {
  const { data } = useProductsQuery({ ...BASE, search }, {});
  return <div data-testid="names">{(data?.products ?? []).map((p) => p.name).join(',')}</div>;
}

beforeEach(() => {
  getProducts.mockReset();
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
    const a = queryKeys.products.list({ ...BASE, search: 'shi' });
    const b = queryKeys.products.list({ ...BASE, search: 'shirt' });
    expect(a).not.toEqual(b);
  });

  it('a slow response for an earlier search cannot overwrite a newer one', async () => {
    const slowOld = deferred<ReturnType<typeof page>>();
    const fastNew = deferred<ReturnType<typeof page>>();
    getProducts.mockReturnValueOnce(slowOld.promise).mockReturnValueOnce(fastNew.promise);

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
    getProducts.mockResolvedValue(page(['lentil']));

    const view = render(<Probe search="lentil" />, { wrapper });
    await waitFor(() => expect(view.getByTestId('names').textContent).toBe('lentil'));
    const callsAfterFirst = getProducts.mock.calls.length;

    view.rerender(<Probe search="lentil" />);
    await new Promise((r) => setTimeout(r, 0));

    // No second request: the params, and therefore the key, are unchanged.
    expect(getProducts.mock.calls.length).toBe(callsAfterFirst);
  });

  it('sends the wholesaler filter to the API', async () => {
    getProducts.mockResolvedValue(page([]));
    function WithWholesaler() {
      useProductsQuery({ ...BASE, wholesalerId: 'ws-42' }, {});
      return null;
    }
    render(<WithWholesaler />, { wrapper });
    await waitFor(() => expect(getProducts).toHaveBeenCalled());
    expect((getProducts.mock.calls[0][0] as ProductListParams).wholesalerId).toBe('ws-42');
  });

  it('surfaces a non-ok response as an error rather than empty data', async () => {
    getProducts.mockResolvedValue({ ok: false, status: 500 });
    function Failing() {
      const { error } = useProductsQuery({ ...BASE, search: 'boom' }, {});
      return <div data-testid="err">{error ? error.message : ''}</div>;
    }
    const view = render(<Failing />, { wrapper });
    await waitFor(() => expect(view.getByTestId('err').textContent).toMatch(/500/));
  });
});
