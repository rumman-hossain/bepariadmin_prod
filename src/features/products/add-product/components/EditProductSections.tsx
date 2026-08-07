/**
 * Edit as ONE PAGE, not six steps.
 *
 * The wizard is right for creating a product: SKU generation depends on the
 * classification cascade being completed in order, and the variant question has
 * to be answered before pricing can be laid out. None of that applies to an
 * edit, where the product already exists and the operator has come to change
 * one thing. Correcting a price meant walking all six steps.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO
 *
 * It does not redefine a single field. Every section renders the SAME step
 * component the wizard uses, so there is one definition of each input and no
 * way for create and edit to drift apart. The page contributes a rail, a save
 * bar, and the order things appear in.
 *
 * THE RAIL IS THE ERROR SUMMARY
 *
 * `validateWizardStep` is pure and per-step, so a section can be validated
 * without being visited. A problem five sections down is therefore visible
 * without scrolling — which replaces `Object.values(errors).join(' · ')`, a
 * single line of concatenated messages that named no field and pointed nowhere.
 */
import { useMemo, useRef } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/src/components/controls';
import { Text } from '@/src/components/data';
import { cn } from '@/src/design-system/utils/cn';
import { useAddProductStore } from '../store/useAddProductStore';
import { validateWizardStep } from '../utils/validateWizardStep';
import { Step1BasicInfo } from './steps/Step1BasicInfo';
import { Step2Details } from './steps/Step2Details';
import { Step3Pricing } from './steps/Step3Pricing';
import { Step4Media } from './steps/Step4Media';
import { Step5Policies } from './steps/Step5Policies';
import { StockMatrix } from './StockMatrix';
import { SelectionModal } from './SelectionModal';
import { useAddProductLogic } from '../hooks/useAddProductLogic';

/**
 * `step` is which wizard step validates this section — not a sequence number.
 * The stock matrix has none of its own: its figures are checked by step 3,
 * which is where per-size stock has always been validated.
 */
const SECTIONS = [
  { id: 'basic', label: 'Basic', step: 1 },
  { id: 'details', label: 'Details & sizing', step: 2 },
  { id: 'pricing', label: 'Pricing', step: 3 },
  { id: 'stock', label: 'Variants & stock', step: 3 },
  { id: 'media', label: 'Media', step: 4 },
  { id: 'policies', label: 'Policies', step: 5 },
] as const;

interface Props {
  onCancel: () => void;
}

/**
 * Owns its own `useAddProductLogic`, exactly as `AddProductFlow` does.
 *
 * The two are alternatives — the page renders one or the other — so the hook is
 * mounted once either way. Lifting it to the page would run the whole catalogue
 * cascade and hydration for the wizard as well.
 */
