import React from 'react';
import { BlockingOverlay } from '@/src/components/shared/BlockingOverlay';
import { PageHeader } from '@/src/components/layout/primitives';
import { ConfirmDialog } from '@/src/components/feedback';
import { WholesalerForm } from '../components/WholesalerForm';
import { useWholesalerForm } from '../hooks/useWholesalerForm';
import { useWholesalerNavigation } from '../hooks/useWholesalerNavigation';
import { useToast } from '@/src/components/feedback/useToast';

export function CreatePage() {
  const { goBackToList, goToDetail } = useWholesalerNavigation();
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [showValidationBanner, setShowValidationBanner] = React.useState(false);
  const toast = useToast();

  const { values, errors, submitError, isSubmitting, setField, handleSubmit, validate } = useWholesalerForm({
    onSuccess: async ({ id }) => {
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
            // The failure reason now travels with the failure, instead of the
            // page reaching back into the store to find out what went wrong.
            toast.error('Failed to Onboard', submitError ?? 'Could not create supplier.');
          }
        }}
        title="Confirm supplier onboarding"
        message={`Create the supplier account and profile for "${values.companyName}" (${values.email})?`}
        confirmLabel="Onboard supplier"
        cancelLabel="Review Again"
        tone="success"
        loading={isSubmitting}
      />

      <BlockingOverlay
        open={isSubmitting}
        title="Onboarding supplier"
        detail="Do not close or refresh this tab."
      />
    </div>
  );
}
