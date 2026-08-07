import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/src/components/controls';
import { Dialog } from '@/src/components/feedback';
import { useAddProductStore } from '../store/useAddProductStore';
import { AddProductFlow } from '../components/AddProductFlow';
import { EditProductSections } from '../components/EditProductSections';
import { useProductFormLifecycle } from '../hooks/useProductFormLifecycle';
import { useApproveProduct } from '../../queries';
import { PRODUCT_ROUTES } from '../../routes';
import { Text } from '@/src/components/data';

export function AddProductPage() {
  const navigate = useNavigate();
  const { productId } = useParams<{ productId?: string }>();
  const reset = useAddProductStore((s) => s.reset);
  // Mutation rather than a store action: it carries its own pending state and
  // invalidates the product caches on success, so the list reflects the
  // approval without a manual refetch.
  const approve = useApproveProduct();
  const { productStatus, refetch } = useProductFormLifecycle();
  const [showResetPrompt, setShowResetPrompt] = useState(false);

  const isEditMode = Boolean(productId);
  const title = isEditMode ? 'Edit Product' : 'Add Product';
  const canApprove = isEditMode && productStatus === 'Pending Approval' && productId;

  const handleBack = () => navigate(PRODUCT_ROUTES.LIST);
  const handleReset = () => setShowResetPrompt(true);
  const confirmReset = () => {
    reset();
    setShowResetPrompt(false);
  };

  const handleApprove = async () => {
    if (!productId) return;
    await approve.mutateAsync({ id: productId });
    await refetch();
  };

  return (
    <div className="-m-6 md:-m-8 flex flex-col min-h-full">
      <header className="sticky top-0 z-10 shrink-0 bg-paper border-b border-rule px-6 py-4 md:px-8">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="sm" iconLeft={ArrowLeft} onClick={handleBack}>
              Products
            </Button>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-ink truncate">{title}</h1>
              <p className="text-sm text-ink-3">
                {isEditMode
                  ? 'Jump to any section — changes save together'
                  : 'Step wizard — mobile parity'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" iconLeft={RotateCcw} onClick={handleReset}>
              Reset
            </Button>
            {canApprove && (
              <Button
                variant="primary"
                size="sm"
                iconLeft={CheckCircle}
                loading={approve.isPending}
                onClick={() => void handleApprove()}
              >
                Approve
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col min-h-0 px-6 md:px-8 pb-4">
        {/*
          CREATE keeps the wizard; EDIT is one sectioned page.

          Not a preference. Creating a product has a genuine order to it — the
          SKU is generated from the classification cascade, and the variant
          question has to be settled before pricing can be laid out. Editing has
          none: the product exists, and the operator has come to change one
          field. Making them walk six steps to correct a price is the complaint
          this splits apart.

          Both render the SAME step components, so there is one definition of
          every input and the two cannot drift.
        */}
        <div
          className={
            isEditMode
              ? 'mx-auto w-full max-w-6xl flex-1'
              : 'max-w-4xl mx-auto w-full flex-1 flex flex-col min-h-0'
          }
        >
          {isEditMode ? (
            <EditProductSections onCancel={handleBack} />
          ) : (
            <AddProductFlow onBack={handleBack} />
          )}
        </div>
      </div>

      <Dialog open={showResetPrompt} onClose={() => setShowResetPrompt(false)} size="sm">
        <div className="p-6 space-y-4">
          <h3 className="text-lg font-semibold">Reset form?</h3>
          <Text as="p" variant="secondary">All entered data will be cleared.</Text>
          <div className="flex gap-3">
            <Button variant="danger" onClick={confirmReset}>
              Reset
            </Button>
            <Button variant="outline" onClick={() => setShowResetPrompt(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
