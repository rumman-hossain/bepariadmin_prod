// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWizardNavigation } from '../useWizardNavigation';

/**
 * "Why is add product missing and not editable" — Edit Product · Details.
 *
 * `goToStep` skips the variant dialog when `isEditMode`, so a product's variant
 * answer was frozen at whatever it was created as. Step2Details hides the
 * "Variant colours" input once `hasVariant === false`, so opening a non-variant
 * product for editing showed a step with the field simply absent and no control
 * anywhere that could bring it back.
 *
 * Reproduced on dev against a real non-variant product: Add Product · Details
 * offers "Variant colours"; Edit Product · Details for WHL-00001-LT-SA-HS-093
 * renders only Material, Weight and Volume.
 */

const baseState = {
  colors: '',
  basePrice: '',
  stock: '',
  moq: '',
  selectedSizes: ['M'],
  moqSet: {},
  sizeStockSet: {},
  sizeLowStockAlertSet: {},
  hasVariant: false as boolean | null,
  variations: [] as unknown[],
};

function setup(overrides: Partial<typeof baseState> = {}, isEditMode = true) {
  const setField = vi.fn();
  const state = { ...baseState, ...overrides };
  const hook = renderHook(() =>
    useWizardNavigation({
      isEditMode,
      state: state as never,
      setField,
      resetPricing: vi.fn(),
      resetForm: vi.fn(),
    }),
  );
  return { ...hook, setField };
}

beforeEach(() => vi.clearAllMocks());

describe('the variant answer can be changed while editing', () => {
  it('turns a non-variant product into a variant one', () => {
    const { result, setField } = setup({ hasVariant: false });
    act(() => result.current.setVariantMode(true));
    expect(setField).toHaveBeenCalledWith('hasVariant', true);
  });

  it('stays on step 2 — changing the answer is not navigation', () => {
    const { result } = setup({ hasVariant: false });
    act(() => result.current.setCurrentStep(2));
    act(() => result.current.setVariantMode(true));
    expect(result.current.currentStep).toBe(2);
  });

  it('applies the colour axis when variants are switched on', () => {
    const { result, setField } = setup({ hasVariant: false, colors: 'Red, Blue' });
    act(() => result.current.setVariantMode(true));
    expect(setField).toHaveBeenCalledWith('variationColors', ['Red', 'Blue']);
  });

  it('seeds the per-size maps when variants are switched off', () => {
    // Without rows in these three maps step 3 renders no input for the size,
    // and the validator then demands figures nothing can supply.
    const { result, setField } = setup({ hasVariant: true, selectedSizes: ['M', 'L'] });
    act(() => result.current.setVariantMode(false));
    expect(setField).toHaveBeenCalledWith('moqSet', { M: '', L: '' });
    expect(setField).toHaveBeenCalledWith('sizeStockSet', { M: '', L: '' });
    expect(setField).toHaveBeenCalledWith('sizeLowStockAlertSet', { M: '', L: '' });
  });
});

describe('pricing already entered is not discarded without asking', () => {
  it('opens the discard guard instead of applying the change outright', () => {
    const { result, setField } = setup({ hasVariant: false, basePrice: '600' });
    act(() => result.current.setVariantMode(true));
    expect(result.current.prompt).toBe('pricing-reuse');
    // The answer must NOT be committed while the question is still open.
    expect(setField).not.toHaveBeenCalledWith('hasVariant', true);
  });

  it('applies the change but stays put once the guard is answered', () => {
    const { result, setField } = setup({ hasVariant: false, basePrice: '600' });
    act(() => result.current.setCurrentStep(2));
    act(() => result.current.setVariantMode(true));
    act(() => result.current.choosePricingReuse(true));
    expect(setField).toHaveBeenCalledWith('hasVariant', true);
    // The bug this guards: the dialog's path ends in setCurrentStep(3), and
    // sharing it would throw the operator forward off the step they were editing.
    expect(result.current.currentStep).toBe(2);
  });

  it('backing out of the guard leaves the answer alone', () => {
    const { result, setField } = setup({ hasVariant: false, basePrice: '600' });
    act(() => result.current.setVariantMode(true));
    act(() => result.current.cancelPrompt());
    expect(setField).not.toHaveBeenCalledWith('hasVariant', true);
    expect(result.current.prompt).toBe('none');
  });
});

describe('the dialog route still advances', () => {
  it('chooseVariant continues into pricing, as it always did', () => {
    const { result } = setup({ hasVariant: null }, false);
    act(() => result.current.chooseVariant(true));
    expect(result.current.currentStep).toBe(3);
  });

  it('and still advances after its own discard guard', () => {
    const { result } = setup({ hasVariant: null, basePrice: '600' }, false);
    act(() => result.current.chooseVariant(true));
    act(() => result.current.choosePricingReuse(true));
    expect(result.current.currentStep).toBe(3);
  });
});
