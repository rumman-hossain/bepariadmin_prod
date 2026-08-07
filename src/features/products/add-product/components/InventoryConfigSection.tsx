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

  /*
   * MARKING A SIZE OUT DESTROYED ITS FIGURES, AND RESTOCKING DID NOT BRING
   * THEM BACK.
   *
   * Going out wrote '0' into all three maps; coming back in only removed the
   * size from `stockedOutSizes`, leaving 0/0/0 behind. isVariationStocked then
   * refuses a zero stock, so the operator was blocked on a size they had just
   * restocked and had to retype three numbers they never chose to clear —
   * every time, for every size, with no undo.
   *
   * Nothing needed to be written in the first place. `stockedOutSizes` already
   * says the size is unavailable, and the validator and the payload both
   * consult it: `validateSizedInventory` skips a stocked-out size entirely.
   * Zeroing the maps was a second, lossy way of recording the same fact — and
   * the destructive one, because a flag can be flipped back and a number that
   * has been overwritten is gone.
   *
   * So the toggle now only toggles. The figures are untouched in both
   * directions, which is also what the sizeless switch above does and what the
   * grid on step 3 has always done.
   */
  const toggleSizeStockOut = (size: string) => {
    setField(
      'stockedOutSizes',
      stockedOutSizes.includes(size)
        ? stockedOutSizes.filter((s) => s !== size)
        : [...stockedOutSizes, size],
    );
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
                          // Every row's button reads "Stock Out" otherwise, so
                          // a screen-reader user hears the same label N times
                          // with nothing saying which size it acts on.
                          aria-label={`${isOut ? 'Restock' : 'Stock out'} size ${size}`}
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
    <div className="space-y-3">
      {/*
        THE STOCK-OUT SWITCH, WHICH NOTHING COULD FLIP.

        `generalStockedOut` disables the three inputs below and makes
        validateStep3 skip them entirely — "a product deliberately marked out of
        stock has no figures to check". No control in the console set it, so a
        sizeless product that is genuinely out of stock could not be recorded as
        one: the operator had to invent a stock number or be blocked.

        The sized path has had its counterpart all along — the per-size In/Out
        toggle in the stock grid. This is that control for the product that has
        no sizes, in the same words, because the distinction is the same one.
      */}
      <label className="flex items-start gap-2.5 rounded-xl border border-rule bg-sheet-2 p-3">
        <input
          type="checkbox"
          checked={generalStockedOut}
          onChange={(e) => setField('generalStockedOut', e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-brass"
        />
        <span className="min-w-0">
          <Text as="p" variant="strong">Out of stock</Text>
          <Text as="p" variant="caption">
            <b className="font-semibold text-ink">Not the same as zero.</b> A stock-out is a
            decision that this is unavailable; a zero is stock that ran down and will be
            reordered. Marking it out leaves the figures below alone.
          </Text>
        </span>
      </label>

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
    </div>
  );
}
