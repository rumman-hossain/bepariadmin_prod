// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { Step2Details } from '../Step2Details';
import { useAddProductStore } from '../../../store/useAddProductStore';

/**
 * "Why is add product missing and not editable" — Edit Product · Details.
 *
 * Step2Details hides "Variant colours" once `hasVariant === false`, which is
 * right in itself: buildProductPayload sends the colour axis only for a variant
 * product, so offering it elsewhere promises storage that does not happen.
 *
 * The defect was that on an edit the answer could not be changed. `goToStep`
 * skips the variant dialog when `isEditMode`, so a product created without
 * variants showed a step with no colour field and no control that could bring
 * one back.
 */

const store = () => useAddProductStore.getState();

beforeEach(() => {
  store().reset();
  useAddProductStore.setState({ selectedSizes: [], colors: '' });
});
afterEach(cleanup);

const show = (onChangeVariantMode?: (v: boolean) => void) =>
  render(<Step2Details sizeConfig={null} onChangeVariantMode={onChangeVariantMode} />);

const colourInput = () => screen.queryByLabelText('Variant colours');

describe('the colour field follows the variant answer', () => {
  it('is absent on a non-variant product', () => {
    useAddProductStore.setState({ hasVariant: false });
    show(vi.fn());
    expect(colourInput()).toBeNull();
  });

  it('is present on a variant product', () => {
    useAddProductStore.setState({ hasVariant: true });
    show(vi.fn());
    expect(colourInput()).toBeTruthy();
  });

  it('is present before the question has been answered', () => {
    // Add mode's first pass: null, so the field shows and the dialog decides.
    useAddProductStore.setState({ hasVariant: null });
    show(vi.fn());
    expect(colourInput()).toBeTruthy();
  });
});

describe('the answer is reachable, which is what was missing', () => {
  it('offers a Variants control once the question has been answered', () => {
    useAddProductStore.setState({ hasVariant: false });
    show(vi.fn());
    expect(screen.getByRole('button', { name: 'Has variants' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'No variants' })).toBeTruthy();
  });

  it('asks the wizard to switch variants on', () => {
    const onChange = vi.fn();
    useAddProductStore.setState({ hasVariant: false });
    show(onChange);
    fireEvent.click(screen.getByRole('button', { name: 'Has variants' }));
    // Routed through the hook, NOT written straight to the store: the change
    // has to seed the per-size maps and guard existing pricing first.
    expect(onChange).toHaveBeenCalledWith(true);
    expect(store().hasVariant).toBe(false);
  });

  it('shows which answer is current, and not only in colour', () => {
    useAddProductStore.setState({ hasVariant: false });
    show(vi.fn());
    expect(screen.getByRole('button', { name: 'No variants' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Has variants' }).getAttribute('aria-pressed')).toBe('false');
  });

  it('offers no Variants control while the question is unanswered', () => {
    // The dialog on Continue is what asks then; two controls for one decision
    // is how an operator ends up answering it twice, differently.
    useAddProductStore.setState({ hasVariant: null });
    show(vi.fn());
    expect(screen.queryByRole('button', { name: 'Has variants' })).toBeNull();
  });
});
