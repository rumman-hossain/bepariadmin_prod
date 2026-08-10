import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { Button, Input } from '@/src/components/controls';
import { Money, Text } from '@/src/components/data';
import { useUpdateVariation } from '../queries';
import { VariantThumb } from './VariantThumb';
import type { Product } from '../types';

/*
 * Derived from `Product`, not the wizard's `ProductVariation`.
 *
 * They are different shapes: this one carries `sellingPrice` — the figure the
 * server derives and this row must show — and allows `color: null`, which the
 * wizard's type does not. Importing the wrong one compiled everywhere except
 * the single call site that passes real data.
 */
type DetailVariation = NonNullable<Product['variations']>[number];

/**
 * One variant, correctable.
 *
 * `ProductVariantRows` and this screen both rendered every figure as text, so a
 * price entered during registration could never be changed — the only route to
 * a wrong cost was deleting the product and creating it again. The endpoint was
 * always there: `PATCH /{id}/variations/{varId}` in internal/product/handler.go
 * decodes a whole ProductVariation, and nothing in the console called it.
 *
 * SELLING PRICE IS SHOWN AND NEVER EDITED. It is the server's:
 * `ROUND(base_price * (1 + COALESCE(w.margin, 9.50) / 100), 2)`, derived from
 * the supplier's margin. Offering it as an input would invite an operator to
 * set a figure the next save silently recomputes — and `internal/product/
 * model.go` records what confusing the two costs: one field held both, the base
 * price was discarded, and order pricing read the wrong one.
 *
 * So the operator edits the cost, and the retail figure updates when the server
 * says what it is.
 */
interface Props {
  productId: string;
  variation: DetailVariation;
  /** The product's own image, for a variant with none — see VariantThumb. */
  fallbackImage?: string;
}

/** Empty means "not supplied", which is different from zero. */
const numberOrUndefined = (raw: string): number | undefined => {
  if (raw.trim() === '') return undefined;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};

export function VariantEditRow({ productId, variation: v, fallbackImage }: Props) {
  const [editing, setEditing] = useState(false);
  const [cost, setCost] = useState('');
  const [stock, setStock] = useState('');
  const [error, setError] = useState<string | null>(null);
  const save = useUpdateVariation(productId);

  const label = [v.color, v.design].filter(Boolean).join(' · ') || v.subName || '—';
  const currentStock = v.stock ?? 0;

  const open = () => {
    /*
     * Seeded from the product each time the form opens, not held in state
     * across closes. A stale draft is how an operator who cancelled an edit,
     * came back, and pressed Save writes a figure they had abandoned.
     */
    setCost(v.basePrice != null ? String(v.basePrice) : '');
    setStock(String(currentStock));
    setError(null);
    setEditing(true);
  };

  const submit = async () => {
    const price = numberOrUndefined(cost);
    const nextStock = numberOrUndefined(stock);
    if (price === undefined && nextStock === undefined) {
      setError('Enter a cost or a stock figure.');
      return;
    }
    setError(null);
    try {
      await save.mutateAsync({
        variationId: v.id!,
        // Only what changed. Sending an untouched field back is how a
        // concurrent edit by somebody else gets overwritten with a stale value.
        input: {
          ...(price !== undefined && price !== v.basePrice ? { price } : {}),
          ...(nextStock !== undefined && nextStock !== currentStock ? { stock: nextStock } : {}),
        },
      });
      setEditing(false);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  if (!editing) {
    return (
      <li className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2">
        <VariantThumb variant={v} fallback={fallbackImage} size="md" />

        <span className="min-w-0 flex-1 basis-48">
          <span className="block truncate text-sm text-ink">{label}</span>
          <span className="block truncate font-mono text-2xs text-ink-2">
            {v.subSku || 'no sub-SKU'}
          </span>
        </span>

        <span className="flex items-baseline gap-1.5">
          <Text variant="label">Stock</Text>
          <span
            className={
              currentStock === 0
                ? 'text-sm font-semibold text-bad'
                : currentStock <= 10
                  ? 'text-sm font-semibold text-warn'
                  : 'text-sm font-semibold text-ink'
            }
          >
            {currentStock}
          </span>
        </span>

        {/* Cost and selling price, named. See ProductVariantRows. */}
        <span className="flex items-baseline gap-1.5">
          <Text variant="label">Cost</Text>
          <span className="text-sm text-ink-2">
            {v.basePrice ? <Money amount={v.basePrice} /> : '—'}
          </span>
        </span>

        <span className="flex items-baseline gap-1.5">
          <Text variant="label">Sells at</Text>
          <span className="text-sm font-semibold text-ink">
            {v.sellingPrice ? <Money amount={v.sellingPrice} /> : '—'}
          </span>
        </span>

        {/* Disabled rather than hidden without an id: a variant the server did
            not identify cannot be addressed by PATCH, and a button that 404s is
            worse than one that explains itself. */}
        <Button
          variant="ghost"
          iconLeft={Pencil}
          onClick={open}
          disabled={!v.id}
          aria-label={`Edit ${label}`}
          title={v.id ? undefined : 'This variant has no id on file and cannot be edited.'}
        >
          Edit
        </Button>
      </li>
    );
  }

  return (
    <li className="flex flex-col gap-2 py-3">
      <div className="flex items-center gap-3">
        <VariantThumb variant={v} fallback={fallbackImage} size="md" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-ink">{label}</span>
          <span className="block truncate font-mono text-2xs text-ink-2">{v.subSku}</span>
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Input
          label="Cost"
          type="number"
          value={cost}
          onChange={(e) => setCost(e.target.value)}
          hint="What the supplier charges."
        />
        <Input
          label="Stock"
          type="number"
          value={stock}
          onChange={(e) => setStock(e.target.value)}
        />
        {/*
          Read-only, and said so. The server derives it from the supplier's
          margin; an input here would be a figure the next save overwrites.
        */}
        <div className="flex flex-col gap-1">
          <Text variant="label">Sells at</Text>
          <div className="flex h-10 items-center rounded-md border border-rule bg-sheet-2 px-3">
            <span className="text-sm font-semibold text-ink">
              {v.sellingPrice ? <Money amount={v.sellingPrice} /> : '—'}
            </span>
          </div>
          <Text variant="caption">Set by the supplier’s margin. Updates when the cost is saved.</Text>
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm text-bad">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <Button onClick={submit} loading={save.isPending}>
          Save
        </Button>
        <Button variant="secondary" onClick={() => setEditing(false)} disabled={save.isPending}>
          Cancel
        </Button>
      </div>
    </li>
  );
}
