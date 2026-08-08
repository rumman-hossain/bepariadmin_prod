import { useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Loader2, RotateCcw } from 'lucide-react';
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
import { cn } from '@/src/design-system/utils/cn';

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
    showResetPrompt,
    setShowResetPrompt,
    handleResetForm,
    routeProductId,
    showVariantPrompt,
    handleVariantChoice,
    showPricingReusePrompt,
    handlePricingReuseChoice,
    cancelPrompt,
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

  /*
   * WHICH STEPS THE OPERATOR HAS TRIED TO LEAVE.
   *
   * Validation runs on every render, so the errors for step 1 exist before the
   * form has been touched — eight of them, on a blank form. Showing those is
   * worse than showing nothing: the operator is told they are wrong about
   * fields they have not reached yet, and by the time the real mistake appears
   * the red has stopped meaning anything.
   *
   * Keyed by step rather than a single boolean because each step is its own
   * attempt: getting step 1 wrong should not paint step 2 red on arrival.
   */
  const [attemptedSteps, setAttemptedSteps] = useState<Record<number, boolean>>({});

  /*
   * ATTEMPTS BELONG TO ONE PASS THROUGH THE FORM, NOT TO THE COMPONENT.
   *
   * This map only ever gained entries. Nothing cleared it: `confirmReset`
   * resets the STORE and the step, not this local state, and navigating from
   * one product's edit URL to another reuses this component rather than
   * remounting it — the route effect in useAddProductLogic just sets the step
   * back to 1.
   *
   * So after pressing Reset, or on opening a second product, step 1 appeared
   * with all eight fields already red and the banner already showing — the
   * exact "form is red before anyone has typed" condition this feature was
   * built to avoid. Clearing on a change of product, and on reset below.
   */
  const [attemptedFor, setAttemptedFor] = useState(routeProductId);
  if (attemptedFor !== routeProductId) {
    // Adjusted during render, not in an effect. React documents this pattern
    // for exactly this case, and it avoids the cascading extra commit an
    // effect would cause — the attempts are stale the moment the id changes,
    // so painting them once more and then clearing would flash the old
    // product's errors over the new one.
    setAttemptedFor(routeProductId);
    setAttemptedSteps({});
  }
  const showErrors = Boolean(attemptedSteps[currentStep]);
  const visibleErrors = showErrors ? validation.errors : {};

  const goNext = () => {
    // Mark first, unconditionally — the attempt is what makes the errors
    // visible, and a failed attempt is the only one that needs to.
    setAttemptedSteps((prev) => ({ ...prev, [currentStep]: true }));
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
            errors={visibleErrors}
          />
        );
      case 2:
        return <Step2Details sizeConfig={sizeConfig} errors={visibleErrors} />;
      case 3:
        return (
          <Step3Pricing
            sellPrice={pricing.sell}
            platformMargin={platformMargin}
            onGenerateVariations={handleGenerateVariations}
            errors={visibleErrors}
            issues={showErrors ? (validation.variationIssues ?? []) : []}
            isEditMode={isEditMode}
          />
        );
      case 4:
        return <Step4Media />;
      case 5:
        return <Step5Policies errors={visibleErrors} />;
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

  const stepLabel = STEPS[currentStep - 1]?.label ?? '';
  const errorList = Object.values(visibleErrors);

  /*
   * FOUR REGIONS, ONE SCROLLER — the wholesale app's shape, in a browser.
   *
   *   header    back │ title + "Step N of 6" │ Reset      shrink-0
   *   step bar  ①─②─③─④─⑤─⑥                              shrink-0
   *   content   flex-1 min-h-0 overflow-y-auto            ← the ONLY scroller
   *   footer    [Back]                 [Continue →]       shrink-0
   *
   * `h-full min-h-0` because the route is fullBleed: `<main>` gives a bounded,
   * non-scrolling region, and the middle can only be its own scroll area if
   * everything above it has a real height to divide.
   */
  return (
    <div className="flex h-full min-h-0 flex-col bg-paper">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center gap-3 border-b border-rule px-4 py-3 md:px-6">
        <Button
          variant="ghost"
          size="sm"
          iconLeft={ChevronLeft}
          onClick={onBack}
          aria-label="Back to products"
        >
          {''}
        </Button>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold tracking-tight text-ink">
            {isEditMode ? 'Edit Product' : 'Add Product'}
            <span className="text-ink-3"> · {stepLabel}</span>
          </h1>
          <Text as="p" variant="caption">
            Step {currentStep} of {STEPS.length}
          </Text>
        </div>

        <Button
          variant="outline"
          size="sm"
          iconLeft={RotateCcw}
          className="shrink-0 border-bad-border text-bad hover:bg-bad-wash"
          onClick={() => setShowResetPrompt(true)}
        >
          Reset
        </Button>
      </div>

      {/* ── Step bar ───────────────────────────────────────────── */}
      <div className="flex shrink-0 flex-wrap items-center gap-x-1.5 gap-y-2 border-b border-rule-subtle px-4 py-2.5 md:px-6">
        {STEPS.map(({ num, label }, i) => {
          const done = num < currentStep;
          const active = num === currentStep;
          return (
            <div key={num} className="flex items-center gap-1.5">
              {/*
                A button, not a div: every completed step is reachable in one
                press. Walking back four steps to change the category was the
                other half of "editing costs six steps".
              */}
              <button
                type="button"
                disabled={!done && !active}
                onClick={() => done && handleStepChange(num)}
                aria-current={active ? 'step' : undefined}
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
                  active && 'bg-brass text-brass-content',
                  done && 'bg-ok-wash text-ok hover:bg-ok-border',
                  !done && !active && 'bg-sheet-2 text-ink-3',
                )}
              >
                <span
                  className={cn(
                    'flex h-4 w-4 items-center justify-center rounded-full text-2xs',
                    active ? 'bg-sheet-inverse text-ink-inverse' : 'bg-sheet',
                  )}
                >
                  {done ? <Check className="h-2.5 w-2.5" /> : num}
                </span>
                {label}
              </button>
              {/* Wraps rather than scrolling sideways — a step bar you have to
                  drag is a step bar nobody reads. */}
              {i < STEPS.length - 1 && (
                <ChevronRight className="h-3 w-3 shrink-0 text-ink-4" aria-hidden="true" />
              )}
            </div>
          );
        })}
      </div>

      {/* ── Content — THE ONE SCROLLER ─────────────────────────────
          Steps must not introduce another. A nested scroller inside this has
          no bounded height to work in: it collapses to its content, and the
          footer below stops being pinned. The wholesale app carries the same
          warning for the same reason. */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6">
        <div className="mx-auto w-full max-w-4xl space-y-4">
          {errorList.length > 0 && (
            <div
              role="alert"
              className="rounded-lg border border-bad-border bg-bad-wash p-3 text-sm text-bad"
            >
              {/* A list, not a joined string. `errors.join(' · ')` ran every
                  problem into one line that named no field. */}
              <ul className="list-inside list-disc space-y-0.5">
                {errorList.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            </div>
          )}

          {registrationError && (
            <div className="rounded-lg border border-warn-border bg-warn-wash p-3 text-sm text-warn">
              {registrationError}
            </div>
          )}

          {renderStep()}
        </div>
      </div>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-rule bg-sheet px-4 py-3 md:px-6">
        <div className="mx-auto flex w-full max-w-4xl items-center gap-3">
          <Button variant="outline" iconLeft={ChevronLeft} onClick={goPrev}>
            {currentStep === 1 ? 'Cancel' : 'Back'}
          </Button>
          {/* Primary on the RIGHT, at its natural width. It used to be
              `flex-1`, stretching edge to edge across the footer.

              ENABLED WHILE THE STEP IS INVALID, which is the whole mechanism
              above. `disabled={!validation.isValid}` meant a click never
              happened, so "attempted to advance" was not an event this
              component could observe — and a dead button is also the least
              informative way to refuse: it states that something is wrong and
              nothing about what. `goNext` still refuses to move; it now
              reveals why first. */}
          <Button
            variant="primary"
            className="ml-auto"
            iconRight={isLastStep ? undefined : ChevronRight}
            onClick={goNext}
            disabled={isSaving}
            loading={isSaving}
          >
            {isLastStep ? (isEditMode ? 'Update Listing' : 'Submit Listing') : 'Continue'}
          </Button>
        </div>
      </div>

      <Dialog open={showResetPrompt} onClose={() => setShowResetPrompt(false)} size="sm">
        <div className="space-y-4 p-6">
          <h3 className="text-lg font-semibold">Reset form?</h3>
          <Text as="p" variant="secondary">
            Everything entered so far is cleared, including uploaded media.
          </Text>
          <div className="flex gap-3">
            <Button
              variant="danger"
              onClick={() => {
                // The store reset alone leaves the form red — see attemptedSteps.
                setAttemptedSteps({});
                handleResetForm();
              }}
            >
              Reset
            </Button>
            <Button variant="outline" onClick={() => setShowResetPrompt(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Dialog>

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

      <Dialog open={showVariantPrompt} onClose={cancelPrompt} size="sm">
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

      <Dialog open={showPricingReusePrompt} onClose={cancelPrompt} size="sm">
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
