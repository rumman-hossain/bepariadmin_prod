import { useCallback } from 'react';
import { useForm } from '@/src/hooks/useForm';
import { wholesalerSchema, type WholesalerFormData } from '../schemas/wholesalerSchema';
import { useWholesalerStore } from '../store';
import { createWholesaler, updateWholesaler as apiUpdateWholesaler } from '../api/wholesalerApi';
import { useToast } from '@/src/components/ui/Toast';

interface UseWholesalerFormOptions {
  initialData?: Partial<WholesalerFormData>;
  onSuccess?: () => void;
}

const emptyInitial: WholesalerFormData = {
  companyName: '',
  categories: [],
  status: 'Active',
  acceptanceRate: 100,
  dispatchSpeed: '24h',
  ownerName: '',
  mobile: '',
  email: '',
  logoUrl: '',
  commissionRate: 15,
  addresses: [
    {
      addressType: 'primary',
      division: '',
      district: '',
      postalCode: '',
      addressLine: '',
      isDefault: true,
    }
  ],
  bankDetailsList: [],
  digitalWallets: [],
  documents: [],
  password: '',
};

export function useWholesalerForm({ initialData, onSuccess }: UseWholesalerFormOptions = {}) {
  const addWholesaler = useWholesalerStore((s) => s.addWholesaler);
  const updateWholesaler = useWholesalerStore((s) => s.updateWholesaler);
  const isEditing = !!initialData?.id;
  const toast = useToast();

  const handleSubmit = useCallback(
    async (values: WholesalerFormData) => {
      try {
        if (isEditing && values.id) {
          // Real API call for edit
          const updated = await apiUpdateWholesaler(values.id, values);
          // Sync local store
          updateWholesaler(updated);
          toast.success('Supplier Profile Updated', `${values.companyName} profile has been saved successfully.`);
        } else {
          // Real API call for onboarding
          const created = await createWholesaler(values);
          // Sync local store
          addWholesaler(created);
          toast.success('Supplier Onboarded', `${values.companyName} has been registered successfully.`);
        }
        onSuccess?.();
      } catch (err: unknown) {
        console.error('Submit Wholesaler Form error:', err);
        const errMsg = err instanceof Error ? err.message : 'Something went wrong. Please check your network or try again.';
        toast.error('Failed to Save', errMsg);
      }
    },
    [isEditing, addWholesaler, updateWholesaler, onSuccess, toast],
  );

  return useForm<WholesalerFormData>({
    initialValues: { ...emptyInitial, ...initialData },
    schema: wholesalerSchema,
    onSubmit: handleSubmit,
  });
}