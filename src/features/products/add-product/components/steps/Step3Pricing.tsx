import React, { useMemo } from 'react';
import { Input } from '@/src/components/ui/Input';
import { useAddProductStore } from '../../store/useAddProductStore';
import { resolveHasVariant } from '../../utils/resolveHasVariant';
import { InventoryConfigSection } from '../InventoryConfigSection';
import { VariationConfigSection } from '../VariationConfigSection';

interface Props {
  sellPrice: number;
  platformMargin: number;
  onGenerateVariations: () => void;
  isEditMode?: boolean;
  errors?: Record<string, string>;
}

export function Step3Pricing({
  sellPrice,
  platformMargin,
  onGenerateVariations,
  isEditMode = false,
  errors = {},
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
      <div className="p-4 rounded-2xl border border-border-default bg-surface-muted/50 space-y-3">
        <p className="text-sm font-semibold text-text-primary">Pricing Engine</p>
        <Input
          label="Base Price (৳)"
          type="text"
          inputMode="decimal"
          value={basePrice}
          onChange={(e) => handleBasePriceChange(e.target.value)}
          error={errors.basePrice}
        />
        <div className="flex items-center justify-between text-sm">
          <span className="text-text-secondary">Platform Margin</span>
          <span className="font-semibold text-text-primary">{platformMargin}%</span>
        </div>
        <p className="text-2xl font-bold text-emerald-600">Selling: ৳ {sellPrice.toFixed(2)}</p>
      </div>

      {hasVariantRaw === null && !isEditMode && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
          Choose whether this product has variants when leaving Step 2.
        </div>
      )}

      {!hasVariant ? (
        <>
          <InventoryConfigSection selectedSizes={selectedSizes} isEditMode={isEditMode} errors={errors} />
          <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-surface-muted border border-border-subtle">
            <div>
              <p className="text-xs text-text-tertiary uppercase font-semibold">Total Stock</p>
              <p className="text-xl font-bold text-text-primary">{totalStock}</p>
            </div>
            <div>
              <p className="text-xs text-text-tertiary uppercase font-semibold">Global MOQ</p>
              <p className="text-xl font-bold text-text-primary">{totalMoq}</p>
            </div>
          </div>
        </>
      ) : (
        <VariationConfigSection
          onGenerate={onGenerateVariations}
          platformMargin={platformMargin}
          isEditMode={isEditMode}
          errorMessage={errors.variations}
        />
      )}
    </div>
  );
}
