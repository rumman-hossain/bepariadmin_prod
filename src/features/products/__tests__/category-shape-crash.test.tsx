// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { render, cleanup, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { queryKeys } from '@/src/app/queryClient';

/**
 * THE CRASH, AS A REGRESSION TEST.
 *
 * MEASURED ON DEV: clicking Suppliers, then Products, replaced the entire
 * console with "Application Error". React error #31 — `object with keys {id,
 * name, slug, sortOrder, createdAt}`.
 *
 * The Suppliers list cached the categories as an ARRAY (`useCategoryOptions`).
 * The Products screen read the same key expecting a `Record<id, name>` and did
 * `Object.entries(...)`, which over an array yields `[["0", {…}]]` — so a
 * category OBJECT became a `<option>` label.
 *
 * The two hooks now project from ONE fetch, so they cannot disagree. These
 * tests run them against a SHARED QueryClient in the order that used to break,
 * because the collision only ever appeared when two screens met.
 */

const CATEGORIES = [
  { id: '8809d64f', name: 'Gents Textile', slug: 'gents-textile', sortOrder: 1, createdAt: '2026-05-13' },
  { id: 'b76db06e', name: 'Cosmetics & Beauty', slug: 'cosmetics', sortOrder: 3, createdAt: '2026-05-13' },
];

const getCategories = vi.fn();
vi.mock('@/src/api/products', async () => {
  const actual = await vi.importActual<typeof import('@/src/api/products')>('@/src/api/products');
  return { ...actual, getCategories: () => getCategories() };
});

const { useCategoryOptions } = await import('@/src/hooks/useCategoryOptions');
const { useCategoryNamesQuery } = await import('@/src/features/products/queries');

let qc: QueryClient;

beforeEach(() => {
  getCategories.mockReset();
  getCategories.mockResolvedValue({ ok: true, status: 200, data: CATEGORIES });
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});
afterEach(cleanup);

const wrap = (ui: ReactNode) => render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);

/** What the Suppliers list mounts. */
function SuppliersProbe() {
  const { categories } = useCategoryOptions();
  return <div data-testid="options">{categories.map((c) => c.name).join('|')}</div>;
}

/**
 * What the Products screen does, verbatim: `Object.entries` over the name map,
 * then the label into an `<option>`. This is the exact line that crashed.
 */
function ProductsProbe() {
  const { data: categoryNames = {} } = useCategoryNamesQuery();
  const options = [
    { label: 'All Categories', value: 'All' },
    ...Object.entries(categoryNames).map(([value, label]) => ({ label, value })),
  ];
  return (
    <select aria-label="Category">
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

describe('Suppliers then Products, on one cache', () => {
  it('does not throw', async () => {
    /*
     * The reproduction. Before the fix this threw React #31 during the second
     * render and the boundary swallowed the whole app.
     */
    wrap(<SuppliersProbe />);
    await screen.findByText(/Gents Textile/);

    expect(() => wrap(<ProductsProbe />)).not.toThrow();
    await waitFor(() =>
      expect(screen.getByRole('option', { name: 'Gents Textile' })).toBeTruthy(),
    );
  });

  it('every option label is a string, never an object', async () => {
    /*
     * The precise failure. `Object.entries` over an array gives numeric-string
     * keys and OBJECT values, so `label` became `{id, name, slug, …}` — which
     * React refuses to render as a child.
     */
    wrap(<SuppliersProbe />);
    await screen.findByText(/Gents Textile/);
    cleanup();

    wrap(<ProductsProbe />);
    await waitFor(() => expect(screen.getAllByRole('option').length).toBeGreaterThan(1));

    for (const option of screen.getAllByRole('option')) {
      expect(option.textContent).not.toMatch(/\[object Object\]/);
      expect(option.textContent?.trim().length ?? 0).toBeGreaterThan(0);
    }
  });

  it('fetches ONCE for both consumers', async () => {
    // One key, one queryFn. Two fetches would mean two shapes are back.
    wrap(
      <>
        <SuppliersProbe />
        <ProductsProbe />
      </>,
    );
    // Both probes render the name, so target the picker's own node rather
    // than a text match that legitimately hits two elements.
    await waitFor(() =>
      expect(screen.getByTestId('options').textContent).toContain('Gents Textile'),
    );
    await waitFor(() => expect(getCategories).toHaveBeenCalledTimes(1));
  });
});

describe('Products then Suppliers, the other order', () => {
  it('the picker still gets a list it can map over', async () => {
    /*
     * The mirror image, which used to fail differently: `useCategoryOptions`
     * would receive the Record and `categories.map` would throw "not a
     * function". Both directions now project from the same array.
     */
    wrap(<ProductsProbe />);
    await waitFor(() => expect(screen.getAllByRole('option').length).toBeGreaterThan(1));
    cleanup();

    wrap(<SuppliersProbe />);
    await waitFor(() =>
      expect(screen.getByTestId('options').textContent).toBe('Gents Textile|Cosmetics & Beauty'),
    );
  });
});

describe('a wrong shape written directly to the cache', () => {
  it('leaves the picker empty rather than throwing', async () => {
    /*
     * Belt and braces. `select` guarantees the shape today, but a persisted
     * cache or a stray `setQueryData` could still put the wrong thing there —
     * and `categories.map is not a function` would take the screen down just as
     * thoroughly as the object-as-child did.
     */
    qc.setQueryData(queryKeys.catalog.categories(), { notAnArray: true });
    expect(() => wrap(<SuppliersProbe />)).not.toThrow();
    expect(screen.getByTestId('options').textContent).toBe('');
  });
});
