import { useMemo, type ReactNode } from 'react';
import type { WholesalerFormData } from '../../schemas/wholesalerSchema';
import { useWholesalerAssets } from '../../hooks/useWholesalerAssets';
import { WholesalerFormContext, type WholesalerFormContextValue } from './useWholesalerFormContext';

/**
 * Scoped state for the supplier form.
 *
 * The form is five sections over ~40 fields. Passing `values`, `errors`,
 * `setField`, `isSubmitting` and `mode` into each section would be five props
 * per section drilled two levels deep — and the previous version avoided that
 * by not splitting at all, which is how one component reached 608 lines.
 *
 * Context is the right tool *here specifically* because the consumers are all
 * descendants of one form and the value changes on every keystroke anyway:
 * there is no re-render to save by threading props, only noise to add.
 *
 * It is deliberately NOT a store. The form's state belongs to the screen that
 * owns the submit, so it stays in `useWholesalerForm` — this only distributes
 * it.
 */
export function WholesalerFormProvider({
  children,
  values,
  errors,
  setField,
  isSubmitting,
  mode,
}: {
  children: ReactNode;
  values: WholesalerFormData;
  errors: Record<string, string>;
  setField: <K extends keyof WholesalerFormData>(field: K, value: WholesalerFormData[K]) => void;
  isSubmitting: boolean;
  mode: 'create' | 'edit';
}) {
  /*
   * ONE instance of the upload hook, for the whole form.
   *
   * It used to be called separately by BasicInfoSection (for the logo) and
   * DocumentsSection (for the certificates). The hook's own comment says "one
   * draft shared by the logo and every document" — and with two instances that
   * was not true: each held its own `assetDraftId`, so the logo opened one draft
   * and the certificates another, and the logo's was never claimed by anyone.
   *
   * Nothing failed visibly, because the logo is public and still rendered. It
   * matters now: the create call sends ONE draft id and the server validates the
   * four required documents against the files in THAT draft.
   */
  const assets = useWholesalerAssets(values, setField);

  const value = useMemo<WholesalerFormContextValue>(
    () => ({
      values,
      setField,
      isSubmitting,
      mode,
      assets,
      fieldError: (path) => errors[path] ?? errors[path.split('.')[0]!],
    }),
    [values, errors, setField, isSubmitting, mode, assets],
  );

  return (
    <WholesalerFormContext.Provider value={value}>{children}</WholesalerFormContext.Provider>
  );
}
