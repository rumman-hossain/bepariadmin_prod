import { Input } from '@/src/components/controls';
import { useAddProductStore } from '../store/useAddProductStore';
import { Text } from '@/src/components/data';

interface Props {
  selectedSizes: string[];
  isEditMode?: boolean;
  errors?: Record<string, string>;
}

function cleanDigits(value: string): string {
  return value.replace(/[^0-9]/g, '').replace(/^0+/, '') || '';
}

export function InventoryConfigSection({ selectedSizes, isEditMode = false, errors = {} }: Props) {
  const store = useAddProductStore();
  const { setField, stock, moq, lowStockAlert, moqSet, sizeStockSet, sizeLowStockAlertSet, stockedOutSizes, generalStockedOut } = store;

  const toggleSizeStockOut = (size: string) => {
    const isOut = stockedOutSizes.includes(size);
    if (isOut) {
      setField(
        'stockedOutSizes',
        stockedOutSizes.filter((s) => s !== size),
      );
    } else {
      setField('sizeStockSet', { ...sizeStockSet, [size]: '0' });
      setField('moqSet', { ...moqSet, [size]: '0' });
      setField('sizeLowStockAlertSet', { ...sizeLowStockAlertSet, [size]: '0' });
      setField('stockedOutSizes', [...stockedOutSizes, size]);
    }
  };

  if (selectedSizes.length > 0) {
    return (
      <div className="space-y-3">
        <Text as="p" variant="strong">Size-Based Inventory & MOQ</Text>
        <div className="table-cards-wrap overflow-x-auto rounded-xl border border-rule">
          {/*
            Was `min-w-[480px]`, which on a 375px phone meant dragging a
            five-column table of text inputs sideways to fill it in. Now uses
            the same `.table-cards` treatment as DataTable: one card per size,
            each field labelled.
          */}
          <table className="table-cards w-full text-sm">
            <thead className="bg-sheet-2">
              <tr>
                <th className="text-left px-3 py-2 font-semibold text-ink-3">Size</th>
                <th className="text-left px-3 py-2 font-semibold text-ink-3">Stock</th>
                <th className="text-left px-3 py-2 font-semibold text-ink-3">MOQ</th>
                <th className="text-left px-3 py-2 font-semibold text-ink-3">Alert</th>
                {isEditMode && <th className="text-left px-3 py-2 font-semibold text-ink-3">Action</th>}
              </tr>
            </thead>
            <tbody>
              {selectedSizes.map((size) => {
                const isOut = stockedOutSizes.includes(size);
                return (
                  <tr key={size} className="border-t border-rule-subtle">
                    <td data-label="Size" data-primary className="px-3 py-2 font-semibold">{size}</td>
                    <td data-label="Stock" className="px-3 py-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        disabled={isOut}
                        value={sizeStockSet[size] ?? ''}
                        onChange={(e) =>
                          setField('sizeStockSet', { ...sizeStockSet, [size]: cleanDigits(e.target.value) })
                        }
                        className="w-full h-9 px-2 rounded-lg border border-rule bg-sheet-2 text-sm disabled:opacity-40"
                      />
                    </td>
                    <td data-label="MOQ" className="px-3 py-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        disabled={isOut}
                        value={moqSet[size] ?? ''}
                        onChange={(e) => setField('moqSet', { ...moqSet, [size]: cleanDigits(e.target.value) })}
                        className="w-full h-9 px-2 rounded-lg border border-rule bg-sheet-2 text-sm disabled:opacity-40"
                      />
                    </td>
                    <td data-label="Alert" className="px-3 py-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        disabled={isOut}
                        value={sizeLowStockAlertSet[size] ?? ''}
                        onChange={(e) =>
                          setField('sizeLowStockAlertSet', {
                            ...sizeLowStockAlertSet,
                            [size]: cleanDigits(e.target.value),
                          })
                        }
                        className="w-full h-9 px-2 rounded-lg border border-rule bg-sheet-2 text-sm disabled:opacity-40"
                      />
                    </td>
                    {isEditMode && (
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => toggleSizeStockOut(size)}
                          className="text-xs font-semibold text-brass hover:underline"
                        >
                          {isOut ? 'Restock' : 'Stock Out'}
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {errors.sizes && <p className="text-xs text-bad">{errors.sizes}</p>}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <Input
        label="Stock"
        type="number"
        value={stock}
        disabled={generalStockedOut}
        onChange={(e) => setField('stock', e.target.value)}
      />
      <Input
        label="MOQ"
        type="number"
        value={moq}
        disabled={generalStockedOut}
        onChange={(e) => setField('moq', e.target.value)}
      />
      <Input
        label="Low Stock Alert"
        type="number"
        value={lowStockAlert}
        disabled={generalStockedOut}
        onChange={(e) => setField('lowStockAlert', e.target.value)}
      />
    </div>
  );
}
