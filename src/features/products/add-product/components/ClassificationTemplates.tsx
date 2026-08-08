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
  const description = useAddProductStore((s) => s.description);
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

  /*
   * A TEMPLATE MAY FILL AN EMPTY DESCRIPTION. IT MAY NOT REPLACE ONE.
   *
   * This wrote `first.details` over whatever was there, and it runs on MOUNT of
   * step 2 — so the sequence "pick a classification on step 1, type a
   * description, press Continue" silently replaced the operator's words with
   * catalogue boilerplate. Reproduced on dev: a typed sentence became the
   * Bengali template between one step and the next, with nothing said.
   *
   * It mattered little while the description reached no column. It persists
   * now, so the wrong text is durably stored.
   *
   * Read imperatively rather than through a dependency or a ref: including
   * `description` would re-run a one-time seed on every keystroke, and writing
   * a ref during render is what this project's React Compiler lint refuses.
   * `getState()` is the store's own escape hatch for exactly this.
   */
  useEffect(() => {
    if (details.length > 0 && !productDetailId) {
      const first = details[0];
      setField('productDetailId', first.id);
      if (first.details && !useAddProductStore.getState().description.trim()) {
        setField('description', first.details);
      }
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
                // Same rule on an explicit pick: the classification is what the
                // operator chose, the description is what they wrote. Clearing
                // the box first is how they ask for the template text.
                setField('productDetailId', detail.id);
                if (detail.details && !description.trim()) {
                  setField('description', detail.details);
                }
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
