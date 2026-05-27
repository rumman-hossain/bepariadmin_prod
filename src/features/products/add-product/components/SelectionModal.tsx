import React, { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Modal } from '@/src/components/ui/Modal';
import { Input } from '@/src/components/ui/Input';
import type { SelectionType } from '../hooks/useAddProductLogic';
import type { CatalogNode } from '../../types/registration';
import { useAddProductStore } from '../store/useAddProductStore';
import { listWholesalers } from '@/src/features/wholesalers/api/wholesalerApi';
import type { Wholesaler } from '@/src/types/domain';

interface SelectionModalProps {
  selectionType: SelectionType;
  onClose: () => void;
  listSearch: string;
  onSearchChange: (v: string) => void;
  categories: CatalogNode[];
  subCategories: CatalogNode[];
  productGroups: CatalogNode[];
  classifications: CatalogNode[];
  unitTypes: Array<{ name: string; code: string }>;
  onGenerateSku: (classificationId: string) => void;
  catalogLoading?: boolean;
}

export function SelectionModal({
  selectionType,
  onClose,
  listSearch,
  onSearchChange,
  categories,
  subCategories,
  productGroups,
  classifications,
  unitTypes,
  onGenerateSku,
  catalogLoading,
}: SelectionModalProps) {
  const { setField } = useAddProductStore();
  const [wholesalers, setWholesalers] = useState<Wholesaler[]>([]);
  const [wholesalerLoading, setWholesalerLoading] = useState(false);

  useEffect(() => {
    if (selectionType !== 'wholesaler') return;
    setWholesalerLoading(true);
    void listWholesalers({ search: listSearch, category: 'All', location: 'All', recentlyAdded: false })
      .then(setWholesalers)
      .finally(() => setWholesalerLoading(false));
  }, [selectionType, listSearch]);

  const title = useMemo(() => {
    switch (selectionType) {
      case 'wholesaler':
        return 'Select Wholesaler';
      case 'category':
        return 'Select Category';
      case 'subCategory':
        return 'Select Sub-Category';
      case 'productGroup':
        return 'Select Product Group';
      case 'productClassification':
        return 'Select Classification';
      case 'unitType':
        return 'Select Unit Type';
      default:
        return 'Select';
    }
  }, [selectionType]);

  const items = useMemo(() => {
    const q = listSearch.toLowerCase();
    const filter = <T extends { name: string }>(list: T[]) =>
      list.filter((i) => i.name.toLowerCase().includes(q));

    switch (selectionType) {
      case 'category':
        return filter(categories);
      case 'subCategory':
        return filter(subCategories);
      case 'productGroup':
        return filter(productGroups);
      case 'productClassification':
        return filter(classifications);
      case 'unitType':
        return unitTypes.filter((u) => u.name.toLowerCase().includes(q));
      case 'wholesaler':
        return wholesalers.filter(
          (w) =>
            w.companyName.toLowerCase().includes(q) ||
            w.code?.toLowerCase().includes(q) ||
            w.id.toLowerCase().includes(q),
        );
      default:
        return [];
    }
  }, [selectionType, listSearch, categories, subCategories, productGroups, classifications, unitTypes, wholesalers]);

  const handleSelectWholesaler = (w: Wholesaler) => {
    setField('wholesalerId', w.id);
    setField('wholesalerCode', w.code || '');
    onClose();
  };

  const handleSelect = (item: CatalogNode | { name: string; code?: string; id?: string }) => {
    switch (selectionType) {
      case 'category':
        setField('categoryId', item.id!);
        setField('category', item.name);
        setField('subCategoryId', '');
        setField('subCategory', '');
        setField('productGroupId', '');
        setField('productGroup', '');
        setField('classificationId', '');
        setField('productClassification', '');
        break;
      case 'subCategory':
        setField('subCategoryId', item.id!);
        setField('subCategory', item.name);
        setField('productGroupId', '');
        setField('productGroup', '');
        break;
      case 'productGroup':
        setField('productGroupId', item.id!);
        setField('productGroup', item.name);
        setField('classificationId', '');
        setField('productClassification', '');
        break;
      case 'productClassification':
        setField('classificationId', item.id!);
        setField('productClassification', item.name);
        void onGenerateSku(item.id!);
        break;
      case 'unitType':
        setField('unitType', item.name);
        break;
    }
    onClose();
  };

  if (selectionType === 'none') return null;

  return (
    <Modal open onClose={onClose} size="md">
      <div className="p-6 space-y-4">
        <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
          <Input
            className="pl-9"
            placeholder="Search..."
            value={listSearch}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        {(catalogLoading || wholesalerLoading) && <p className="text-sm text-text-secondary">Loading...</p>}
        <ul className="max-h-72 overflow-y-auto divide-y divide-border-default">
          {selectionType === 'wholesaler'
            ? (items as Wholesaler[]).map((w) => (
                <li key={w.id}>
                  <button
                    type="button"
                    className="w-full text-left px-3 py-3 hover:bg-surface-muted text-sm text-text-primary"
                    onClick={() => handleSelectWholesaler(w)}
                  >
                    <span className="font-medium">{w.companyName}</span>
                    {w.code && <span className="ml-2 text-text-tertiary">{w.code}</span>}
                  </button>
                </li>
              ))
            : items.map((item) => (
                <li key={'id' in item && item.id ? item.id : item.name}>
                  <button
                    type="button"
                    className="w-full text-left px-3 py-3 hover:bg-surface-muted text-sm text-text-primary"
                    onClick={() => handleSelect(item as CatalogNode)}
                  >
                    {'name' in item ? item.name : ''}
                  </button>
                </li>
              ))}
          {!catalogLoading && !wholesalerLoading && items.length === 0 && (
            <li className="px-3 py-6 text-sm text-text-tertiary text-center">No options found</li>
          )}
        </ul>
      </div>
    </Modal>
  );
}
