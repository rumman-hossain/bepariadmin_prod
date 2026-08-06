import { Check, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/src/components/controls';
import { Dialog } from '@/src/components/feedback';
import { useAddProductLogic, type WizardStep } from '../hooks/useAddProductLogic';
import { useFormValidation } from '../hooks/useFormValidation';
import { SelectionModal } from './SelectionModal';
import { Step1BasicInfo } from './steps/Step1BasicInfo';
import { Step2Details } from './steps/Step2Details';
import { Step3Pricing } from './steps/Step3Pricing';
import { Step4Media } from './steps/Step4Media';
import { Step5Policies } from './steps/Step5Policies';
import { Step6Summary } from './steps/Step6Summary';
import { Text } from '@/src/components/data';

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
}

export function AddProductFlow({ onBack }: Props) {
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
        <Loader2 className="w-8 h-8 animate-spin text-brass" />
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="shrink-0 flex items-center gap-2 overflow-x-auto py-3 border-b border-rule-subtle">
        {STEPS.map(({ num, label }) => {
          const done = num < currentStep;
          const active = num === currentStep;
          return (
            <div key={num} className="flex items-center gap-2 shrink-0">
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
                  active
                    ? 'bg-brass text-white'
                    : done
                      ? 'bg-ok-wash text-ok'
                      : 'bg-sheet-2 text-ink-3'
                }`}
              >
                <span className="w-5 h-5 rounded-full flex items-center justify-center bg-white/20">
                  {done ? <Check className="w-3 h-3" /> : num}
                </span>
                {label}
              </div>
              {num < 6 && <ChevronRight className="w-4 h-4 text-ink-3" />}
            </div>
          );
        })}
      </div>

      {!validation.isValid && Object.keys(validation.errors).length > 0 && (
        <div className="shrink-0 mt-4 p-3 rounded-xl bg-bad-wash border border-bad-border text-sm text-bad">
          {Object.values(validation.errors).join(' · ')}
        </div>
      )}

      {registrationError && (
        <div className="shrink-0 mt-4 p-3 rounded-xl bg-warn-wash border border-warn-border text-sm text-warn">
          {registrationError}
        </div>
      )}

      <div className="flex-1 overflow-y-auto min-h-0 py-4 pb-6">{renderStep()}</div>

      <div className="shrink-0 flex items-center gap-2 border-t border-rule bg-sheet py-3">
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

      <Dialog open={showVariantPrompt} onClose={() => handleVariantChoice(false)} size="sm">
        <div className="p-6 space-y-4">
          <h3 className="text-lg font-semibold">Does this product have variants?</h3>
          <Text as="p" variant="secondary">
            Choose whether customers can select colors, designs, or sizes as separate SKUs.
          </Text>
          <div className="flex gap-3">
            <Button fullWidth onClick={() => handleVariantChoice(true)}>
              Yes, has variants
            </Button>
            <Button fullWidth variant="outline" onClick={() => handleVariantChoice(false)}>
              No variants
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog open={showDiscardPricingPrompt} onClose={() => setShowDiscardPricingPrompt(false)} size="sm">
        <div className="p-6 space-y-4">
          <h3 className="text-lg font-semibold">Discard pricing data?</h3>
          <Text as="p" variant="secondary">Going back will clear pricing and inventory fields.</Text>
          <div className="flex gap-3">
            <Button variant="danger" onClick={handleDiscardPricingConfirm}>
              Discard & go back
            </Button>
            <Button variant="outline" onClick={() => setShowDiscardPricingPrompt(false)}>
              Stay
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog open={showPricingReusePrompt} onClose={() => handlePricingReuseChoice(true)} size="sm">
        <div className="p-6 space-y-4">
          <h3 className="text-lg font-semibold">Reuse existing pricing?</h3>
          <Text as="p" variant="secondary">
            You already entered pricing data. Keep it for this variant choice or start fresh?
          </Text>
          <div className="flex gap-3">
            <Button onClick={() => handlePricingReuseChoice(true)}>Keep pricing</Button>
            <Button variant="outline" onClick={() => handlePricingReuseChoice(false)}>
              Start fresh
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog open={showSubmitPrompt} onClose={() => setShowSubmitPrompt(false)} size="sm">
        <div className="p-6 space-y-4">
          <h3 className="text-lg font-semibold">
            {isEditMode ? 'Update this product?' : 'Register this product?'}
          </h3>
          <Text as="p" variant="secondary">
            Media uploads must finish before submit. Admin JWT may block wholesaler-only APIs until backend support
            is added.
          </Text>
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
      </Dialog>

      {registrationState === 'success' && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 text-center space-y-3">
            <Check className="w-12 h-12 text-ok mx-auto" />
            <p className="text-lg font-semibold">Product saved successfully</p>
          </div>
        </div>
      )}
    </div>
  );
}
