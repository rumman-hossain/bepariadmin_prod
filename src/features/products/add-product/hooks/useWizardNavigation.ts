import { useCallback, useMemo, useState } from 'react';
import type { WizardState } from '../../types/registration';
import { resolveHasVariant } from '../utils/resolveHasVariant';

export type WizardStep = 1 | 2 | 3 | 4 | 5 | 6;

/** Which confirmation dialog, if any, is open. Only one can be. */
export type WizardPrompt =
  | 'none'
  | 'variant'
  | 'pricing-reuse'
  | 'discard-pricing'
  | 'reset'
  | 'submit';

interface Params {
  isEditMode: boolean;
  state: Pick<
    WizardState,
    | 'hasVariant'
    | 'variations'
    | 'colors'
    | 'basePrice'
    | 'stock'
    | 'moq'
    | 'sizeStockSet'
    | 'moqSet'
    | 'sizeLowStockAlertSet'
    | 'selectedSizes'
  >;
  setField: <K extends keyof WizardState>(field: K, value: WizardState[K]) => void;
  resetPricing: () => void;
  resetForm: () => void;
}

/**
 * Step transitions and the confirmation dialogs that gate them.
 *
 * Six independent `useState<boolean>` flags used to model the dialogs, which
 * permitted states the UI has no rendering for — two dialogs open at once, or
 * the variant prompt still open behind the pricing-reuse prompt that it opened.
 * A single `prompt` value makes those states unrepresentable.
 *
 * The transitions that need a gate are both around step 2 ⇄ 3, because step 3's
 * shape depends on the variant answer and moving between them can discard
 * pricing the operator has already entered. Edit mode skips both: the product
 * already has an answer, so re-asking would be noise.
 */
export function useWizardNavigation({
  isEditMode,
  state,
  setField,
  resetPricing,
  resetForm,
}: Params) {
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [prompt, setPrompt] = useState<WizardPrompt>('none');
  const [pendingVariantChoice, setPendingVariantChoice] = useState<boolean | null>(null);

  const closePrompt = useCallback(() => setPrompt('none'), []);

  /*
   * DISMISSING A QUESTION IS NOT AN ANSWER TO IT.
   *
   * The variant prompt was mounted with `onClose={() => chooseVariant(false)}`
   * and the pricing-reuse prompt with `onClose={() => choosePricingReuse(true)}`.
   * Dialog calls onClose on Escape and on a backdrop click, so either gesture
   * silently answered "this product has no variants" — or "keep the pricing" —
   * and ran setCurrentStep(3).
   *
   * That is how an operator ended up on step 3 with `hasVariant === false` and
   * four variations still in the store: resolveHasVariant short-circuits on an
   * explicit false, so the wizard ran the NON-variant branch and demanded
   * "MOQ/Alert required for all active sizes" for a product it had just been
   * told, without being asked, had no variants.
   *
   * Cancelling clears the pending choice too. chooseVariant records the answer
   * before opening the pricing-reuse prompt, so leaving it set would let a
   * later confirmation apply a decision the operator backed out of.
   */
  const cancelPrompt = useCallback(() => {
    setPendingVariantChoice(null);
    setPrompt('none');
  }, []);

  /** Whether there is pricing work the operator would lose. */
  const hasExistingPricingData = useMemo(() => {
    const filled = (value: string | undefined) => Boolean(value && value !== '0');
    return (
      filled(state.basePrice) ||
      filled(state.stock) ||
      filled(state.moq) ||
      Object.values(state.sizeStockSet).some(filled) ||
      Object.values(state.moqSet).some(filled)
    );
  }, [state.basePrice, state.stock, state.moq, state.sizeStockSet, state.moqSet]);

  const applyVariantColors = useCallback(() => {
    if (!state.colors) return;
    setField(
      'variationColors',
      state.colors
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean),
    );
  }, [state.colors, setField]);

  const goToStep = useCallback(
    (nextStep: number) => {
      // Entering pricing: the answer decides what step 3 even looks like.
      if (currentStep === 2 && nextStep === 3) {
        if (!isEditMode) {
          setPrompt('variant');
          return;
        }
        if (state.hasVariant === null) {
          setField('hasVariant', resolveHasVariant(null, state.variations));
        }
        setCurrentStep(3);
        return;
      }

      // Leaving pricing backwards discards it, so confirm first.
      if (currentStep === 3 && nextStep === 2) {
        if (isEditMode) setCurrentStep(2);
        else setPrompt('discard-pricing');
        return;
      }

      setCurrentStep(nextStep as WizardStep);
    },
    [currentStep, isEditMode, state.hasVariant, state.variations, setField],
  );

  const chooseVariant = useCallback(
    (hasVariant: boolean) => {
      setPrompt('none');
      setPendingVariantChoice(hasVariant);

      // Without variants, every selected size needs a row in the three
      // per-size maps so the pricing step renders an input for each.
      if (!hasVariant) {
        const seed = (current: Record<string, string>) => {
          const next = { ...current };
          state.selectedSizes.forEach((size) => {
            if (next[size] === undefined) next[size] = '';
          });
          return next;
        };
        setField('moqSet', seed(state.moqSet));
        setField('sizeStockSet', seed(state.sizeStockSet));
        setField('sizeLowStockAlertSet', seed(state.sizeLowStockAlertSet));
      }

      // Switching variant mode reshapes pricing, so ask before discarding it.
      if (hasExistingPricingData) {
        setPrompt('pricing-reuse');
        return;
      }

      if (hasVariant) applyVariantColors();
      setField('hasVariant', hasVariant);
      setCurrentStep(3);
    },
    [
      hasExistingPricingData,
      state.selectedSizes,
      state.moqSet,
      state.sizeStockSet,
      state.sizeLowStockAlertSet,
      applyVariantColors,
      setField,
    ],
  );

  const choosePricingReuse = useCallback(
    (reusePrevious: boolean) => {
      if (!reusePrevious) resetPricing();
      if (pendingVariantChoice !== null) {
        if (pendingVariantChoice) applyVariantColors();
        setField('hasVariant', pendingVariantChoice);
      }
      setPendingVariantChoice(null);
      setPrompt('none');
      setCurrentStep(3);
    },
    [pendingVariantChoice, resetPricing, applyVariantColors, setField],
  );

  const confirmDiscardPricing = useCallback(() => {
    resetPricing();
    setPrompt('none');
    setCurrentStep(2);
  }, [resetPricing]);

  const confirmReset = useCallback(() => {
    resetForm();
    setCurrentStep(1);
    setPrompt('none');
  }, [resetForm]);

  return {
    currentStep,
    setCurrentStep,
    goToStep,
    prompt,
    setPrompt,
    closePrompt,
    cancelPrompt,
    hasExistingPricingData,
    chooseVariant,
    choosePricingReuse,
    confirmDiscardPricing,
    confirmReset,
  };
}
