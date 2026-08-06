import { useEffect, useMemo } from 'react';
import { cn } from '@/src/design-system/utils/cn';
import { useAddProductStore } from '../store/useAddProductStore';
import { Text } from '@/src/components/data';

interface CatalogDetail {
  id: string;
  name: string;
  details?: string;
}

export function ClassificationTemplates() {
  const classificationDetails = useAddProductStore((s) => s.classificationDetails);
  const productDetailId = useAddProductStore((s) => s.productDetailId);
  const setField = useAddProductStore((s) => s.setField);

  /*
   * `?? []` produces a NEW array every render, so the effect below re-ran on
   * every render and re-checked (and could re-write) the store each time.
   * Memoised on the store value, the identity is stable until the data changes.
   */
  const details = useMemo(
    () => (classificationDetails as CatalogDetail[]) ?? [],
    [classificationDetails],
  );

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
        <Text as="p" variant="strong">Classification Templates</Text>
        <Text as="p" variant="caption" className="mt-0.5">Pick the one that best describes your product</Text>
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
                  ? 'border-brass bg-brass-wash/40'
                  : 'border-rule hover:bg-sheet-2',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <Text variant="strong">{detail.name}</Text>
                {isSelected && (
                  <span className="text-2xs font-bold uppercase tracking-wide text-brass">Selected</span>
                )}
              </div>
              {detail.details && (
                <p className="text-xs text-ink-2 mt-1.5 line-clamp-3">{detail.details}</p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
