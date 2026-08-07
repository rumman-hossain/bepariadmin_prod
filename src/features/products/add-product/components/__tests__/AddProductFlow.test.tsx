// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { AddProductFlow } from '../AddProductFlow';
import { useAddProductStore } from '../../store/useAddProductStore';

/**
 * WHEN THE WIZARD IS ALLOWED TO GO RED.
 *
 * Validation runs on every render, so step 1's eight errors exist before the
 * operator has typed a character. The flow rendered them straight away and the
 * Continue button was `disabled={!validation.isValid}` — which is the pair of
 * decisions this file pins down, because they were mutually reinforcing:
 *
 *   - a blank form opened pre-scolded, so the red stopped carrying information
 *     long before the operator made a real mistake;
 *   - and a dead Continue meant "attempted to advance" was not an event this
 *     component could ever observe, so there was nothing else to key on.
 *
 * Continue is now live and refuses inside `goNext`, which is also the only way
 * an operator finds out WHY they are stuck.
 */

const handleStepChange = vi.fn();

vi.mock('../../hooks/useAddProductLogic', () => ({
  useAddProductLogic: () => {
    /*
     * The real hook calls `useAddProductStore()` with no selector, and that
     * whole-store subscription is what re-renders the flow — and so re-runs
     * `validateStep` — after a keystroke. `useFormValidation` reads the store
     * imperatively and subscribes to two fields only, deliberately.
     *
     * Without this line the stub is inert and the flow never re-validates, so
     * "the message clears when the field is filled" would fail against correct
     * code.
     */
    useAddProductStore();
    return {
      currentStep: 1,
      handleStepChange,
      showResetPrompt: false,
      setShowResetPrompt: vi.fn(),
      handleResetForm: vi.fn(),
      showVariantPrompt: false,
      handleVariantChoice: vi.fn(),
      showPricingReusePrompt: false,
      handlePricingReuseChoice: vi.fn(),
      showDiscardPricingPrompt: false,
      handleDiscardPricingConfirm: vi.fn(),
      setShowDiscardPricingPrompt: vi.fn(),
      showSubmitPrompt: false,
      setShowSubmitPrompt: vi.fn(),
      handleSubmitProduct: vi.fn(),
      registrationState: 'idle',
      activeSku: '',
      pricing: { base: 0, margin: 0, sell: 0 },
      handleGenerateVariations: vi.fn(),
      selectionType: 'none',
      setSelectionType: vi.fn(),
      listSearch: '',
      setListSearch: vi.fn(),
      categories: [],
      subCategories: [],
      productGroups: [],
      classifications: [],
      catalogLoading: false,
      handleGenerateSku: vi.fn(),
      isGeneratingSku: false,
      sizeConfig: null,
      platformMargin: 10,
      unitTypes: [],
      registrationError: null,
      isHydrating: false,
      isEditMode: false,
    };
  },
}));

vi.mock('@/src/features/wholesalers/api/wholesalerApi', () => ({
  listSuppliersForPicker: vi.fn(async () => []),
}));

const store = () => useAddProductStore.getState();
const continueButton = () => screen.getByRole('button', { name: /continue/i });

beforeEach(() => {
  store().reset();
  handleStepChange.mockClear();
});
afterEach(cleanup);

describe('step 1 errors wait for an attempt to advance', () => {
  it('opens a blank form with nothing marked wrong', () => {
    render(<AddProductFlow onBack={() => {}} />);

    expect(screen.queryByText('Supplier is required')).toBeNull();
    expect(screen.queryByText('Product name is required')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('marks the fields once Continue is pressed', () => {
    render(<AddProductFlow onBack={() => {}} />);
    fireEvent.click(continueButton());

    expect(screen.getAllByText('Supplier is required').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Product name is required').length).toBeGreaterThan(0);
    expect(
      screen.getByRole('button', { name: /supplier/i }).getAttribute('aria-invalid'),
    ).toBe('true');
  });

  it('leaves Continue pressable while the step is invalid', () => {
    // A disabled button fires no click, so there would be no attempt to
    // observe — and it refuses without saying what is missing.
    render(<AddProductFlow onBack={() => {}} />);
    expect((continueButton() as HTMLButtonElement).disabled).toBe(false);
  });

  it('does not advance on that press', () => {
    render(<AddProductFlow onBack={() => {}} />);
    fireEvent.click(continueButton());
    expect(handleStepChange).not.toHaveBeenCalled();
  });

  it('clears a field message as soon as that field is filled', () => {
    render(<AddProductFlow onBack={() => {}} />);
    fireEvent.click(continueButton());

    fireEvent.change(screen.getByLabelText(/product name/i), {
      target: { value: 'Cotton Shirt' },
    });

    expect(screen.queryByText('Product name is required')).toBeNull();
    // The rest of the step stays marked — the attempt is not undone by fixing
    // one of eight fields.
    expect(screen.getAllByText('Supplier is required').length).toBeGreaterThan(0);
  });

  it('advances once the step is actually valid', () => {
    useAddProductStore.setState({
      wholesalerId: 'w1',
      name: 'Cotton Shirt',
      brandName: 'Acme',
      unitType: 'Piece',
      categoryId: 'c1',
      productGroupId: 'g1',
      classificationId: 'cl1',
      sku: 'SHIRT-0001',
    });
    render(<AddProductFlow onBack={() => {}} />);

    fireEvent.click(continueButton());
    expect(handleStepChange).toHaveBeenCalledWith(2);
  });
});
