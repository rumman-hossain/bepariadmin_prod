import { useState, useCallback, useEffect, useRef } from 'react';
import { wholesalerSchema, type WholesalerFormData } from '../schemas/wholesalerSchema';
import { useWholesalerStore } from '../store';
import { validateWholesalerForm } from '../utils/formErrors';
import { DEFAULT_COMMISSION_RATE } from '../constants';

export const EMPTY_WHOLESALER_FORM: WholesalerFormData = {
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
  const createWholesalerFromForm = useWholesalerStore((s) => s.createWholesalerFromForm);
  const updateWholesalerFromForm = useWholesalerStore((s) => s.updateWholesalerFromForm);
  const isMutating = useWholesalerStore((s) => s.isMutating);

  const [values, setValues] = useState<WholesalerFormData>({
    ...EMPTY_WHOLESALER_FORM,
    ...initialData,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const hydratedIdRef = useRef<string | undefined>(undefined);
  /** Must follow values.id — initialData is undefined while edit page loads */
  const isEditing = !!values.id;

  useEffect(() => {
    if (!initialData?.id) return;
    if (hydratedIdRef.current === initialData.id) return;
    hydratedIdRef.current = initialData.id;
    setValues({ ...EMPTY_WHOLESALER_FORM, ...initialData });
    setErrors({});
  }, [initialData]);

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
    if (!validate()) return false;

    try {
      if (values.id) {
        const updated = await updateWholesalerFromForm(values.id, values);
        await onSuccess?.({ id: updated.id });
      } else {
        const created = await createWholesalerFromForm(values);
        await onSuccess?.({ id: created.id });
      }
      return true;
    } catch {
      return false;
    }
  }, [validate, values, updateWholesalerFromForm, createWholesalerFromForm, onSuccess]);

  return {
    values,
    errors,
    isSubmitting: isMutating,
    setField,
    setFields,
    validate,
    handleSubmit,
    isEditing,
  };
}
