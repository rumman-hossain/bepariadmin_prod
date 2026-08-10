import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/src/design-system/utils/cn';
import { useAddProductStore } from '../store/useAddProductStore';
import { Text } from '@/src/components/data';
import { Button, Input, Textarea } from '@/src/components/controls';
import { Dialog, DialogFooter } from '@/src/components/feedback';
import { Pencil } from 'lucide-react';
import { useAuth } from '@/src/hooks/useAuth';
import { hasRole, ADMIN_WRITE } from '@/src/auth/roles';
import { useUpdateClassificationTemplate } from '../../queries';

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
   * Editing the shared catalogue template is a separate, admin-only act — see
   * the dialog below. `ADMIN_WRITE` mirrors the backend's AdminOnly on
   * PATCH /catalog/edit/{id}, so the button is not offered to somebody the
   * server would refuse.
   */
  const { user } = useAuth();
  const canEditCatalogue = hasRole(user?.role, ADMIN_WRITE);
  const saveTemplate = useUpdateClassificationTemplate();
  const [editingTemplate, setEditingTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateText, setTemplateText] = useState('');
  const [templateError, setTemplateError] = useState<string | null>(null);

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

  const openTemplateEditor = () => {
    if (!selected) return;
    setTemplateName(selected.name);
    setTemplateText(selected.details ?? '');
    setTemplateError(null);
    setEditingTemplate(true);
  };

  const submitTemplate = async () => {
    if (!selected) return;
    setTemplateError(null);
    try {
      await saveTemplate.mutateAsync({
        detailId: selected.id,
        name: templateName,
        description: templateText,
      });
      /*
       * Write the saved wording back into the store by hand.
       *
       * `classificationDetails` is not a query — it is seeded once from
       * /catalog/sku when the classification is chosen, so there is nothing to
       * invalidate. Without this the dialog closes and the card underneath
       * still shows the old text, which reads as the save having failed.
       */
      setField(
        'classificationDetails',
        details.map((d) =>
          d.id === selected.id ? { ...d, name: templateName, details: templateText } : d,
        ) as never,
      );
      setEditingTemplate(false);
    } catch (e) {
      setTemplateError((e as Error).message);
    }
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
        THE TEMPLATE TEXT, WHERE IT CAN BE CHANGED — AND ONLY HERE.

        The cards above showed the wording in a `line-clamp-3` paragraph inside a
        button: visible, truncated, and unreachable. The only way to alter it was
        to find the Description box on step 1 and work out that it held the same
        words, which nothing said.

        Step 1 no longer carries one. Two boxes over a single store key is one
        field pretending to be two, and whichever the operator edited last won
        with nothing on screen admitting the other existed.
      */}
      <Textarea
        label="Description"
        value={description}
        onChange={(e) => setField('description', e.target.value)}
        rows={6}
        hint="Filled from the template above. Edit it or add your own lines — this is what is saved."
      />

      <div className="flex flex-wrap gap-2">
        {selected?.details && !templateTextPresent && (
          <Button type="button" variant="outline" onClick={insertTemplateText}>
            {description.trim() ? 'Add template text' : 'Use template text'}
          </Button>
        )}

        {/*
          Editing the CATALOGUE template, which is a different act from editing
          this product's description above — and the dialog says so, because the
          two boxes look alike and only one of them changes other people's
          products.

          Admin-gated to match the server: `PATCH /catalog/edit/{id}` sits behind
          AdminOnly, so for anyone else this button could only produce a 403.
        */}
        {canEditCatalogue && selected && (
          <Button type="button" variant="ghost" iconLeft={Pencil} onClick={openTemplateEditor}>
            Edit catalogue template
          </Button>
        )}
      </div>

      <Dialog
        open={editingTemplate}
        onClose={() => setEditingTemplate(false)}
        size="md"
        title="Edit the catalogue template"
        subtitle="Shared wording — this is not the description of the product you are registering."
        footer={
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setEditingTemplate(false)}
              disabled={saveTemplate.isPending}
            >
              Cancel
            </Button>
            <Button onClick={submitTemplate} loading={saveTemplate.isPending}>
              Save template
            </Button>
          </DialogFooter>
        }
      >
        <div className="space-y-3">
          <p className="flex gap-2 rounded-md border border-warn-border bg-warn-wash px-2.5 py-2 text-xs text-warn">
            <span aria-hidden="true">⚠</span>
            <span>
              <b className="font-semibold">This changes the catalogue for everyone.</b> Every
              product registered under <b className="font-semibold">{selected?.name}</b> from now
              on is seeded with this wording. Products already registered keep the description
              they were saved with.
            </span>
          </p>

          <Input
            label="Template name"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
          />
          <Textarea
            label="Template text"
            value={templateText}
            onChange={(e) => setTemplateText(e.target.value)}
            rows={8}
            hint="Leave a field unchanged to keep it. The server ignores an empty one rather than clearing it."
          />

          {templateError && (
            <p role="alert" className="text-sm text-bad">
              {templateError}
            </p>
          )}
        </div>
      </Dialog>
    </div>
  );
}
