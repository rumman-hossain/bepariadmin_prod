import React from 'react';
import { PageHeader } from '@/src/components/shared/PageHeader';
import { ConfirmDialog } from '@/src/components/shared/ConfirmDialog';
import { WholesalerForm } from '../components/WholesalerForm';
import { useWholesalerForm } from '../hooks/useWholesalerForm';
import { useWholesalerStore } from '../store';
import { useWholesalerNavigation } from '../hooks/useWholesalerNavigation';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/src/components/ui/Toast';

export function CreatePage() {
  const { goBackToList, goToDetail } = useWholesalerNavigation();
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [showValidationBanner, setShowValidationBanner] = React.useState(false);
  const fetchWholesalers = useWholesalerStore((s) => s.fetchWholesalers);
  const toast = useToast();

  const { values, errors, isSubmitting, setField, handleSubmit, validate } = useWholesalerForm({
    onSuccess: async ({ id }) => {
      await fetchWholesalers({ bustCache: true });
      toast.success('Supplier Onboarded', `${values.companyName} has been registered successfully.`);
      goToDetail(id);
    },
  });

  const tryOpenConfirm = () => {
    if (validate()) {
      setShowValidationBanner(false);
      setShowConfirm(true);
    } else {
      setShowValidationBanner(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Onboard New Supplier"
        subtitle="Fill in required logins, business details, addresses, and documentation"
        onBack={goBackToList}
      />

      <WholesalerForm
        mode="create"
        values={values}
        errors={errors}
        isSubmitting={isSubmitting}
        setField={setField}
        validate={validate}
        showValidationBanner={showValidationBanner}
        onDismissValidationBanner={() => setShowValidationBanner(false)}
        onCancel={goBackToList}
        submitLabel="Complete Onboarding"
        onPrimaryAction={tryOpenConfirm}
      />

      <ConfirmDialog
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={async () => {
          const ok = await handleSubmit();
          setShowConfirm(false);
          if (!ok) {
            const err = useWholesalerStore.getState().error;
            toast.error('Failed to Onboard', err ?? 'Could not create supplier.');
          }
        }}
        title="Confirm Wholesaler Onboarding"
        message={`Create the supplier account and profile for "${values.companyName}" (${values.email})?`}
        confirmLabel="Onboard Wholesaler"
        cancelLabel="Review Again"
        variant="success"
        loading={isSubmitting}
      />

      {isSubmitting && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-md animate-fade-in pointer-events-none"
          aria-hidden="true"
        >
          <div className="pointer-events-auto bg-white dark:bg-[#1C1C1E] p-8 rounded-2xl border shadow-2xl flex flex-col items-center max-w-sm text-center space-y-4">
            <Loader2 className="w-12 h-12 text-[#007AFF] animate-spin" />
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Onboarding Supplier</h3>
              <p className="text-xs text-slate-500">Please do not close or refresh this tab.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
