import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/src/components/ui/Button';
import { Modal } from '@/src/components/ui/Modal';
import { useAddProductStore } from '../store/useAddProductStore';
import { AddProductFlow } from '../components/AddProductFlow';
import { PRODUCT_ROUTES } from '../../routes';

export function AddProductPage() {
  const navigate = useNavigate();
  const { productId } = useParams<{ productId?: string }>();
  const reset = useAddProductStore((s) => s.reset);
  const [showResetPrompt, setShowResetPrompt] = useState(false);

  const isEditMode = Boolean(productId);
  const title = isEditMode ? 'Edit Product' : 'Add Product';

  const handleBack = () => navigate(PRODUCT_ROUTES.LIST);
  const handleReset = () => setShowResetPrompt(true);
  const confirmReset = () => {
    reset();
    setShowResetPrompt(false);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col">
      <header className="sticky top-0 z-10 bg-surface-app border-b border-border-default px-4 py-4 md:px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" iconLeft={ArrowLeft} onClick={handleBack}>
              Products
            </Button>
            <div>
              <h1 className="text-xl font-bold text-text-primary">{title}</h1>
              <p className="text-sm text-text-tertiary">6-step wizard — mobile parity</p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-6 md:px-6">
        <div className="max-w-4xl mx-auto">
          <AddProductFlow onBack={handleBack} onReset={handleReset} />
        </div>
      </main>

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
