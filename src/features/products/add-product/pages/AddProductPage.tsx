import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/src/components/ui/Button';
import { Modal } from '@/src/components/ui/Modal';
import { useAddProductStore } from '../store/useAddProductStore';
import { AddProductFlow } from '../components/AddProductFlow';
import { useProductFormLifecycle } from '../hooks/useProductFormLifecycle';
import { useProductStore } from '../../store';
import { PRODUCT_ROUTES } from '../../routes';

export function AddProductPage() {
  const navigate = useNavigate();
  const { productId } = useParams<{ productId?: string }>();
  const reset = useAddProductStore((s) => s.reset);
  const setProductStatus = useProductStore((s) => s.setProductStatus);
  const { productStatus, refetch } = useProductFormLifecycle();
  const [showResetPrompt, setShowResetPrompt] = useState(false);
  const [approving, setApproving] = useState(false);

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
    setApproving(true);
    try {
      await setProductStatus(productId, 'Approved');
      await refetch();
    } finally {
      setApproving(false);
    }
  };

  return (
    <div className="-m-6 md:-m-8 flex flex-col min-h-full">
      <header className="sticky top-0 z-10 shrink-0 bg-surface-app border-b border-border-default px-6 py-4 md:px-8">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="sm" iconLeft={ArrowLeft} onClick={handleBack}>
              Products
            </Button>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-text-primary truncate">{title}</h1>
              <p className="text-sm text-text-tertiary">Step wizard — mobile parity</p>
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
                loading={approving}
                onClick={() => void handleApprove()}
              >
                Approve
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col min-h-0 px-6 md:px-8 pb-4">
        <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col min-h-0">
          <AddProductFlow onBack={handleBack} onReset={handleReset} />
        </div>
      </div>

      <Modal open={showResetPrompt} onClose={() => setShowResetPrompt(false)} size="sm">
        <div className="p-6 space-y-4">
          <h3 className="text-lg font-semibold">Reset form?</h3>
          <p className="text-sm text-text-secondary">All entered data will be cleared.</p>
          <div className="flex gap-3">
            <Button variant="danger" onClick={confirmReset}>
              Reset
            </Button>
            <Button variant="outline" onClick={() => setShowResetPrompt(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
