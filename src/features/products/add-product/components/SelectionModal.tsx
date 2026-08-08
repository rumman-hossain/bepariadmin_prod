import { useMemo } from 'react';
import { Search } from 'lucide-react';
import { Dialog } from '@/src/components/feedback';
import { Input } from '@/src/components/controls';
import type { SelectionType } from '../hooks/useAddProductLogic';
import type { CatalogNode } from '../../types/registration';
import { useAddProductStore } from '../store/useAddProductStore';
import { useSupplierPickerQuery } from '@/src/features/wholesalers/queries';
import type { Wholesaler } from '@/src/types/domain';
import { Text } from '@/src/components/data';

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

  /*
   * Shares the wholesaler list cache with the supplier screens, so opening this
   * picker after visiting them costs no request.
   *
   * It also removes a race: the previous effect sent `search: listSearch` to
   * the server on every keystroke with no ordering guarantee, so a slow
   * response for "shi" could land after — and overwrite — the results for
   * "shirt". The search term was never needed server-side anyway; the filter
   * below has always narrowed the list in the browser.
   */
  const wholesalerQuery = useSupplierPickerQuery();
  const wholesalerData = wholesalerQuery.data;
  const wholesalerLoading = selectionType === 'wholesaler' && wholesalerQuery.isPending;

  const title = useMemo(() => {
    switch (selectionType) {
      case 'wholesaler':
        return 'Select supplier';
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

  // Split into two memos rather than one union-typed list.
  //
  // A single `items` array typed `Wholesaler | CatalogNode | {name, code}` cannot
  // be narrowed by the JSX below, because the branch condition is
  // `selectionType`, not a property of the element. That forced an
  // `items as Wholesaler[]` cast on one branch and an `'name' in item` probe on
  // the other — and the probe silently rendered an empty string for wholesalers,
  // which have `companyName`, not `name`. Two lists, each precisely typed, remove
  // both the cast and the bug.
  const wholesalerItems = useMemo(() => {
    if (selectionType !== 'wholesaler') return [];
    const q = listSearch.toLowerCase();
    // The `?? []` lives here rather than at the query, where it minted a new
    // array every render and defeated this memo entirely.
    return (wholesalerData ?? []).filter(
      (w) =>
        w.companyName.toLowerCase().includes(q) ||
        w.code?.toLowerCase().includes(q) ||
        w.id.toLowerCase().includes(q),
    );
  }, [selectionType, listSearch, wholesalerData]);

  const catalogItems = useMemo<Array<CatalogNode | { name: string; code: string }>>(() => {
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
        return filter(unitTypes);
      default:
        return [];
    }
  }, [selectionType, listSearch, categories, subCategories, productGroups, classifications, unitTypes]);

  const isEmpty = wholesalerItems.length === 0 && catalogItems.length === 0;

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
    /*
      `title` on the Dialog, not an <h2> in the body.

      Dialog gates its header row — heading and close button — on
      `title || subtitle`, so with the heading inside the body this picker had
      no accessible name and no X: an operator who opened the supplier list by
      accident could only leave it by Escape or a backdrop click, neither of
      which is visible. The `p-6` also doubled Dialog's own `px-5 py-4`.
    */
    <Dialog open onClose={onClose} size="md" title={title}>
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-3" />
          <Input
            className="pl-9"
            placeholder="Search..."
            value={listSearch}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        {(catalogLoading || wholesalerLoading) && <Text as="p" variant="secondary">Loading...</Text>}
        <ul className="max-h-72 overflow-y-auto divide-y divide-rule">
          {selectionType === 'wholesaler'
            ? wholesalerItems.map((w) => (
                <li key={w.id}>
                  <button
                    type="button"
                    className="w-full text-left px-3 py-3 hover:bg-sheet-2 text-sm text-ink"
                    onClick={() => handleSelectWholesaler(w)}
                  >
                    <span className="font-medium">{w.companyName}</span>
                    {w.code && <span className="ml-2 text-ink-3">{w.code}</span>}
                  </button>
                </li>
              ))
            : catalogItems.map((item) => (
                <li key={'id' in item && item.id ? item.id : item.name}>
                  <button
                    type="button"
                    className="w-full text-left px-3 py-3 hover:bg-sheet-2 text-sm text-ink"
                    onClick={() => handleSelect(item as CatalogNode)}
                  >
                    {item.name}
                  </button>
                </li>
              ))}
          {!catalogLoading && !wholesalerLoading && isEmpty && (
            <li className="px-3 py-6 text-sm text-ink-3 text-center">No options found</li>
          )}
        </ul>
      </div>
    </Dialog>
  );
}
