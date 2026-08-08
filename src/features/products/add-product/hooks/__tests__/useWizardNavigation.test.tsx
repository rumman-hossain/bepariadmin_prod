// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWizardNavigation } from '../useWizardNavigation';
import { useAddProductStore } from '../../store/useAddProductStore';

/**
 * BACKWARD OUT OF PRICING, BY EITHER ROUTE.
 *
 * `goToStep` guarded `currentStep === 3 && nextStep === 2` and nothing else.
 * The step bar lets an operator click any COMPLETED step, so 3 → 1 was a legal
 * move that fell straight through to `setCurrentStep` and skipped the discard
 * prompt entirely — the pricing was cleared later, silently, by whatever ran
 * next.
 *
 * Warning the operator on one route and not the other is worse than not
 * warning at all: it teaches them the wizard asks before losing work, and then
 * it does not.
 */

/*
 * The hook takes state and setField as parameters rather than reading the
 * store, so the harness subscribes on its behalf — `useAddProductStore()` with
 * no selector is what re-renders it after a write, exactly as the real caller
 * does.
 */
function nav(isEditMode = false) {
  return renderHook(() => {
    const store = useAddProductStore();
    return useWizardNavigation({
      isEditMode,
      state: store,
      setField: store.setField,
      resetPricing: vi.fn(),
      resetForm: vi.fn(),
    });
  });
}

beforeEach(() => {
  useAddProductStore.getState().reset();
  useAddProductStore.setState({ basePrice: '100', hasVariant: true });
});

describe('leaving step 3 backwards', () => {
  it.each([2, 1])('asks before discarding when going to step %i', (target) => {
    const { result } = nav();
    act(() => result.current.setCurrentStep(3));
    act(() => result.current.goToStep(target));

    expect(result.current.prompt).toBe('discard-pricing');
    // Still on 3 — the prompt is standing in the way, not trailing the move.
    expect(result.current.currentStep).toBe(3);
  });

  it('goes where the operator actually asked once they confirm', () => {
    // `confirmDiscardPricing` hardcoded step 2, so clicking step 1 in the bar
    // and confirming landed on 2 — a confirmation performing a different
    // navigation than the one it asked about.
    const { result } = nav();
    act(() => result.current.setCurrentStep(3));
    act(() => result.current.goToStep(1));
    act(() => result.current.confirmDiscardPricing());

    expect(result.current.currentStep).toBe(1);
    expect(result.current.prompt).toBe('none');
  });

  it('does not ask in edit mode, where the pricing is the product\'s own', () => {
    const { result } = nav(true);
    act(() => result.current.setCurrentStep(3));
    act(() => result.current.goToStep(1));

    expect(result.current.prompt).toBe('none');
    expect(result.current.currentStep).toBe(1);
  });

  it('leaves forward moves alone', () => {
    const { result } = nav();
    act(() => result.current.setCurrentStep(3));
    act(() => result.current.goToStep(4));

    expect(result.current.prompt).toBe('none');
    expect(result.current.currentStep).toBe(4);
  });
});

/**
 * Dismissing a question must not answer it — see `cancelPrompt`.
 */
describe('cancelPrompt', () => {
  it('closes without recording a variant choice', () => {
    const { result } = nav();
    act(() => result.current.setCurrentStep(2));
    act(() => result.current.goToStep(3));
    expect(result.current.prompt).toBe('variant');

    act(() => result.current.cancelPrompt());

    expect(result.current.prompt).toBe('none');
    // Still on step 2: the question was never answered, so the wizard has no
    // basis for deciding what step 3 should look like.
    expect(result.current.currentStep).toBe(2);
    expect(useAddProductStore.getState().hasVariant).toBe(true);
  });
});
