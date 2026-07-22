import React, { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { Input } from '@/src/components/ui/Input';
import { Textarea } from '@/src/components/ui/Textarea';
import { useAddProductStore } from '../../store/useAddProductStore';
import { listWholesalers } from '@/src/features/wholesalers/api/wholesalerApi';
import { TagInput } from '../TagInput';
import type { SelectionType } from '../hooks/useAddProductLogic';

interface Props {
  onSelect: (type: SelectionType) => void;
  generatedSku: string;
  isGeneratingSku?: boolean;
}

export function Step1BasicInfo({ onSelect, generatedSku, isGeneratingSku }: Props) {
  const store = useAddProductStore();
  const { setField } = store;
  const [wholesalerLabel, setWholesalerLabel] = useState('');

  useEffect(() => {
    if (!store.wholesalerId) return;
    void listWholesalers({ search: '', category: 'All', location: 'All', recentlyAdded: false }).then((data) => {
      const match = data.find((w) => w.id === store.wholesalerId);
      if (match) setWholesalerLabel(match.companyName || match.id);
    });
  }, [store.wholesalerId]);

  const Selector = ({ label, value, type }: { label: string; value: string; type: SelectionType }) => (
    <button
      type="button"
      onClick={() => onSelect(type)}
      className="flex items-center justify-between w-full p-3 rounded-xl border border-border-default hover:bg-surface-muted text-left"
    >
      <div>
        <p className="text-xs text-text-tertiary uppercase">{label}</p>
        <p className="text-sm font-medium text-text-primary">{value || `Choose ${label}`}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-text-tertiary" />
    </button>
  );

  return (
    <div className="space-y-4">
      <Input
        label="Product Name"
        value={store.name}
        onChange={(e) => setField('name', e.target.value)}
        required
      />
      <Selector label="Wholesaler" value={wholesalerLabel || store.wholesalerId} type="wholesaler" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input label="Brand" value={store.brandName} onChange={(e) => setField('brandName', e.target.value)} />
        <Selector label="Unit Type" value={store.unitType} type="unitType" />
      </div>
      <Selector label="Category" value={store.category} type="category" />
      <Selector label="Sub-Category" value={store.subCategory} type="subCategory" />
      <Selector label="Product Group" value={store.productGroup} type="productGroup" />
      <Selector label="Classification" value={store.productClassification} type="productClassification" />
      {(generatedSku || store.sku) && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
          <p className="text-xs text-emerald-700 uppercase font-medium">Reserved SKU</p>
          <p className="text-lg font-bold text-emerald-900">{generatedSku || store.sku}</p>
          {isGeneratingSku && <p className="text-xs text-emerald-600">Generating...</p>}
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
