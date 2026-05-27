import React from 'react';
import { Card } from '@/src/components/ui/Card';
import { useAddProductStore } from '../../store/useAddProductStore';

interface Props {
  sellPrice: number;
}

export function Step6Summary({ sellPrice }: Props) {
  const s = useAddProductStore();

  const rows = [
    ['Name', s.name],
    ['SKU', s.sku],
    ['Wholesaler', s.wholesalerId],
    ['Category', s.category],
    ['Sub-Category', s.subCategory],
    ['Product Group', s.productGroup],
    ['Classification', s.productClassification],
    ['Base Price', s.basePrice ? `৳${s.basePrice}` : '—'],
    ['Selling Price', `৳${sellPrice.toFixed(2)}`],
    ['Has Variants', s.hasVariant == null ? '—' : s.hasVariant ? 'Yes' : 'No'],
    ['Dispatch', s.dispatchTime || '—'],
    ['Variations', String(s.variations.length)],
  ];

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-text-primary mb-3">Review before register</h3>
        <dl className="space-y-2">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 text-sm">
              <dt className="text-text-tertiary">{label}</dt>
              <dd className="text-text-primary font-medium text-right">{value || '—'}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </div>
  );
}
