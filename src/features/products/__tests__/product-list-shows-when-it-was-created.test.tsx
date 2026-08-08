// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProductListPage } from '../pages/ProductListPage';
import type { AdminProductRow } from '../types/adminProduct';

/**
 * WHEN WAS THIS PRODUCT CREATED, AND WHEN WAS IT LAST EDITED?
 *
 * Neither question could be answered from this screen. Six columns, no date.
 * The one date-shaped thing in the table is the grey line under the State badge
 * — `formatAge(updatedAt)`, age IN STATE, which exists for queue triage, moves
 * whenever anybody edits the product, and never says when it came into being.
 *
 * And the page control sat only under the table, so turning the page meant
 * scrolling past twenty rows plus any expanded variants to reach it, then
 * scrolling back up to read where you landed.
 */

const row = (over: Partial<AdminProductRow> = {}): AdminProductRow =>
  ({
    id: 'p1',
    name: 'Cotton Panjabi',
    sku: 'WHL-00001-GT-TS-TS-001',
    status: 'pending_review',
    visibility: 'public',
    state: 'PENDING',
    categoryId: 'c1',
    supplierId: 'w1',
    supplierName: 'test-01',
    supplierCode: 'WHL-00001',
    hasVariant: false,
    variantCount: 0,
    basePrice: 250,
    sellingPrice: 275,
    marginPercent: 10,
    stock: 40,
    imageCount: 1,
    thumbnailUrl: '',
    createdBy: '',
    createdAt: '2026-01-05T09:00:00Z',
    updatedAt: '2026-01-05T09:00:00Z',
    deletedAt: null,
    deletionRequestedAt: null,
    ...over,
  }) as AdminProductRow;

const listState = {
  products: [row()],
  counts: undefined,
  filters: { state: 'All', search: '', category: 'All', wholesalerId: 'All' },
  pagination: { page: 1, limit: 20, total: 1 },
  categoryOptions: [],
  wholesalerOptions: [],
  isLoading: false,
  isFetching: false,
  error: null,
  refetch: vi.fn(),
  setFilter: vi.fn(),
  clearFilters: vi.fn(),
  setPage: vi.fn(),
};

vi.mock('../hooks/useProductList', () => ({
  useProductList: () => listState,
}));

vi.mock('../queries', () => ({
  useApproveProduct: () => ({ mutateAsync: vi.fn() }),
  useRejectProduct: () => ({ mutateAsync: vi.fn() }),
  useCategoryNamesQuery: () => ({ data: {} }),
}));

vi.mock('@/src/components/feedback', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/src/components/feedback')>()),
  useToast: () => ({ show: vi.fn() }),
}));

function show() {
  render(
    <MemoryRouter>
      <ProductListPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  listState.products = [row()];
  listState.pagination = { page: 1, limit: 20, total: 1 };
});
afterEach(cleanup);

describe('the created and edited dates', () => {
  it('shows the creation date, not the date it was last touched', () => {
    listState.products = [
      row({ createdAt: '2026-01-05T09:00:00Z', updatedAt: '2026-02-12T09:00:00Z' }),
    ];
    show();

    // Both, and the right way round: created plain, edited prefixed.
    expect(screen.getByText('5 Jan 2026')).toBeTruthy();
    expect(screen.getByText('edited 12 Feb 2026')).toBeTruthy();
  });

  it('says "never edited" rather than repeating the creation date', () => {
    // `updated_at` is set EQUAL to `created_at` on insert, so without this every
    // untouched product would claim it was edited on the day it was made — a
    // fact about the schema dressed up as a fact about the product.
    show();

    expect(screen.getByText('never edited')).toBeTruthy();
    expect(screen.queryByText('edited 5 Jan 2026')).toBeNull();
  });
});

describe('reaching the page control', () => {
  it('offers it above the table as well as below', () => {
    listState.pagination = { page: 1, limit: 20, total: 60 };
    show();

    const controls = screen.getAllByRole('navigation', { name: /product pages/i });
    expect(controls).toHaveLength(2);
    // Distinctly named, or a screen reader hears two identical "Next page"
    // buttons with nothing to choose between them.
    expect(controls[0].getAttribute('aria-label')).not.toBe(
      controls[1].getAttribute('aria-label'),
    );
  });

  it('announces the page number once, not once per copy', () => {
    listState.pagination = { page: 1, limit: 20, total: 60 };
    show();

    const live = screen
      .getAllByRole('navigation', { name: /product pages/i })
      .flatMap((nav) => Array.from(nav.querySelectorAll('[aria-live]')));
    expect(live).toHaveLength(1);
  });

  it('shows neither when everything fits on one page', () => {
    // They appear and disappear together — an operator never sees one without
    // the other, which would read as two different controls.
    show();
    expect(screen.queryAllByRole('navigation', { name: /product pages/i })).toHaveLength(0);
  });

  it('still lets the top copy turn the page', () => {
    listState.pagination = { page: 1, limit: 20, total: 60 };
    show();

    const top = screen.getAllByRole('navigation', { name: /product pages/i })[0];
    within(top).getByRole('button', { name: /next page/i }).click();

    expect(listState.setPage).toHaveBeenCalledWith(2);
  });
});
