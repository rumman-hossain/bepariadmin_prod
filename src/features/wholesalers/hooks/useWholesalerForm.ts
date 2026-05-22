import { useCallback } from 'react';
import { useForm } from '@/src/hooks/useForm';
import { wholesalerSchema, type WholesalerFormData } from '../schemas/wholesalerSchema';
import { useWholesalerStore } from '../store';

interface UseWholesalerFormOptions {
  initialData?: Partial<WholesalerFormData>;
  onSuccess?: () => void;
}

const emptyInitial: WholesalerFormData = {
  companyName: '',
  category: 'Apparel',
  location: 'Dhaka',
  status: 'Active',
  acceptanceRate: 100,
  dispatchSpeed: '24h',
  ownerName: '',
  mobile: '',
  email: '',
  address: '',
  bkash: '',
  bankDetails: {
    bankName: '',
    accountName: '',
    accountNumber: '',
    branch: '',
    routing: '',
  },
  documents: [],
  username: '',
  password: '',
};

export function useWholesalerForm({ initialData, onSuccess }: UseWholesalerFormOptions = {}) {
  const addWholesaler = useWholesalerStore((s) => s.addWholesaler);
  const updateWholesaler = useWholesalerStore((s) => s.updateWholesaler);
  const isEditing = !!initialData?.id;

  const handleSubmit = useCallback(
    async (values: WholesalerFormData) => {
      const now = new Date().toISOString().split('T')[0];

      if (isEditing && values.id) {
        updateWholesaler({
          id: values.id,
          companyName: values.companyName,
          category: values.category,
          location: values.location,
          status: values.status,
          acceptanceRate: values.acceptanceRate ?? 100,
          dispatchSpeed: values.dispatchSpeed ?? '24h',
          riskScore: values.riskScore,
          createdAt: values.createdAt,
          ownerName: values.ownerName,
          mobile: values.mobile,
          email: values.email || undefined,
          address: values.address || undefined,
          bkash: values.bkash || undefined,
          commissionRate: values.commissionRate,
          bankDetails: values.bankDetails ? {
            bankName: values.bankDetails.bankName,
            accountName: values.bankDetails.accountName,
            accountNumber: values.bankDetails.accountNumber,
            branch: values.bankDetails.branch ?? '',
            routing: values.bankDetails.routing ?? '',
          } : undefined,
          documents: values.documents,
        });
      } else {
        addWholesaler({
          id: `WHL-${Date.now().toString().slice(-4)}`,
          companyName: values.companyName,
          category: values.category,
          location: values.location,
          status: 'Active',
          acceptanceRate: 100,
          dispatchSpeed: '24h',
          createdAt: now,
          ownerName: values.ownerName,
          mobile: values.mobile,
          email: values.email || undefined,
          address: values.address || undefined,
          bkash: values.bkash || undefined,
          bankDetails: values.bankDetails ? {
            bankName: values.bankDetails.bankName,
            accountName: values.bankDetails.accountName,
            accountNumber: values.bankDetails.accountNumber,
            branch: values.bankDetails.branch ?? '',
            routing: values.bankDetails.routing ?? '',
          } : undefined,
          documents: values.documents,
        });
      }

      onSuccess?.();
    },
    [isEditing, addWholesaler, updateWholesaler, onSuccess],
  );

  return useForm<WholesalerFormData>({
    initialValues: { ...emptyInitial, ...initialData },
    schema: wholesalerSchema,
    onSubmit: handleSubmit,
  });
}