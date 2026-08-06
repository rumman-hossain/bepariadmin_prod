import { createContext, useContext } from 'react';
import type { WholesalerFormData } from '../../schemas/wholesalerSchema';
import type { WholesalerAssetsApi } from '../../hooks/useWholesalerAssets';

/**
 * The form context, its hook and the district list — everything in this corner
 * of the form that is not a component.
 *
 * Split out of `context.tsx` so that file exports only `WholesalerFormProvider`
 * and keeps Fast Refresh: editing the provider used to full-reload the page
 * mid-form, which on a 40-field supplier form means retyping it.
 */

export interface WholesalerFormContextValue {
  values: WholesalerFormData;
  setField: <K extends keyof WholesalerFormData>(field: K, value: WholesalerFormData[K]) => void;
  isSubmitting: boolean;
  /**
   * Resolves a nested error path.
   *
   * Zod reports `addresses.0.district` while the form asks for
   * `addresses.0.district` OR the section-level `addresses` — so a per-row
   * error and a whole-list error both reach the right field.
   */
  fieldError: (path: string) => string | undefined;
  mode: 'create' | 'edit';
  /**
   * The logo and document uploads, from ONE instance of `useWholesalerAssets`.
   *
   * It used to be called separately in BasicInfoSection and DocumentsSection.
   * The hook's own comment says "one draft shared by the logo and every
   * document", and with two instances that was simply not true: each held its
   * own `assetDraftId`, so the logo created one draft and the certificates
   * another. Nothing failed visibly — the logo is public and still rendered —
   * but its draft was never claimed by anybody.
   *
   * It matters more now. The create call sends ONE draft id and the server
   * validates the four required documents against the files in THAT draft. With
   * two drafts, whichever one the screen happened to send would be missing half
   * the files.
   */
  assets: WholesalerAssetsApi;
}

export const WholesalerFormContext = createContext<WholesalerFormContextValue | null>(null);

export function useWholesalerFormContext(): WholesalerFormContextValue {
  const ctx = useContext(WholesalerFormContext);
  // Failing loudly beats rendering a section with no data and looking like an
  // API problem.
  if (!ctx) throw new Error('Wholesaler form sections must be rendered inside <WholesalerFormProvider>.');
  return ctx;
}

export { DISTRICT_OPTIONS } from '@/src/constants/districts';
