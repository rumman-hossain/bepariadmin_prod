import { Money, Text } from '@/src/components/data';
import { useMemo } from 'react';
import { Input } from '@/src/components/controls';
import { useAddProductStore } from '../../store/useAddProductStore';
import { resolveHasVariant } from '../../utils/resolveHasVariant';
import { InventoryConfigSection } from '../InventoryConfigSection';
import { VariationConfigSection } from '../VariationConfigSection';
import { StockMatrix } from '../StockMatrix';
import type { VariationIssue } from '../../utils/validateWizardStep';

interface Props {
  sellPrice: number;
  effectiveMargin: number;
  onGenerateVariations: () => void;
  isEditMode?: boolean;
  errors?: Record<string, string>;
  /** Per-variation, per-size faults — see VariationIssue. */
  issues?: VariationIssue[];
}

export function Step3Pricing({
  sellPrice,
  effectiveMargin,
  onGenerateVariations,
  isEditMode = false,
  errors = {},
  issues = [],
}: Props) {
  const store = useAddProductStore();
  const { setField, hasVariant: hasVariantRaw, selectedSizes, basePrice, sizeStockSet, stock, moqSet, moq, variations } =
    store;

  const hasVariant = resolveHasVariant(hasVariantRaw, variations);

  const totalStock = useMemo(() => {
    if (selectedSizes.length > 0) {
      return Object.values(sizeStockSet).reduce((sum, v) => sum + (Number(v) || 0), 0);
    }
    return Number(stock) || 0;
  }, [selectedSizes.length, sizeStockSet, stock]);

  const totalMoq = useMemo(() => {
    const fromSet = Object.values(moqSet).reduce((sum, v) => sum + (Number(v) || 0), 0);
    return fromSet > 0 ? fromSet : Number(moq) || 0;
  }, [moqSet, moq]);

  const handleBasePriceChange = (value: string) => {
    const cleaned = value.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    const final = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : cleaned;
    setField('basePrice', final);
  };

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-2xl border border-rule bg-sheet-2/50 space-y-3">
        <Text as="p" variant="strong">Pricing Engine</Text>
        <Input
          label="Base Price (৳)"
          type="text"
          inputMode="decimal"
          value={basePrice}
          onChange={(e) => handleBasePriceChange(e.target.value)}
          error={errors.basePrice}
        />
        <div className="flex items-center justify-between text-sm">
          <span className="text-ink-2">Platform Margin</span>
          <span className="font-semibold text-ink">{effectiveMargin}%</span>
        </div>
        <p className="flex items-baseline gap-2">
          <Text variant="secondary">Selling price</Text>
          <Money amount={sellPrice} size="display" decimals />
        </p>
      </div>

      {hasVariantRaw === null && !isEditMode && (
        <div className="p-3 rounded-xl bg-warn-wash border border-warn-border text-sm text-warn">
          Choose whether this product has variants when leaving Step 2.
        </div>
      )}

      {!hasVariant ? (
        <>
          <InventoryConfigSection selectedSizes={selectedSizes} isEditMode={isEditMode} errors={errors} />
          <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-sheet-2 border border-rule-subtle">
            <div>
              <Text as="p" variant="label">Total Stock</Text>
              <p className="text-xl font-bold text-ink">{totalStock}</p>
            </div>
            <div>
              <Text as="p" variant="label">Global MOQ</Text>
              <p className="text-xl font-bold text-ink">{totalMoq}</p>
            </div>
          </div>
        </>
      ) : (
        <>
          <VariationConfigSection
            onGenerate={onGenerateVariations}
            effectiveMargin={effectiveMargin}
            errorMessage={errors.variations}
            issues={issues}
          />

          {/*
            PER-SIZE STOCK PER VARIATION — without this, a sized variant product
            cannot be saved at all.

            `VariationConfigSection` above edits whole-variation price, stock and
            MOQ. `isVariationStocked` (validateWizardStep.ts) demands a stock,
            MOQ and alert for EVERY selected size of EVERY variation, and no
            control in the console produced them: this component existed but had
            no importer, so step 3 reported "N variation(s) have invalid
            stock/moq/alert logic" with nothing on screen that could fix it.

            Only when there are sizes. A variant product with no sizes is fully
            described by the whole-variation figures above, and an empty grid
            below them would just be noise.
          */}
          {selectedSizes.length > 0 && variations.length > 0 && (
            <StockMatrix issues={issues} />
          )}
        </>
      )}
    </div>
  );
}