export function EditProductSections({ onCancel }: Props) {
  const state = useAddProductStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const logic = useAddProductLogic();

  const {
    handleSubmitProduct,
    registrationState,
    registrationError,
    activeSku,
    isGeneratingSku,
    pricing,
    platformMargin,
    sizeConfig,
    handleGenerateVariations,
    selectionType,
    setSelectionType,
    listSearch,
    setListSearch,
    categories,
    subCategories,
    productGroups,
    classifications,
    unitTypes,
    catalogLoading,
    handleGenerateSku,
    isHydrating,
  } = logic;

  const isSaving = registrationState === 'saving';

  /*
   * Validated on every render rather than on submit.
   *
   * The rail is only useful if it is true NOW — a badge that appears after the
   * save is rejected has told the operator nothing they did not just find out
   * the hard way.
   */
  const problems = useMemo(() => {
    const byStep = new Map<number, Record<string, string>>();
    for (const step of [1, 2, 3, 4, 5]) {
      byStep.set(step, validateWizardStep(step, state).errors);
    }
    return byStep;
    // `state` is the whole store object, which zustand replaces on any change —
    // so this recomputes whenever any field the validators read has moved.
  }, [state]);

  const countFor = (step: number) => Object.keys(problems.get(step) ?? {}).length;
  const errorsFor = (step: number) => problems.get(step) ?? {};
  const totalProblems = [1, 2, 3, 4, 5].reduce((n, s) => n + countFor(s), 0);

  const jumpTo = (id: string) => {
    const el = containerRef.current?.querySelector(`#section-${id}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (isHydrating) {
    return (
      <div className="flex flex-1 items-center justify-center py-16">
        <Loader2 className="h-7 w-7 animate-spin text-brass" aria-hidden="true" />
        <span className="sr-only">Loading product</span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[13rem_minmax(0,1fr)]">
      <nav
        aria-label="Form sections"
        className="sticky top-4 flex flex-col gap-0.5 rounded-lg border border-rule bg-sheet p-2"
      >
        {SECTIONS.map((section) => {
          const n = countFor(section.step);
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => jumpTo(section.id)}
              className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm text-ink-2 hover:bg-sheet-hover hover:text-ink"
            >
              <span className="min-w-0 truncate">{section.label}</span>
              {n > 0 && (
                <span className="ml-auto shrink-0 text-2xs font-semibold text-bad">⚠ {n}</span>
              )}
            </button>
          );
        })}

        <div className="mt-1.5 flex flex-col gap-2 border-t border-rule-subtle pt-2.5">
          {/*
            `mediaDirty` is surfaced here because it is the one change the rest
            of the form cannot see: a deleted image leaves no field looking
            different, which is the whole reason the flag exists.
          */}
          {state.mediaDirty && <Text variant="caption">Media changed</Text>}
          {totalProblems > 0 && (
            <Text as="p" variant="caption" className="text-bad">
              {totalProblems} problem{totalProblems === 1 ? '' : 's'} to fix
            </Text>
          )}
          <Button
            fullWidth
            variant="primary"
            loading={isSaving}
            disabled={totalProblems > 0 || isSaving}
            onClick={() => void handleSubmitProduct()}
          >
            Save changes
          </Button>
          <Button fullWidth variant="outline" disabled={isSaving} onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </nav>

      <div ref={containerRef} className="flex flex-col gap-3.5">
        {registrationError && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-bad-border bg-bad-wash p-3 text-sm text-bad"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{registrationError}</span>
          </div>
        )}

        <Section id="basic" title="Basic information" count={countFor(1)}>
          <Step1BasicInfo
            onSelect={setSelectionType}
            generatedSku={activeSku}
            isGeneratingSku={isGeneratingSku}
          />
        </Section>

        <Section id="details" title="Details & sizing" count={countFor(2)}>
          <Step2Details sizeConfig={sizeConfig} errors={errorsFor(2)} />
        </Section>

        <Section id="pricing" title="Pricing" count={countFor(3)}>
          <Step3Pricing
            sellPrice={pricing.sell}
            platformMargin={platformMargin}
            onGenerateVariations={handleGenerateVariations}
            errors={errorsFor(3)}
          />
        </Section>

        <Section id="stock" title="Variants & stock">
          <StockMatrix />
        </Section>

        <Section id="media" title="Media" count={countFor(4)}>
          <Step4Media />
        </Section>

        <Section id="policies" title="Policies" count={countFor(5)}>
          <Step5Policies errors={errorsFor(5)} />
        </Section>
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
    </div>
  );
}

function Section({
  id,
  title,
  count = 0,
  children,
}: {
  id: string;
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <section
      id={`section-${id}`}
      // `scroll-mt` so the sticky page header does not cover the heading the
      // rail just jumped to.
      className="scroll-mt-20 rounded-lg border border-rule bg-sheet p-4"
      aria-labelledby={`heading-${id}`}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id={`heading-${id}`} className="text-lg font-semibold tracking-tight text-ink">
          {title}
        </h2>
        {count > 0 && (
          <span
            className={cn(
              'rounded-full border border-bad-border bg-bad-wash px-2 py-0.5 text-2xs font-semibold text-bad',
            )}
          >
            {count} problem{count === 1 ? '' : 's'}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}
