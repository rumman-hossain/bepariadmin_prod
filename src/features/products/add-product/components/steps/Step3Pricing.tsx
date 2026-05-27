import React from 'react';
import { Input } from '@/src/components/ui/Input';
import { Select } from '@/src/components/ui/Select';
import { useAddProductStore } from '../../store/useAddProductStore';

const DISPATCH_OPTIONS = [
  { value: '6H', label: '6 Hours' },
  { value: '12H', label: '12 Hours' },
  { value: '24H', label: '24 Hours' },
  { value: '2D', label: '2 Days' },
  { value: '3D', label: '3 Days' },
  { value: '7D', label: '7 Days' },
];

interface Props {
  sellPrice: number;
  platformMargin: number;
  onGenerateVariations: () => void;
}

export function Step3Pricing({ sellPrice, platformMargin }: Props) {
  const store = useAddProductStore();
  const { setField, hasVariant, selectedSizes } = store;

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-2xl border border-border-default bg-surface-muted/50 space-y-3">
        <p className="text-sm font-semibold text-text-primary">Pricing Engine</p>
        <Input
          label="Base Price (৳)"
          type="number"
          min={0}
          value={store.basePrice}
          onChange={(e) => setField('basePrice', e.target.value)}
        />
        <Input
          label={`Platform Margin (${platformMargin}% default)`}
          type="number"
          min={0}
          value={store.margin}
          onChange={(e) => setField('margin', e.target.value)}
        />
        <p className="text-2xl font-bold text-emerald-600">Selling: ৳ {sellPrice.toFixed(2)}</p>
      </div>

      <Select
        label="Dispatch Time"
        options={DISPATCH_OPTIONS}
        value={store.dispatchTime}
        onChange={(e) => setField('dispatchTime', e.target.value)}
        placeholder="Select dispatch time"
      />

      {hasVariant === false && selectedSizes.length === 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input label="Stock" type="number" value={store.stock} onChange={(e) => setField('stock', e.target.value)} />
          <Input label="MOQ" type="number" value={store.moq} onChange={(e) => setField('moq', e.target.value)} />
          <Input
            label="Low Stock Alert"
            type="number"
            value={store.lowStockAlert}
            onChange={(e) => setField('lowStockAlert', e.target.value)}
          />
        </div>
      )}

      {hasVariant && (
        <div className="space-y-3">
          <Input
            label="Variation Colors (comma separated)"
            value={store.variationColors.join(', ')}
            onChange={(e) =>
              setField(
                'variationColors',
                e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
              )
            }
          />
          <Input
            label="Variation Designs (comma separated)"
            value={store.variationDesigns.join(', ')}
            onChange={(e) =>
              setField(
                'variationDesigns',
                e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
              )
            }
          />
        </div>
      )}
    </div>
  );
}
