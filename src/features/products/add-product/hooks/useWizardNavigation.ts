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
  /** Which step the discard prompt is standing in the way of. */
  const [pendingBackStep, setPendingBackStep] = useState<WizardStep>(2);
  /*
   * Whether the variant answer in flight should also advance to step 3.
   *
   * The dialog answers the question ON THE WAY to pricing, so it advances. The
   * toggle on step 2 answers it in place, and must not move the operator off the
   * step they are editing. Both routes can open the pricing-reuse prompt, so the
   * intent has to survive that round trip rather than being implied by which
   * function opened it.
   */
  const [pendingVariantAdvance, setPendingVariantAdvance] = useState(true);

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
    setPendingVariantAdvance(true);
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

      /*
       * Leaving pricing backwards discards it, so confirm first.
       *
       * `nextStep < 3`, not `nextStep === 2`. The step bar lets an operator
       * click any completed step, so 3 → 1 was a legal move that fell straight
       * through to setCurrentStep and skipped this prompt entirely — the
       * pricing was discarded later, silently, by whatever ran next. The exact
       * warning the operator gets for one backward step was absent for the
       * other, which is worse than not having it: it teaches them the wizard
       * asks before losing work.
       */
      if (currentStep === 3 && nextStep < 3) {
        if (isEditMode) setCurrentStep(nextStep as WizardStep);
        else {
          setPendingBackStep(nextStep as WizardStep);
          setPrompt('discard-pricing');
        }
        return;
      }

      setCurrentStep(nextStep as WizardStep);
    },
    [currentStep, isEditMode, state.hasVariant, state.variations, setField],
  );

  /*
   * ONE ANSWER, TWO WAYS OF GIVING IT.
   *
   * The dialog on the way to step 3, and the toggle on step 2 itself. They must
   * do the same work — seed the per-size maps, guard the pricing that a change
   * would discard, apply the colour axis — or the two routes drift and one of
   * them starts producing states the validator rejects.
   *
   * `advance` is the only difference between them.
   */
  const applyVariantAnswer = useCallback(
    (hasVariant: boolean, advance: boolean) => {
      setPrompt('none');
      setPendingVariantChoice(hasVariant);
      setPendingVariantAdvance(advance);

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
      if (advance) setCurrentStep(3);
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

  /** The dialog's answer: decide, then continue into pricing. */
  const chooseVariant = useCallback(
    (hasVariant: boolean) => applyVariantAnswer(hasVariant, true),
    [applyVariantAnswer],
  );

  /*
   * The step-2 toggle's answer: change it and stay put.
   *
   * WITHOUT THIS THE ANSWER WAS UNREACHABLE ON AN EDIT. `goToStep` skips the
   * dialog when `isEditMode`, so a product's variant answer was whatever it was
   * created as, for ever. The visible symptom was a missing field: Step2Details
   * hides "Variant colours" once `hasVariant === false`, so opening a
   * non-variant product for editing showed a step with no colour input and no
   * way to ask for one — the field simply was not there, and nothing said why.
   */
  const setVariantMode = useCallback(
    (hasVariant: boolean) => applyVariantAnswer(hasVariant, false),
    [applyVariantAnswer],
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
      // Only when the answer was given on the way to pricing. A toggle flipped
      // on step 2 must leave the operator on step 2 — being thrown forward after
      // confirming a discard reads as the confirmation having done something
      // else as well.
      if (pendingVariantAdvance) setCurrentStep(3);
      setPendingVariantAdvance(true);
    },
    [pendingVariantChoice, pendingVariantAdvance, resetPricing, applyVariantColors, setField],
  );

  const confirmDiscardPricing = useCallback(() => {
    resetPricing();
    setPrompt('none');
    // Where they actually asked to go. Hardcoding 2 sent an operator who
    // clicked step 1 in the bar to step 2 instead — a confirmation that
    // performs a different navigation than the one it was asked about.
    setCurrentStep(pendingBackStep);
    setPendingBackStep(2);
  }, [resetPricing, pendingBackStep]);

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
    setVariantMode,
    choosePricingReuse,
    confirmDiscardPricing,
    confirmReset,
  };
}
