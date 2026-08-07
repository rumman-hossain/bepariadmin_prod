/**
 * The product table's columns.
 *
 * The first cell is an IDENTITY STACK rather than a name: name, then the
 * original SKU, then who owns it and whether it has variants. That ordering is
 * the answer to how operators actually work — they are handed a SKU over the
 * phone and asked what state it is in, and they group a supplier's rows by eye.
 *
 * The supplier code is pulled out as its own chip even though it IS the first
 * two segments of the SKU (`WHL-00042-SAR-JAM-HND-001`). Twenty-five
 * characters of mono is not something you match a supplier against at a glance;
 * six is.
 */
import { ChevronRight, ChevronDown, ImageOff, Layers } from 'lucide-react';
import { Money, Text, formatAge } from '@/src/components/data';
import { StatusBadge } from '@/src/components/data/StatusBadge';
import { cn } from '@/src/design-system/utils/cn';
import { mediaDisplayUrl } from '@/src/utils/mediaUrl';
import { PRODUCT_STATE_LABEL, isProductState } from '../types/adminProduct';
import type { AdminProductRow } from '../types/adminProduct';
import type { Column } from '@/src/components/data/DataTable';

/** The tone each state carries. Kept here because it is presentation, not domain. */
const STATE_TONE = {
  DRAFT: 'neutral',
  PENDING: 'warning',
  APPROVED: 'info',
  PUBLIC: 'success',
  REJECTED: 'danger',
  REMOVED: 'neutral',
} as const;

interface ColumnDeps {
  categoryNames: Record<string, string>;
  expandedIds: ReadonlySet<string>;
  onToggleVariants: (id: string) => void;
}

