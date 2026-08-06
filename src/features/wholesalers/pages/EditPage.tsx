import React from 'react';
import { useParams } from 'react-router-dom';
import { PageHeader } from '@/src/components/layout/primitives';
import { BlockingOverlay } from '@/src/components/shared/BlockingOverlay';
import { Button } from '@/src/components/controls';
import { EmptyState } from '@/src/components/feedback';
import { Skeleton, SkeletonText } from '@/src/components/feedback';
import { WholesalerForm } from '../components/WholesalerForm';
import { ResetWholesalerPasswordCard } from '../components/ResetWholesalerPasswordCard';
import { useWholesalerForm } from '../hooks/useWholesalerForm';
import { useWholesalerDetail } from '../hooks/useWholesalerDetail';
import { useWholesalerNavigation } from '../hooks/useWholesalerNavigation';
import { mapWholesalerToFormData } from '../utils/mapWholesalerToForm';
import { useToast } from '@/src/components/feedback/useToast';
import { AlertCircle } from 'lucide-react';
import type { Wholesaler } from '@/src/types/domain';

/**
 * Loads the supplier, then hands a fully-loaded one to the form.
 *
 * The split is what lets `useWholesalerForm` initialise from real data on its
 * first render. Previously the hook mounted with `initialData: undefined` — the
 * page's own "not loaded" guard sat *below* the hook call, as it must — and an
 * effect copied the data in once it arrived. That effect was a
 * `set-state-in-effect` warning and a real hazard: anything typed in the gap
 * between mount and hydration was overwritten.
 */
export function EditPage() {
  const { id } = useParams<{ id: string }>();
  const { goBackToList } = useWholesalerNavigation();
  const { wholesaler, isLoading, error } = useWholesalerDetail(id ?? null);

  if (!id) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="No supplier specified"
        message="This link is missing a supplier reference. Open the supplier from the list to edit it."
        action={<Button onClick={goBackToList}>Back to suppliers</Button>}
      />
    );
  }

  if (isLoading && !wholesaler) return <EditPageSkeleton />;

  if (!wholesaler) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Supplier not found"
        message={error ?? 'This supplier may have been removed, or you may not have access to it.'}
        action={<Button onClick={goBackToList}>Back to suppliers</Button>}
      />
    );
  }

  // Keyed by id so navigating straight from one supplier's edit form to
  // another's starts a clean form rather than carrying values across.
  return <EditWholesaler key={wholesaler.id} id={id} wholesaler={wholesaler} />;
}

function EditPageSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading supplier">
      <div className="space-y-2">
        <Skeleton className="h-7 w-72" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="rounded-2xl border border-rule-subtle bg-sheet p-6 space-y-6">
        <SkeletonText lines={2} />
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

function EditWholesaler({ id, wholesaler }: { id: string; wholesaler: Wholesaler }) {
  const { goBackToDetail } = useWholesalerNavigation();
  const toast = useToast();
  const [showValidationBanner, setShowValidationBanner] = React.useState(false);

  const { values, errors, submitError, isSubmitting, setField, handleSubmit, validate } =
    useWholesalerForm({
      initialData: mapWholesalerToFormData(wholesaler),
      onSuccess: async () => {
        toast.success('Supplier profile updated', `${values.companyName} has been saved.`);
        goBackToDetail(id);
      },
    });

  const handlePrimary = async () => {
    if (!validate()) {
      setShowValidationBanner(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setShowValidationBanner(false);
    const ok = await handleSubmit();
    if (!ok) toast.error('Failed to save', submitError ?? 'Could not update supplier profile.');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit ${wholesaler.companyName}`}
        subtitle="Modify business details, addresses, and documentation"
        onBack={() => goBackToDetail(id)}
      />

      <WholesalerForm
        mode="edit"
        values={values}
        errors={errors}
        isSubmitting={isSubmitting}
        setField={setField}
        showValidationBanner={showValidationBanner}
        onDismissValidationBanner={() => setShowValidationBanner(false)}
        onCancel={() => goBackToDetail(id)}
        submitLabel="Save Changes"
        onPrimaryAction={handlePrimary}
        credentialsAside={
          <ResetWholesalerPasswordCard
            wholesalerId={id}
            loginEmail={values.email}
            companyName={wholesaler.companyName}
          />
        }
      />

      <BlockingOverlay open={isSubmitting} title="Saving changes" detail="Do not close this tab." />
    </div>
  );
}
