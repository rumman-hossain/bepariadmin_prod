import React from 'react';
import { Check, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/src/components/ui/Button';
import { Modal } from '@/src/components/ui/Modal';
import { useAddProductLogic, type WizardStep } from '../hooks/useAddProductLogic';
import { useFormValidation } from '../hooks/useFormValidation';
import { SelectionModal } from './SelectionModal';
import { Step1BasicInfo } from './steps/Step1BasicInfo';
import { Step2Details } from './steps/Step2Details';
import { Step3Pricing } from './steps/Step3Pricing';
import { Step4Media } from './steps/Step4Media';
import { Step5Policies } from './steps/Step5Policies';
import { Step6Summary } from './steps/Step6Summary';

const STEPS: { num: WizardStep; label: string }[] = [
  { num: 1, label: 'Basic Info' },
  { num: 2, label: 'Details' },
  { num: 3, label: 'Pricing' },
  { num: 4, label: 'Media' },
  { num: 5, label: 'Policies' },
  { num: 6, label: 'Summary' },
];

interface Props {
  onBack: () => void;
  onReset: () => void;
}

export function AddProductFlow({ onBack, onReset }: Props) {
  const logic = useAddProductLogic();
  const { validateStep } = useFormValidation();

  const {
    currentStep,
    handleStepChange,
    showVariantPrompt,
    handleVariantChoice,
    showPricingReusePrompt,
    handlePricingReuseChoice,
    showDiscardPricingPrompt,
    handleDiscardPricingConfirm,
    setShowDiscardPricingPrompt,
    showSubmitPrompt,
    setShowSubmitPrompt,
    handleSubmitProduct,
    registrationState,
    activeSku,
    pricing,
    handleGenerateVariations,
    selectionType,
    setSelectionType,
    listSearch,
    setListSearch,
    categories,
    subCategories,
    productGroups,
    classifications,
    catalogLoading,
    handleGenerateSku,
    isGeneratingSku,
    sizeConfig,
    platformMargin,
    unitTypes,
    registrationError,
    isHydrating,
    isEditMode,
  } = logic;

  const validation = validateStep(currentStep);
  const isLastStep = currentStep === 6;
  const isSaving = registrationState === 'saving';

  const goNext = () => {
    if (!validation.isValid) return;
    if (isLastStep) {
      setShowSubmitPrompt(true);
      return;
    }
    handleStepChange(currentStep + 1);
  };

  const goPrev = () => {
    if (currentStep === 1) {
      onBack();
      return;
    }
    handleStepChange(currentStep - 1);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <Step1BasicInfo
            onSelect={setSelectionType}
            generatedSku={activeSku}
            isGeneratingSku={isGeneratingSku}
          />
        );
      case 2:
        return <Step2Details sizeConfig={sizeConfig} errors={validation.errors} />;
      case 3:
        return (
          <Step3Pricing
            sellPrice={pricing.sell}
            platformMargin={platformMargin}
            onGenerateVariations={handleGenerateVariations}
            isEditMode={isEditMode}
            errors={validation.errors}
          />
        );
      case 4:
        return <Step4Media />;
      case 5:
        return <Step5Policies errors={validation.errors} />;
      case 6:
        return <Step6Summary sellPrice={pricing.sell} platformMargin={platformMargin} />;
      default:
        return null;
    }
  };

  if (isHydrating) {
    return (
      <div className="flex items-center justify-center flex-1 py-16">
        <Loader2 className="w-8 h-8 animate-spin text-accent-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="shrink-0 flex items-center gap-2 overflow-x-auto py-3 border-b border-border-subtle">
        {STEPS.map(({ num, label }) => {
          const done = num < currentStep;
          const active = num === currentStep;
          return (
            <div key={num} className="flex items-center gap-2 shrink-0">
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
                  active
                    ? 'bg-accent-primary text-white'
                    : done
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-surface-muted text-text-tertiary'
                }`}
              >
                <span className="w-5 h-5 rounded-full flex items-center justify-center bg-white/20">
                  {done ? <Check className="w-3 h-3" /> : num}
                </span>
                {label}
              </div>
              {num < 6 && <ChevronRight className="w-4 h-4 text-text-tertiary" />}
            </div>
          );
        })}
      </div>

      {!validation.isValid && Object.keys(validation.errors).length > 0 && (
        <div className="shrink-0 mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          {Object.values(validation.errors).join(' · ')}
        </div>
      )}

      {registrationError && (
        <div className="shrink-0 mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
          {registrationError}
        </div>
      )}

      <div className="flex-1 overflow-y-auto min-h-0 py-4 pb-6">{renderStep()}</div>

      <div className="shrink-0 flex items-center gap-2 border-t border-border-default bg-surface-primary py-3">
        <Button
          variant="outline"
          iconLeft={ChevronLeft}
          onClick={goPrev}
          className="shrink-0 min-w-[88px]"
        >
          {currentStep === 1 ? 'Cancel' : 'Back'}
        </Button>
        <Button
          variant="primary"
          className="flex-1"
          iconRight={isLastStep ? undefined : ChevronRight}
          onClick={goNext}
          disabled={!validation.isValid || isSaving}
          loading={isSaving}
        >
          {isLastStep ? (isEditMode ? 'Update Product' : 'Register Product') : 'Continue'}
        </Button>
      </div>

      {selectionType !== 'none' && (
        <SelectionModal
          selectionType={selectionType}
          onClose={() => {
            setSelectionType('none');
            setListSearch('');
          }}
          listSearch={listSearch}
          onSearchChange={setListSearch}
          categories={categories}
          subCategories={subCategories}
          productGroups={productGroups}
          classifications={classifications}
          unitTypes={unitTypes}
          onGenerateSku={handleGenerateSku}
          catalogLoading={catalogLoading}
        />
      )}

      <Modal open={showVariantPrompt} onClose={() => handleVariantChoice(false)} size="sm">
        <div className="p-6 space-y-4">
          <h3 className="text-lg font-semibold">Does this product have variants?</h3>
          <p className="text-sm text-text-secondary">
            Choose whether customers can select colors, designs, or sizes as separate SKUs.
          </p>
          <div className="flex gap-3">
            <Button fullWidth onClick={() => handleVariantChoice(true)}>
              Yes, has variants
            </Button>
            <Button fullWidth variant="outline" onClick={() => handleVariantChoice(false)}>
              No variants
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={showDiscardPricingPrompt} onClose={() => setShowDiscardPricingPrompt(false)} size="sm">
        <div className="p-6 space-y-4">
          <h3 className="text-lg font-semibold">Discard pricing data?</h3>
          <p className="text-sm text-text-secondary">Going back will clear pricing and inventory fields.</p>
          <div className="flex gap-3">
            <Button variant="danger" onClick={handleDiscardPricingConfirm}>
              Discard & go back
            </Button>
            <Button variant="outline" onClick={() => setShowDiscardPricingPrompt(false)}>
              Stay
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={showPricingReusePrompt} onClose={() => handlePricingReuseChoice(true)} size="sm">
        <div className="p-6 space-y-4">
          <h3 className="text-lg font-semibold">Reuse existing pricing?</h3>
          <p className="text-sm text-text-secondary">
            You already entered pricing data. Keep it for this variant choice or start fresh?
          </p>
          <div className="flex gap-3">
            <Button onClick={() => handlePricingReuseChoice(true)}>Keep pricing</Button>
            <Button variant="outline" onClick={() => handlePricingReuseChoice(false)}>
              Start fresh
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={showSubmitPrompt} onClose={() => setShowSubmitPrompt(false)} size="sm">
        <div className="p-6 space-y-4">
          <h3 className="text-lg font-semibold">
            {isEditMode ? 'Update this product?' : 'Register this product?'}
          </h3>
          <p className="text-sm text-text-secondary">
            Media uploads must finish before submit. Admin JWT may block wholesaler-only APIs until backend support
            is added.
          </p>
          <div className="flex gap-3">
            <Button
              loading={isSaving}
              onClick={() => {
                void handleSubmitProduct().then(() => setShowSubmitPrompt(false));
              }}
            >
              Confirm
            </Button>
            <Button variant="outline" onClick={() => setShowSubmitPrompt(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {registrationState === 'success' && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 text-center space-y-3">
            <Check className="w-12 h-12 text-emerald-500 mx-auto" />
            <p className="text-lg font-semibold">Product saved successfully</p>
          </div>
        </div>
      )}
    </div>
  );
}
