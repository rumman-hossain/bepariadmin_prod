import React, { useEffect } from 'react';
import { cn } from '@/src/design-system/utils/cn';
import { useAddProductStore } from '../store/useAddProductStore';

interface CatalogDetail {
  id: string;
  name: string;
  details?: string;
}

export function ClassificationTemplates() {
  const classificationDetails = useAddProductStore((s) => s.classificationDetails);
  const productDetailId = useAddProductStore((s) => s.productDetailId);
  const setField = useAddProductStore((s) => s.setField);

  const details = (classificationDetails as CatalogDetail[]) ?? [];

  useEffect(() => {
    if (details.length > 0 && !productDetailId) {
      const first = details[0];
      setField('productDetailId', first.id);
      if (first.details) setField('description', first.details);
    }
  }, [details, productDetailId, setField]);

  if (details.length === 0) return null;

  return (
    <div className="sm:col-span-2 space-y-3">
      <div>
        <p className="text-sm font-semibold text-text-primary">Classification Templates</p>
        <p className="text-xs text-text-tertiary mt-0.5">Pick the one that best describes your product</p>
      </div>
      <div className="space-y-2">
        {details.map((detail) => {
          const isSelected = productDetailId === detail.id;
          return (
            <button
              key={detail.id}
              type="button"
              onClick={() => {
                setField('productDetailId', detail.id);
                if (detail.details) setField('description', detail.details);
              }}
              className={cn(
                'w-full text-left p-3 rounded-xl border transition-colors',
                isSelected
                  ? 'border-accent-primary bg-accent-primary-light/40'
                  : 'border-border-default hover:bg-surface-muted',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-text-primary">{detail.name}</span>
                {isSelected && (
                  <span className="text-[10px] font-bold uppercase tracking-wide text-accent-primary">Selected</span>
                )}
              </div>
              {detail.details && (
                <p className="text-xs text-text-secondary mt-1.5 line-clamp-3">{detail.details}</p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
