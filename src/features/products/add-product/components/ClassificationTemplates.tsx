import { useEffect, useMemo } from 'react';
import { cn } from '@/src/design-system/utils/cn';
import { useAddProductStore } from '../store/useAddProductStore';
import { Text } from '@/src/components/data';
import { Button, Textarea } from '@/src/components/controls';

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

  const selected = details.find((d) => d.id === productDetailId);
  /*
   * Whether the template's words are already in the box. Compared on the
   * trimmed text rather than on a "was it seeded" flag: the operator may have
   * typed around it, cleared it, or come back to an edit where the seeding
   * happened months ago, and the only thing that matters is whether the text is
   * there NOW.
   */
  const templateTextPresent = Boolean(
    selected?.details && description.includes(selected.details.trim()),
  );

  /*
   * ADDING TO THE TEMPLATE, NOT REPLACING WHAT IS WRITTEN.
   *
   * Appends with a blank line between, and only fills outright when the box is
   * empty. The rule this preserves is the one above: a template may fill an
   * empty description, it may not silently replace one. The difference here is
   * that the operator asked for it by pressing the button, so it is not silent
   * — and it still cannot destroy anything, because appending keeps their text.
   */
  const insertTemplateText = () => {
    if (!selected?.details) return;
    const current = description.trim();
    setField('description', current ? `${current}\n\n${selected.details}` : selected.details);
  };

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

      {/*
        THE TEMPLATE TEXT, WHERE IT CAN BE CHANGED.

        The cards above showed the wording in a `line-clamp-3` paragraph inside a
        button — visible, truncated, and unreachable. The only way to alter it
        was to find the Description box back on step 1 and realise it was the
        same words, which nothing on this screen said.

        This is that same `description` field, not a copy: one store key, two
        places it can be edited. Putting it beside the template is the point —
        the operator picks the boilerplate and then adds the two lines that make
        it this product, without leaving the step or guessing where the text
        went.
      */}
      <Textarea
        label="Description"
        value={description}
        onChange={(e) => setField('description', e.target.value)}
        rows={6}
        hint="Filled from the template above. Edit it, or add your own lines — this is the same description as step 1, and it is what is saved."
      />

      {selected?.details && !templateTextPresent && (
        <Button type="button" variant="outline" onClick={insertTemplateText}>
          {description.trim() ? 'Add template text' : 'Use template text'}
        </Button>
      )}
    </div>
  );
}
