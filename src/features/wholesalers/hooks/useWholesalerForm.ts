import { useState, useCallback } from 'react';
import { wholesalerSchema, type WholesalerFormData } from '../schemas/wholesalerSchema';
import { useCreateWholesaler, useUpdateWholesaler, useRefreshWholesalerDetail } from '../queries';
import { toWholesalerApiError } from '../api/errors';
import { attachWholesalerDocuments } from '../api/wholesalerApi';
import { validateWholesalerForm } from '../utils/formErrors';
import { DEFAULT_COMMISSION_RATE } from '../constants';

const EMPTY_WHOLESALER_FORM: WholesalerFormData = {
  companyName: '',
  categories: [],
  status: 'Active',
  ownerName: '',
  mobile: '',
  email: '',
  logoUrl: '',
  commissionRate: DEFAULT_COMMISSION_RATE,
  addresses: [
    {
      addressType: 'primary',
      division: '',
      district: '',
      postalCode: '',
      addressLine: '',
      isDefault: true,
    },
  ],
  bankDetailsList: [],
  digitalWallets: [],
  documents: [],
  password: '',
};

interface UseWholesalerFormOptions {
  initialData?: Partial<WholesalerFormData>;
  onSuccess?: (createdOrUpdated: { id: string }) => void | Promise<void>;
}

export function useWholesalerForm({ initialData, onSuccess }: UseWholesalerFormOptions = {}) {
  const createWholesaler = useCreateWholesaler();
  const updateWholesaler = useUpdateWholesaler();
  const refreshDetail = useRefreshWholesalerDetail();
  // Previously a single global `isMutating` shared by eight different actions,
  // so any write put every button on the page into a loading state.
  const isSubmitting = createWholesaler.isPending || updateWholesaler.isPending;
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [values, setValues] = useState<WholesalerFormData>({
    ...EMPTY_WHOLESALER_FORM,
    ...initialData,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const isEditing = !!values.id;

  /*
   * `initialData` is read once, at mount. The late-hydration effect that used
   * to live here is gone because callers now render this hook's owner only
   * after the data has loaded, and key it by supplier id — so a different
   * supplier gets a fresh form by remounting rather than by an effect
   * overwriting whatever the operator had already typed.
   */

  const setField = useCallback(<K extends keyof WholesalerFormData>(field: K, value: WholesalerFormData[K]) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field as string];
      return next;
    });
  }, []);

  const setFields = useCallback((partial: Partial<WholesalerFormData>) => {
    setValues((prev) => ({ ...prev, ...partial }));
  }, []);

  const validate = useCallback((): boolean => {
    const result = validateWholesalerForm(wholesalerSchema, values);
    if (result.success === false) {
      setErrors(result.errors);
      return false;
    }
    setErrors({});
    return true;
  }, [values]);

  const handleSubmit = useCallback(async (): Promise<boolean> => {
    setSubmitError(null);
    if (!validate()) return false;

    try {
      const result = values.id
        ? await updateWholesaler.mutateAsync({ id: values.id, dto: values })
        : await createWholesaler.mutateAsync(values);

      /*
       * Bind the upload draft — ON EDIT ONLY.
       *
       * Create claims its draft inside the transaction that inserts the
       * supplier, so doing it again here would re-claim a draft that is already
       * bound. Editing has no such moment, and without this a certificate
       * uploaded from that screen landed in a draft nobody ever claimed: the
       * slot said "done", a row was written, and the object it named had no
       * recorded owner — so the vault refused to open it.
       *
       * AFTER the PATCH, because the attach names an id the PATCH is not
       * allowed to change; and awaited, so onSuccess does not navigate to a
       * screen built before the documents landed.
       */
      if (values.id) {
        if (values.uploadDraftId) {
          await attachWholesalerDocuments(values.id, values.uploadDraftId);
        }

        /*
         * And only NOW refresh the supplier.
         *
         * The attach replaces documents by `doc_type`, so a replaced
         * certificate gets a NEW id and the old row is deleted. Refreshing when
         * the PATCH resolved — which is what the update mutation used to do —
         * filled the vault with ids the attach was about to destroy, and View
         * asked the server for a document that no longer existed.
         *
         * Awaited, because `invalidateQueries` only STARTS the refetch.
         */
        await refreshDetail(values.id);
      }

      await onSuccess?.({ id: result.id });
      return true;
    } catch (err) {
      // The old version returned false and discarded the error, forcing callers
      // to reach back into the store for it — CreatePage and EditPage both did
      // `useWholesalerStore.getState().error` for exactly that reason. The
      // reason for failure now comes back with the failure.
      setSubmitError(toWholesalerApiError(err).message);
      return false;
    }
  }, [validate, values, updateWholesaler, createWholesaler, refreshDetail, onSuccess]);

  return {
    values,
    errors,
    submitError,
    isSubmitting,
    setField,
    setFields,
    validate,
    handleSubmit,
    isEditing,
  };
}
