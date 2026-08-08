import { useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Loader2, RotateCcw } from 'lucide-react';
import { Button } from '@/src/components/controls';
import { Dialog, DialogFooter } from '@/src/components/feedback';
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
   * `max-w-4xl` is the reading measure, and it is right for five of the six
   * steps: a form column wider than that makes the eye travel from a label on
   * the left to its field on the right.
   *
   * Media is not a form column. It is a grid of thumbnails, and the same
   * measure that keeps a form legible squeezed it into two tiles per row with
   * the page's whole right-hand side left empty — which is most of why that
   * step read as cramped no matter how the tiles themselves were arranged. It
   * gets the window.
   */
  const contentWidth = currentStep === 4 ? 'max-w-7xl' : 'max-w-4xl';

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
        <div className={cn('mx-auto w-full space-y-4', contentWidth)}>
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
        {/* Same measure as the content above it, or Continue sits under the
            middle of a full-width step instead of under its right edge. */}
        <div className={cn('mx-auto flex w-full items-center gap-3', contentWidth)}>
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

      {/*
        All five prompts below pass `title` and `footer`.

        They used to hand-roll both inside the body. Dialog gates its whole
        header row — heading, subtitle and the close button — on
        `title || subtitle`, and wires `aria-labelledby` to the title it renders.
        So a prompt with a bare <h3> in its body had NO accessible name and NO
        close control, and added `p-6` inside a body already at `px-5 py-4`.
        Their footers were left-aligned with the primary action first, against
        the convention every other dialog in the app follows.
      */}
      <Dialog
        open={showResetPrompt}
        onClose={() => setShowResetPrompt(false)}
        size="sm"
        title="Reset form?"
        footer={
          <DialogFooter onCancel={() => setShowResetPrompt(false)}>
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
          </DialogFooter>
        }
      >
        <Text as="p" variant="secondary">
          Everything entered so far is cleared, including uploaded media.
        </Text>
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

      <Dialog
        open={showVariantPrompt}
        onClose={cancelPrompt}
        size="sm"
        title="Does this product have variants?"
        footer={
          <DialogFooter>
            <Button variant="secondary" onClick={() => handleVariantChoice(false)}>
              No variants
            </Button>
            <Button onClick={() => handleVariantChoice(true)}>Yes, has variants</Button>
          </DialogFooter>
        }
      >
        <Text as="p" variant="secondary">
          Choose whether customers can select colors, designs, or sizes as separate SKUs.
        </Text>
      </Dialog>

      <Dialog
        open={showDiscardPricingPrompt}
        onClose={() => setShowDiscardPricingPrompt(false)}
        size="sm"
        title="Discard pricing data?"
        footer={
          <DialogFooter cancelLabel="Stay" onCancel={() => setShowDiscardPricingPrompt(false)}>
            <Button variant="danger" onClick={handleDiscardPricingConfirm}>
              Discard &amp; go back
            </Button>
          </DialogFooter>
        }
      >
        <Text as="p" variant="secondary">Going back will clear pricing and inventory fields.</Text>
      </Dialog>

      <Dialog
        open={showPricingReusePrompt}
        onClose={cancelPrompt}
        size="sm"
        title="Reuse existing pricing?"
        footer={
          <DialogFooter>
            {/* Start fresh DISCARDS what was typed, so it is the danger one —
                and it does not sit where a hurried operator clicks first. */}
            <Button variant="danger" onClick={() => handlePricingReuseChoice(false)}>
              Start fresh
            </Button>
            <Button onClick={() => handlePricingReuseChoice(true)}>Keep pricing</Button>
          </DialogFooter>
        }
      >
        <Text as="p" variant="secondary">
          You already entered pricing data. Keep it for this variant choice or start fresh?
        </Text>
      </Dialog>

      <Dialog
        open={showSubmitPrompt}
        onClose={() => setShowSubmitPrompt(false)}
        size="sm"
        title={isEditMode ? 'Update this product?' : 'Register this product?'}
        footer={
          <DialogFooter
            onCancel={isSaving ? undefined : () => setShowSubmitPrompt(false)}
          >
            <Button
              loading={isSaving}
              onClick={() => {
                void handleSubmitProduct().then(() => setShowSubmitPrompt(false));
              }}
            >
              {isEditMode ? 'Update' : 'Register'}
            </Button>
          </DialogFooter>
        }
      >
        {/* Cancel disappears while saving rather than sitting there clickable:
            it was live mid-submit, and cancelling a request already in flight
            does not un-send it — it just leaves the operator unsure whether the
            product was created. */}
        <Text as="p" variant="secondary">
          Media uploads must finish before submit. Admin JWT may block wholesaler-only APIs until backend support
          is added.
        </Text>
      </Dialog>

      {/*
        A REAL DIALOG, ON TOKENS.

        This was a bare `fixed inset-0 bg-black/40` with a `bg-white` card: not
        a portal, no role, no aria-live, no dismiss control, no Escape, and a
        hardcoded `z-50` — the exact value Dialog was changed away from so it
        would sit on the documented stacking scale rather than colliding with
        whatever else picked 50.

        `bg-white` is also invisible to the palette guard, whose family list has
        no `white` or `black`, so it passed review while being broken: in dark
        mode `--color-ink` is near-white, so this rendered white text on a white
        card. The one screen state that says "your work was saved" was the one
        an operator in dark mode could not read.

        aria-live via `role="status"` so it is announced, not just drawn.
      */}
      <Dialog
        open={registrationState === 'success'}
        onClose={onBack}
        size="sm"
        title="Product saved"
        footer={
          <DialogFooter>
            <Button onClick={onBack}>Back to products</Button>
          </DialogFooter>
        }
      >
        <div role="status" className="flex flex-col items-center gap-3 py-2 text-center">
          <Check className="h-12 w-12 text-ok" aria-hidden="true" />
          <Text as="p" variant="secondary">
            {isEditMode
              ? 'Your changes are saved and the listing has been updated.'
              : 'The listing has been created and sent for review.'}
          </Text>
        </div>
      </Dialog>
    </div>
  );
}
