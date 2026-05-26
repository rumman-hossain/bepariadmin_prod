import React from 'react';
import { useParams } from 'react-router-dom';
import { PageHeader } from '@/src/components/shared/PageHeader';
import { Button } from '@/src/components/ui/Button';
import { WholesalerForm } from '../components/WholesalerForm';
import { ResetWholesalerPasswordCard } from '../components/ResetWholesalerPasswordCard';
import { useWholesalerForm } from '../hooks/useWholesalerForm';
import { useWholesalerStore } from '../store';
import { useWholesalerNavigation } from '../hooks/useWholesalerNavigation';
import { mapWholesalerToFormData } from '../utils/mapWholesalerToForm';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/src/components/ui/Toast';

export function EditPage() {
  const { id } = useParams<{ id: string }>();
  const { goBackToList, goBackToDetail } = useWholesalerNavigation();
  const selectedWholesaler = useWholesalerStore((s) =>
    s.selectedWholesaler?.id === id ? s.selectedWholesaler : null,
  );
  const fetchWholesalerById = useWholesalerStore((s) => s.fetchWholesalerById);
  const isDetailLoading = useWholesalerStore((s) => s.isDetailLoading);
  const loadError = useWholesalerStore((s) => s.error);
  const toast = useToast();
  const [showValidationBanner, setShowValidationBanner] = React.useState(false);

  React.useEffect(() => {
    if (!id) return;
    if (selectedWholesaler?.id === id) return;
    fetchWholesalerById(id);
  }, [id, selectedWholesaler?.id, fetchWholesalerById]);

  const formInitialData = selectedWholesaler ? mapWholesalerToFormData(selectedWholesaler) : undefined;

  const { values, errors, isSubmitting, setField, handleSubmit, validate } = useWholesalerForm({
    initialData: formInitialData,
    onSuccess: async () => {
      toast.success('Supplier Profile Updated', `${values.companyName} has been saved successfully.`);
      if (id) goBackToDetail(id);
    },
  });

  if (!id) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        Invalid supplier ID.
      </div>
    );
  }

  if (isDetailLoading && !selectedWholesaler) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-3">
        <Loader2 className="w-8 h-8 text-[#007AFF] animate-spin" />
        <p className="text-sm">Loading supplier...</p>
      </div>
    );
  }

  if (!selectedWholesaler) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-slate-400">
        <p>{loadError ?? 'Wholesaler not found.'}</p>
        <Button variant="ghost" onClick={goBackToList}>
          Back to list
        </Button>
      </div>
    );
  }

  const handlePrimary = async () => {
    if (validate()) {
      setShowValidationBanner(false);
      const ok = await handleSubmit();
      if (!ok) {
        const err = useWholesalerStore.getState().error;
        toast.error('Failed to Save', err ?? 'Could not update supplier profile.');
      }
    } else {
      setShowValidationBanner(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit ${selectedWholesaler.companyName}`}
        subtitle="Modify business details, addresses, and documentation"
        onBack={() => goBackToDetail(id)}
      />

      <WholesalerForm
        mode="edit"
        values={values}
        errors={errors}
        isSubmitting={isSubmitting}
        setField={setField}
        validate={validate}
        showValidationBanner={showValidationBanner}
        onDismissValidationBanner={() => setShowValidationBanner(false)}
        onCancel={() => goBackToDetail(id)}
        submitLabel="Save Changes"
        onPrimaryAction={handlePrimary}
        credentialsAside={
          <ResetWholesalerPasswordCard
            wholesalerId={id}
            loginEmail={values.email}
            companyName={selectedWholesaler.companyName}
          />
        }
      />

      {isSubmitting && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-md pointer-events-none"
          aria-hidden="true"
        >
          <div className="pointer-events-auto bg-white dark:bg-[#1C1C1E] p-8 rounded-2xl border shadow-2xl flex flex-col items-center max-w-sm text-center space-y-4">
            <Loader2 className="w-12 h-12 text-[#007AFF] animate-spin" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Saving changes...</p>
          </div>
        </div>
      )}
    </div>
  );
}
