import { useCallback } from 'react';
import { useAddProductStore } from '../store/useAddProductStore';
import { resolveHasVariant } from '../utils/resolveHasVariant';
import { validateWizardStep, type ValidationResult } from '../utils/validateWizardStep';

export type { ValidationResult };

/**
 * Wizard validation, bound to the store.
 *
 * The rules themselves live in `utils/validateWizardStep` as pure functions —
 * this hook only decides when to read the store. It used to hold 250 lines of
 * cross-field logic behind 33 individual selectors, which made every rule
 * untestable without a React renderer.
 *
 * Validation reads the store imperatively at call time rather than subscribing
 * to all 33 fields. It only ever runs in response to a click, so a subscription
 * would buy nothing and cost a re-render of this hook's consumers on every
 * keystroke anywhere in the form.
 */
export function useFormValidation() {
  const hasVariantRaw = useAddProductStore((s) => s.hasVariant);
  const variations = useAddProductStore((s) => s.variations);
  const hasVariant = resolveHasVariant(hasVariantRaw, variations);

  const validateStep = useCallback(
    (step: number): ValidationResult =>
      validateWizardStep(step, useAddProductStore.getState()),
    [],
  );

  return { validateStep, hasVariant };
}
