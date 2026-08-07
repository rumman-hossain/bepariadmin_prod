import { useEffect, useId, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { Input } from '@/src/components/controls';
import { Textarea } from '@/src/components/controls';
import { cn } from '@/src/design-system/utils/cn';
import { useAddProductStore } from '../../store/useAddProductStore';
import { listSuppliersForPicker } from '@/src/features/wholesalers/api/wholesalerApi';
import { TagInput } from '../TagInput';
import type { SelectionType } from '../../hooks/useAddProductLogic';
import { Text } from '@/src/components/data';

interface Props {
  onSelect: (type: SelectionType) => void;
  generatedSku: string;
  isGeneratingSku?: boolean;
  errors?: Record<string, string>;
}

/**
 * Hoisted to module scope — this was declared inside Step1BasicInfo's render
 * body and instantiated six times.
 *
 * A component created during render is a new type on every render, so React
 * unmounted and remounted all six of these buttons on every keystroke in the
 * Product Name and Brand fields.
 */
function Selector({
  label,
  value,
  onSelect,
  error,
}: {
  label: string;
  value: string;
  onSelect: () => void;
  error?: string;
}) {
  const errorId = useId();
  return (
    // Wrapper, message and `role="alert"` are FieldShell's, deliberately.
    // Five of step 1's eight required fields are this control, so an operator
    // reading a red Input above and an unmarked button below would reasonably
    // conclude the button is fine.
    <div className="flex min-w-0 flex-col gap-1">
      <button
        type="button"
        onClick={onSelect}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          'flex w-full items-center justify-between gap-3 rounded-md border',
          'bg-sheet px-3 py-2 text-left transition-colors',
          'hover:bg-sheet-hover hover:border-rule-strong',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rule-focus',
          error ? 'border-bad' : 'border-rule',
        )}
      >
        <span className="min-w-0">
          <Text variant="label" className="block">
            {label}
          </Text>
          <span
            className={value ? 'block text-base text-ink' : 'block text-base text-ink-4'}
          >
            {value || `Choose ${label.toLowerCase()}`}
          </span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-ink-3" aria-hidden="true" />
      </button>
      {error && (
        <p id={errorId} role="alert" className="text-sm text-bad">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * The eight keys `validateStep1` can return, wired to the eight controls that
 * can fix them.
 *
 * They were computed and thrown away: `AddProductFlow` called `validateStep`,
 * rendered the messages in one banner at the top of the scroller, and passed
 * nothing down. On a form eight fields long that banner is above the fold and
 * the offending control is not, so "Supplier is required" named a field the
 * operator then had to go hunting for — with Continue dead and no other clue.
 * Steps 2, 3 and 5 already took `errors`; step 1, the one with the most
 * required fields, was the only step that did not.
 */
export function Step1BasicInfo({ onSelect, generatedSku, isGeneratingSku, errors = {} }: Props) {
  const store = useAddProductStore();
  const { setField } = store;
  const [wholesalerLabel, setWholesalerLabel] = useState('');

  useEffect(() => {
    if (!store.wholesalerId) return;
    let cancelled = false;
    listSuppliersForPicker()
      .then((data) => {
        // Guard against a stale response overwriting a newer selection, and
        // against setting state after unmount.
        if (cancelled) return;
        const match = data.find((w) => w.id === store.wholesalerId);
        if (match) setWholesalerLabel(match.companyName || match.id);
      })
      // Previously a floating promise: a network failure here was an unhandled
      // rejection with no user-visible effect at all.
      .catch(() => {
        if (!cancelled) setWholesalerLabel('');
      });
    return () => {
      cancelled = true;
    };
  }, [store.wholesalerId]);

  return (
    <div className="space-y-4">
      <Input
        label="Product Name"
        value={store.name}
        onChange={(e) => setField('name', e.target.value)}
        required
        error={errors.name}
      />
      <Selector
        label="Supplier"
        value={wholesalerLabel || store.wholesalerId}
        onSelect={() => onSelect('wholesaler')}
        error={errors.wholesalerId}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          label="Brand"
          value={store.brandName}
          onChange={(e) => setField('brandName', e.target.value)}
          error={errors.brandName}
        />
        <Selector
          label="Unit Type"
          value={store.unitType}
          onSelect={() => onSelect('unitType')}
          error={errors.unitType}
        />
      </div>
      {/* The validator keys these three `category` / `productGroup` /
          `classification`, not by the id field they read. Sub-Category is the
          one level of the cascade it does not require, so it takes no error. */}
      <Selector
        label="Category"
        value={store.category}
        onSelect={() => onSelect('category')}
        error={errors.category}
      />
      <Selector label="Sub-Category" value={store.subCategory} onSelect={() => onSelect('subCategory')} />
      <Selector
        label="Product Group"
        value={store.productGroup}
        onSelect={() => onSelect('productGroup')}
        error={errors.productGroup}
      />
      <Selector
        label="Classification"
        value={store.productClassification}
        onSelect={() => onSelect('productClassification')}
        error={errors.classification}
      />
      {(generatedSku || store.sku) && (
        <div className="rounded-md border border-ok-border bg-ok-wash px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-ok">Reserved SKU</p>
          <p className="font-identifier text-lg font-semibold text-ink">{generatedSku || store.sku}</p>
          {isGeneratingSku && <Text as="p" variant="caption">Generating…</Text>}
        </div>
      )}
      {/*
        Not folded into the block above: the SKU is invalid both when it is
        absent AND when it is still the 'SKU-XXXX' placeholder, and the second
        case renders the green panel. Attaching the message to the panel would
        hide it in exactly the case the operator is least likely to suspect.

        The hint is here because nothing on this step is a "generate" control —
        the SKU is reserved as a side effect of choosing a Classification. The
        validator can only say the SKU is missing; it cannot say where from.
      */}
      {errors.sku && (
        <div>
          <p role="alert" className="text-sm text-bad">{errors.sku}</p>
          <Text as="p" variant="caption">Choosing a Classification above reserves one.</Text>
        </div>
      )}
      <TagInput tags={store.tags} onChange={(tags) => setField('tags', tags)} />
      <Textarea
        label="Description"
        value={store.description}
        onChange={(e) => setField('description', e.target.value)}
        rows={4}
      />
    </div>
  );
}