export function buildColumns({
  categoryNames,
  expandedIds,
  onToggleVariants,
}: ColumnDeps): Column<AdminProductRow>[] {
  return [
    {
      key: 'product',
      header: 'Product · SKU · supplier',
      render: (row) => {
        const isOpen = expandedIds.has(row.id);
        const category = categoryNames[row.categoryId] ?? '';
        /*
         * The API stores `gs://bucket/path`, which no browser can load and
         * which the CSP rejects outright. This is the rewrite to the public
         * bucket host — see `mediaDisplayUrl`.
         */
        const thumbnail = mediaDisplayUrl(row.thumbnailUrl);

        return (
          <div className="flex gap-3 min-w-0">
            {thumbnail ? (
              <img
                src={thumbnail}
                alt=""
                loading="lazy"
                className="h-10 w-10 shrink-0 rounded-sm border border-rule object-cover"
              />
            ) : row.imageCount === 0 ? (
              /*
                NO IMAGE ON FILE — the publish gate, not merely a missing
                thumbnail. Saying so in the row means an operator sees the
                blocker while scanning rather than after opening the product
                and pressing Publish.
              */
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border border-dashed border-warn-border bg-warn-wash text-warn"
                title="No image on file — required before this can be published"
              >
                <ImageOff className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">No image on file</span>
              </span>
            ) : (
              /*
                A DIFFERENT THING: the product has images, but this reference
                is not one a browser can load — a `mock-gcs://` from the local
                emulator, or an empty thumbnail on a row that does have media.
                Rendering the publish warning here would be a lie, and it is
                the lie an operator would act on.
              */
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border border-rule bg-sheet-2 text-ink-4"
                title={`${row.imageCount} image${row.imageCount === 1 ? '' : 's'} on file, no preview available`}
              >
                <ImageOff className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">Preview unavailable</span>
              </span>
            )}

            <div className="min-w-0">
              <p className="truncate font-medium text-ink" title={row.name}>
                {row.name}
              </p>

              {/* The original SKU, directly under the name and in mono. */}
              <p className="truncate font-mono text-2xs text-ink-2" title={row.sku}>
                {row.sku}
              </p>

              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <span
                  className="rounded-xs border border-note-border bg-note-wash px-1.5 font-mono text-2xs font-semibold text-note"
                  title={`Supplier ${row.supplierCode || 'code unknown'}`}
                >
                  {row.supplierCode || '—'}
                </span>

                {row.variantCount > 0 ? (
                  <button
                    type="button"
                    // stopPropagation because the row itself navigates. The
                    // table's `rowHref` mode stretches a link across every
                    // cell, which is why this list uses `onRowClick` instead —
                    // see ProductListPage.
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleVariants(row.id);
                    }}
                    aria-expanded={isOpen}
                    aria-label={`${isOpen ? 'Hide' : 'Show'} the ${row.variantCount} variants of ${row.name}`}
                    className="inline-flex items-center gap-1 rounded-full border border-brass bg-brass-wash px-1.5 text-2xs font-semibold text-brass hover:bg-sheet-selected"
                  >
                    {isOpen ? (
                      <ChevronDown className="h-3 w-3" aria-hidden="true" />
                    ) : (
                      <ChevronRight className="h-3 w-3" aria-hidden="true" />
                    )}
                    {row.variantCount} variant{row.variantCount === 1 ? '' : 's'}
                  </button>
                ) : (
                  /*
                    Stated, not omitted. A blank here would be
                    indistinguishable from data that failed to load, and "does
                    this product have variants?" is a question the operator
                    came to answer.
                  */
                  <span className="rounded-full border border-mute-border bg-mute-wash px-1.5 text-2xs font-semibold text-mute">
                    No variants
                  </span>
                )}

                {category && <span className="truncate text-2xs text-ink-3">{category}</span>}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'supplierName',
      header: 'Supplier',
      hideOnMobile: true,
      render: (row) => (
        <Text variant="secondary" className="line-clamp-2">
          {row.supplierName || '—'}
        </Text>
      ),
    },
    {
      key: 'price',
      header: 'Price',
      align: 'right',
      render: (row) => {
        const margin = row.sellingPrice - row.basePrice;
        return (
          <div>
            <Money amount={row.sellingPrice} />
            {/* The margin is what an approver is judging, so it travels with
                the price rather than living in a column nobody widens to. */}
            <p className={cn('text-2xs', margin > 0 ? 'text-ok' : 'text-bad')}>
              {margin >= 0 ? '+' : '−'}
              <Money amount={Math.abs(margin)} />
            </p>
          </div>
        );
      },
    },
    {
      key: 'stock',
      header: 'Stock',
      align: 'right',
      render: (row) => (
        <div>
          <span
            className={cn(
              'text-sm font-medium',
              row.stock === 0 ? 'text-bad' : row.stock <= 10 ? 'text-warn' : 'text-ink',
            )}
          >
            {row.stock}
          </span>
          {/*
            "across 3" because one number over a multi-variant product hides
            the thing that matters: 40 in stock can be 40 of one colour and
            none of the other two.
          */}
          {row.variantCount > 0 && (
            <p className="text-2xs text-ink-3">across {row.variantCount}</p>
          )}
        </div>
      ),
    },
    {
      key: 'state',
      header: 'State',
      render: (row) => (
        <div className="flex flex-col items-start gap-1">
          {isProductState(row.state) ? (
            <StatusBadge
              status={row.state}
              tone={STATE_TONE[row.state]}
              label={PRODUCT_STATE_LABEL[row.state]}
              size="sm"
            />
          ) : (
            /* The server returns "" for a status it does not recognise rather
               than guessing. Rendering that as "Unknown" keeps it visible
               instead of silently looking like a Draft. */
            <StatusBadge status="unknown" tone="neutral" label="Unknown" size="sm" />
          )}
          <span className="text-2xs text-ink-3">
            {row.deletionRequestedAt ? (
              <span className="font-semibold text-bad">Removal requested</span>
            ) : (
              /* Age in state, not created-at: this is a queue and the question
                 is how long somebody has been waiting. */
              formatAge(row.updatedAt)
            )}
          </span>
        </div>
      ),
    },
    {
      key: 'images',
      header: 'Images',
      align: 'center',
      hideOnMobile: true,
      render: (row) => (
        <span className={cn('text-sm', row.imageCount === 0 ? 'font-semibold text-warn' : 'text-ink-2')}>
          {row.imageCount === 0 ? (
            <span className="inline-flex items-center gap-1">
              <ImageOff className="h-3.5 w-3.5" aria-hidden="true" />0
            </span>
          ) : (
            <span className="inline-flex items-center gap-1">
              <Layers className="h-3.5 w-3.5 text-ink-3" aria-hidden="true" />
              {row.imageCount}
            </span>
          )}
        </span>
      ),
    },
  ];
}
