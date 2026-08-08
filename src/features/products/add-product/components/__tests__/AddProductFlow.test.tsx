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

/*
 * Per-test overrides on the stubbed hook.
 *
 * The stub returns a fixed object, which is right for the pre-scolding tests
 * below but cannot open a prompt or change which product is loaded. Tests
 * assign to this before rendering; `beforeEach` clears it, so nothing leaks
 * between them.
 */
let overrides: Record<string, unknown> = {};

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
      cancelPrompt: vi.fn(),
      routeProductId: undefined as string | undefined,
      ...overrides,
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
  overrides = {};
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

/**
 * DISMISSING A QUESTION IS NOT AN ANSWER TO IT.
 *
 * The variant prompt was mounted with `onClose={() => handleVariantChoice(false)}`
 * and the pricing-reuse prompt with `onClose={() => handlePricingReuseChoice(true)}`.
 * Dialog calls onClose on Escape and on a backdrop click, so either gesture
 * silently answered the question and advanced the wizard.
 *
 * That is how step 3 ended up running its NON-variant branch on a product with
 * four variations in the store — `resolveHasVariant` short-circuits on an
 * explicit `false` — and demanding "MOQ/Alert required for all active sizes"
 * for a product nobody had said was plain.
 */
describe('a dismissed prompt makes no decision', () => {
  it('cancels the variant question on Escape instead of answering "no"', () => {
    const cancelPrompt = vi.fn();
    const handleVariantChoice = vi.fn();
    overrides = { showVariantPrompt: true, cancelPrompt, handleVariantChoice };
    render(<AddProductFlow onBack={() => {}} />);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(cancelPrompt).toHaveBeenCalled();
    expect(handleVariantChoice).not.toHaveBeenCalled();
  });

  it('cancels the pricing-reuse question instead of answering "keep"', () => {
    const cancelPrompt = vi.fn();
    const handlePricingReuseChoice = vi.fn();
    overrides = { showPricingReusePrompt: true, cancelPrompt, handlePricingReuseChoice };
    render(<AddProductFlow onBack={() => {}} />);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(cancelPrompt).toHaveBeenCalled();
    expect(handlePricingReuseChoice).not.toHaveBeenCalled();
  });

  it('still answers when a button is actually pressed', () => {
    const handleVariantChoice = vi.fn();
    overrides = { showVariantPrompt: true, handleVariantChoice };
    render(<AddProductFlow onBack={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: /yes, has variants/i }));
    expect(handleVariantChoice).toHaveBeenCalledWith(true);
  });
});

/**
 * Attempts belong to one pass through the form, not to the component.
 *
 * `attemptedSteps` only ever gained entries. `confirmReset` resets the store
 * and the step but not this local state, and navigating between two products'
 * edit URLs reuses the component rather than remounting it. So after a Reset,
 * or on opening a second product, step 1 appeared with every field already red
 * — the condition the feature exists to prevent.
 */
describe('errors do not survive a reset or a change of product', () => {
  it('clears the red when the wizard switches to another product', () => {
    overrides = { routeProductId: 'p1' };
    const { rerender } = render(<AddProductFlow onBack={() => {}} />);

    fireEvent.click(continueButton());
    // Twice: inline on the field and again in the summary banner.
    expect(screen.getAllByText(/product name is required/i).length).toBeGreaterThan(0);

    // The same component, now showing a different product.
    overrides = { routeProductId: 'p2' };
    rerender(<AddProductFlow onBack={() => {}} />);

    expect(screen.queryAllByText(/product name is required/i)).toHaveLength(0);
  });

  it('clears the red when the form is reset', () => {
    const handleResetForm = vi.fn();
    // The prompt is already open: the toolbar's Reset only opens it, and the
    // confirm inside is what clears the form.
    overrides = { showResetPrompt: true, handleResetForm };
    render(<AddProductFlow onBack={() => {}} />);

    fireEvent.click(continueButton());
    expect(screen.getAllByText(/product name is required/i).length).toBeGreaterThan(0);

    // Two buttons read "Reset" — the toolbar's and the prompt's confirm. The
    // confirm is the danger-styled one inside the dialog.
    const confirm = screen
      .getAllByRole('button', { name: /^reset$/i })
      .find((b) => b.closest('[role="dialog"]'));
    fireEvent.click(confirm!);

    expect(handleResetForm).toHaveBeenCalled();
    expect(screen.queryAllByText(/product name is required/i)).toHaveLength(0);
  });
});

