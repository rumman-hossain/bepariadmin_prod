// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { VariantEditRow } from '../components/VariantEditRow';

/**
 * A PRICE SET AT REGISTRATION COULD NEVER BE CHANGED.
 *
 * Both the detail page and the list expansion rendered every figure as text.
 * The only way to correct a wrong cost was to delete the product and create it
 * again — while `PATCH /{id}/variations/{varId}` sat on the server, decoding a
 * whole ProductVariation, with no caller anywhere in the console.
 */

const updateVariation = vi.fn();
vi.mock('@/src/api/products', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/src/api/products')>()),
  updateVariation: (...args: unknown[]) => updateVariation(...args),
}));

const variation = (over: Record<string, unknown> = {}) =>
  ({
    id: 'var-1',
    subSku: 'WHL-1-V01',
    color: 'Red',
    subName: 'Red',
    basePrice: 600,
    sellingPrice: 690,
    stock: 12,
    ...over,
  }) as never;

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const show = (over?: Record<string, unknown>) =>
  render(<VariantEditRow productId="p-1" variation={variation(over)} />, { wrapper });

beforeEach(() => {
  updateVariation.mockReset();
  updateVariation.mockResolvedValue({ ok: true, status: 200, data: { data: {} } });
});
afterEach(cleanup);

const startEditing = () => fireEvent.click(screen.getByRole('button', { name: /edit red/i }));
const costBox = () => screen.getByLabelText('Cost') as HTMLInputElement;
const stockBox = () => screen.getByLabelText('Stock') as HTMLInputElement;

describe('a variant can be corrected', () => {
  it('offers an edit control at all', () => {
    show();
    expect(screen.getByRole('button', { name: /edit red/i })).toBeTruthy();
  });

  it('seeds the form from the variant as it stands', () => {
    show();
    startEditing();
    expect(costBox().value).toBe('600');
    expect(stockBox().value).toBe('12');
  });

  it('sends the new cost to the variation endpoint', async () => {
    show();
    startEditing();
    fireEvent.change(costBox(), { target: { value: '650' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(updateVariation).toHaveBeenCalled());
    expect(updateVariation).toHaveBeenCalledWith('p-1', 'var-1', { price: 650 });
  });

  it('sends ONLY what changed', async () => {
    // Echoing untouched fields back is how a colleague's concurrent edit gets
    // overwritten with a value this operator never looked at.
    show();
    startEditing();
    fireEvent.change(stockBox(), { target: { value: '40' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(updateVariation).toHaveBeenCalled());
    expect(updateVariation).toHaveBeenCalledWith('p-1', 'var-1', { stock: 40 });
  });

  it('re-seeds on reopen, so a cancelled edit cannot be saved later', () => {
    show();
    startEditing();
    fireEvent.change(costBox(), { target: { value: '999' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    startEditing();
    expect(costBox().value).toBe('600');
  });
});

describe('the selling price is the server’s', () => {
  /*
   * `ROUND(base_price * (1 + COALESCE(w.margin, 9.50)/100), 2)`. An input here
   * would invite a figure the next save recomputes, and model.go records the
   * cost of confusing the two: one field held both, the base price was
   * discarded, and order pricing read the wrong one.
   */
  it('shows it', () => {
    show();
    expect(screen.getAllByText(/690/).length).toBeGreaterThan(0);
  });

  it('offers no input for it while editing', () => {
    show();
    startEditing();
    expect(screen.queryByLabelText('Sells at')).toBeNull();
  });

  it('never sends it, even after the cost is changed', async () => {
    show();
    startEditing();
    fireEvent.change(costBox(), { target: { value: '700' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(updateVariation).toHaveBeenCalled());
    const sent = updateVariation.mock.calls[0][2] as Record<string, unknown>;
    expect(sent).not.toHaveProperty('sellingPrice');
  });
});

describe('when the save is refused', () => {
  it('says so and stays open, rather than reporting success', async () => {
    // `request` resolves for a 4xx too, so an unchecked call would close the
    // form and leave the operator believing a refused edit had been saved.
    updateVariation.mockResolvedValue({ ok: false, status: 409, data: null });
    show();
    startEditing();
    fireEvent.change(costBox(), { target: { value: '650' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(screen.getByRole('alert').textContent).toMatch(/409/);
    expect(costBox()).toBeTruthy();
  });

  it('refuses to save an empty form rather than sending nothing', () => {
    show();
    startEditing();
    fireEvent.change(costBox(), { target: { value: '' } });
    fireEvent.change(stockBox(), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(updateVariation).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeTruthy();
  });
});

describe('a variant the server did not identify', () => {
  it('cannot be edited, and the button says why', () => {
    // PATCH addresses a variation by id. Without one the button could only 404.
    show({ id: undefined });
    const btn = screen.getByRole('button', { name: /edit red/i }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(btn.title).toMatch(/no id on file/i);
  });
});
