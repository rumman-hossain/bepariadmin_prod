import { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { Input } from '@/src/components/controls';
import { Textarea } from '@/src/components/controls';
import { useAddProductStore } from '../../store/useAddProductStore';
import { listSuppliersForPicker } from '@/src/features/wholesalers/api/wholesalerApi';
import { TagInput } from '../TagInput';
import type { SelectionType } from '../../hooks/useAddProductLogic';
import { Text } from '@/src/components/data';

interface Props {
  onSelect: (type: SelectionType) => void;
  generatedSku: string;
  isGeneratingSku?: boolean;
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
}: {
  label: string;
  value: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        'flex w-full items-center justify-between gap-3 rounded-md border border-rule',
        'bg-sheet px-3 py-2 text-left transition-colors',
        'hover:bg-sheet-hover hover:border-rule-strong',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rule-focus',
      ].join(' ')}
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
  );
}

export function Step1BasicInfo({ onSelect, generatedSku, isGeneratingSku }: Props) {
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
      />
      <Selector label="Supplier" value={wholesalerLabel || store.wholesalerId} onSelect={() => onSelect('wholesaler')} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input label="Brand" value={store.brandName} onChange={(e) => setField('brandName', e.target.value)} />
        <Selector label="Unit Type" value={store.unitType} onSelect={() => onSelect('unitType')} />
      </div>
      <Selector label="Category" value={store.category} onSelect={() => onSelect('category')} />
      <Selector label="Sub-Category" value={store.subCategory} onSelect={() => onSelect('subCategory')} />
      <Selector label="Product Group" value={store.productGroup} onSelect={() => onSelect('productGroup')} />
      <Selector label="Classification" value={store.productClassification} onSelect={() => onSelect('productClassification')} />
      {(generatedSku || store.sku) && (
        <div className="rounded-md border border-ok-border bg-ok-wash px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-ok">Reserved SKU</p>
          <p className="font-identifier text-lg font-semibold text-ink">{generatedSku || store.sku}</p>
          {isGeneratingSku && <Text as="p" variant="caption">Generating…</Text>}
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
