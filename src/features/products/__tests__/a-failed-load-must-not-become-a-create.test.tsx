// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useProductFormLifecycle } from '../add-product/hooks/useProductFormLifecycle';

/**
 * OPENING A PRODUCT TO EDIT IT, AND FAILING, MUST NOT CREATE A SECOND ONE.
 *
 * `useProductFormLifecycle` had no error field. On a 403, a 500 or a timeout it
 * fell through to `isHydrating:false` with `isEditMode` still at its INITIAL
 * `false` — never set, rather than set to false — so `/products/<id>/edit`
 * rendered a blank wizard headed "Add Product". `useProductRegistration` then
 * received a null `editingProductId` and took the `createProduct` branch.
 *
 * An operator on a bad connection opens a product, sees an empty form, fills it
 * in, and ships a duplicate. Nothing anywhere reported a failure.
 *
 * The two branches now set the mode EXPLICITLY beside the error, which is what
 * stops them drifting apart again.
 */

const getProductById = vi.fn();

vi.mock('@/src/api/products', () => ({
  getProductById: (...a: unknown[]) => getProductById(...a),
  getReservedSku: vi.fn().mockResolvedValue({ ok: false, data: {} }),
}));

function at(path: string) {
  return ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/products/:productId/edit" element={<>{children}</>} />
        <Route path="/products/new" element={<>{children}</>} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => getProductById.mockReset());
afterEach(cleanup);

describe('an edit route whose product will not load', () => {
  it.each([
    ['a 403', { ok: false, status: 403, data: null }],
    ['a 500', { ok: false, status: 500, data: null }],
  ])('%s reports an error and refuses edit mode', async (_label, response) => {
    getProductById.mockResolvedValue(response);
    const { result } = renderHook(() => useProductFormLifecycle(), {
      wrapper: at('/products/abc-123/edit'),
    });

    await waitFor(() => expect(result.current.isHydrating).toBe(false));

    expect(result.current.hydrateError).toBeTruthy();
    // The two that made it a create: both must be false/null, and explicitly so.
    expect(result.current.isEditMode).toBe(false);
    expect(result.current.editingProductId).toBeNull();
  });

  /*
   * The THROWN branch is not covered separately, deliberately.
   *
   * Vitest reports any `Promise.reject` built in a test body as an unhandled
   * error and fails on it, at the construction site, whether or not a handler is
   * attached — so a test for it reports on the harness rather than on the code.
   *
   * It is covered by construction instead: both failure paths call the same
   * `failHydrate` helper, and collapsing them onto one helper was itself part of
   * this fix. The previous bug existed precisely because the two branches were
   * written separately and neither set `isEditMode`.
   */

  it('leaves a genuinely new product with no error', async () => {
    // /products/new must not be told it failed to load something.
    const { result } = renderHook(() => useProductFormLifecycle(), {
      wrapper: at('/products/new'),
    });

    await waitFor(() => expect(result.current.isHydrating).toBe(false));
    expect(result.current.hydrateError).toBeNull();
    expect(result.current.isEditMode).toBe(false);
    expect(getProductById).not.toHaveBeenCalled();
  });
});
