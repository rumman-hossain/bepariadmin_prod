/**
 * The variant sub-SKUs, nested under the product that owns them.
 *
 * WHY THIS FETCHES
 *
 * `GET /api/v1/admin/products` returns a variant COUNT, not the variants. That
 * is deliberate on the server's part — a list of 25 products would otherwise
 * carry every sub-SKU of every row, most of which nobody opens. So the panel
 * loads its own detail the first time it is opened, and React Query keeps it
 * for the next open.
 *
 * It shares `queryKeys.products.detail` with the detail page ON PURPOSE, and
 * therefore also shares that page's catalogue-label resolution even though it
 * renders none of those labels. Giving this panel a leaner fetch would put two
 * different shapes behind one cache key, and whichever mounted first would win
 * — the exact defect the two category hooks had, where the Products screen
 * rendered raw uuids because it read the other hook's data. The extra lookups
 * are cached app-wide after the first expansion; a silently wrong product is
 * not recoverable.
 */
import { useProductQuery } from '../queries';
import { Money, Text } from '@/src/components/data';
import { cn } from '@/src/design-system/utils/cn';

interface Props {
  productId: string;
  /** From the list row. Used to size the skeleton and to detect disagreement. */
  expectedCount: number;
}

export function ProductVariantRows({ productId, expectedCount }: Props) {
  const { data: product, isPending, error } = useProductQuery(productId, {});

  if (isPending) {
    return (
      <div className="px-4 py-3 pl-14">
        <div className="flex flex-col gap-2" aria-label="Loading variants">
          {Array.from({ length: Math.min(expectedCount, 3) }).map((_, i) => (
            <div key={i} className="h-5 w-full max-w-md animate-pulse rounded-xs bg-sheet" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-3 pl-14">
        <Text variant="secondary" className="text-bad">
          These variants could not be loaded.
        </Text>
      </div>
    );
  }

  const variations = product?.variations ?? [];

  if (variations.length === 0) {
    return (
      <div className="px-4 py-3 pl-14">
        <Text variant="secondary">
          {/*
            The list said there were variants and the product has none. That is
            not an empty state, it is a disagreement — `has_variant` is set at
            registration and nothing walks it back when the last variation is
            deleted, so this is the shape that mismatch takes on screen.
          */}
          {expectedCount > 0
            ? `The list counted ${expectedCount}, but this product has no variations on file.`
            : 'No variants.'}
        </Text>
      </div>
    );
  }

  /*
   * A LIST, not a nested <table>.
   *
   * DataTable becomes cards below `md`, and its card selectors are all
   * direct-child — so a table inside an expansion cell survives the switch
   * untouched and renders as a wide scrolling box inside a stacked card. A
   * list has no such second layout to get wrong, and at three to five variants
   * it reads better than a grid anyway.
   */
  return (
    <ul className="divide-y divide-rule-subtle">
      {variations.map((v, i) => {
        const stock = v.stock ?? 0;
        const label = [v.color, v.design].filter(Boolean).join(' · ') || v.subName || '—';

        return (
          <li
            key={v.id ?? v.subSku ?? i}
            className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-2 pl-6 pr-4 sm:pl-14"
          >
            <span className="min-w-0 flex-1 basis-40">
              <span className="block truncate text-xs font-medium text-ink">{label}</span>
              <span className="block truncate font-mono text-2xs text-ink-2">
                {v.subSku || 'no sub-SKU'}
              </span>
            </span>

            <span className="flex items-baseline gap-1.5">
              <Text variant="label">Stock</Text>
              <span
                className={cn(
                  'text-xs font-semibold',
                  // Zero on one variant is the case a parent total hides: the
                  // product reads "in stock" while the colour customers
                  // actually want cannot be ordered.
                  stock === 0 ? 'text-bad' : stock <= 10 ? 'text-warn' : 'text-ink',
                )}
              >
                {stock}
              </span>
            </span>

            <span className="flex items-baseline gap-1.5">
              <Text variant="label">Price</Text>
              <span className="text-xs text-ink">
                {v.price ? <Money amount={v.price} /> : <span className="text-ink-3">—</span>}
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
