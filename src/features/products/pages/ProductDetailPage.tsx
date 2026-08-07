/**
 * Product Detail — where a product is judged, and where the judgement is acted on.
 *
 * WHAT THIS SCREEN COULD NOT DO BEFORE
 *
 * It had three buttons: Back, Refresh, Edit. The backend has carried the full
 * verb set since PM-5 — approve, reject, publish, take-down, and an audit trail
 * recording every one with its actor and reason — and not one of them had a
 * caller. An operator could read a product here and then had nowhere to say
 * what they thought of it.
 *
 * The page is now built around that decision: images and the reasons to accept
 * or refuse them on the left, the verdict being asked for on the right.
 */
import { useCallback, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, AlertTriangle, ImageOff } from 'lucide-react';
import { Button } from '@/src/components/controls';
import { Tabs } from '@/src/components/controls/Tabs';
import {
  SkeletonPage,
  ErrorState,
  EmptyState,
  ReasonDialog,
  useToast,
} from '@/src/components/feedback';
import { StatusBadge } from '@/src/components/data/StatusBadge';
import { Text, Money, formatAge } from '@/src/components/data';
import { Panel } from '@/src/components/layout/primitives';
import { mediaDisplayUrl } from '@/src/utils/mediaUrl';
import { useProductDetail } from '../hooks/useProductDetail';
import { MARGIN_FLOOR_PERCENT } from '../constants';
import { cn } from '@/src/design-system/utils/cn';
import {
  useApproveProduct,
  useRejectProduct,
  usePublishProduct,
  useTakeDownProduct,
} from '../queries';
import { PRODUCT_ROUTES } from '../routes';
import { formatDispatchDisplay } from '@/src/features/products/utils/dispatchTime';
import { ProductActionRail } from '../components/ProductActionRail';
import { ProductReviewChecklist, type ChecklistItem } from '../components/ProductReviewChecklist';
import { ProductAuditTab } from '../components/ProductAuditTab';
import { VariantThumb } from '../components/VariantThumb';
import {
  deriveProductState,
  PRODUCT_STATE_LABEL,
  PRODUCT_STATE_MEANING,
  type ProductVerb,
} from '../types/adminProduct';

/** The platform's minimum margin. Mirrors `COALESCE(margin, 9.50)` on the supplier row. */

const STATE_TONE = {
  DRAFT: 'neutral',
  PENDING: 'warning',
  APPROVED: 'info',
  PUBLIC: 'success',
  REJECTED: 'danger',
  REMOVED: 'neutral',
} as const;

export function ProductDetailPage() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { product, isLoading, error, refetch } = useProductDetail(productId ?? null);

  const [tab, setTab] = useState('variants');
  const [reasonFor, setReasonFor] = useState<'reject' | 'takeDown' | null>(null);
  const [busy, setBusy] = useState<ProductVerb | null>(null);

  const approve = useApproveProduct();
  const reject = useRejectProduct();
  const publish = usePublishProduct();
  const takeDown = useTakeDownProduct();

  const handleBack = useCallback(() => navigate(PRODUCT_ROUTES.LIST), [navigate]);
  const handleEdit = useCallback(() => {
    if (productId) navigate(PRODUCT_ROUTES.EDIT.replace(':productId', productId));
  }, [navigate, productId]);

  /**
   * One place where a verb is run, so every one of them reports the same way.
   *
   * The server is the authority on whether a transition is legal, and its
   * refusals carry the useful part — REASON_REQUIRED, the publish gate, a
   * self-approval. Surfacing that message rather than a generic failure is the
   * difference between an operator fixing the product and filing a bug.
   */
  const run = useCallback(
    async (verb: ProductVerb, fn: () => Promise<unknown>, done: string) => {
      setBusy(verb);
      try {
        await fn();
        toast.success(done);
        await refetch();
      } catch (e) {
        toast.error('That did not go through', (e as Error).message);
      } finally {
        setBusy(null);
      }
    },
    [toast, refetch],
  );

  /*
   * `deleted` is the third argument, and it was never passed.
   *
   * deriveProductState returns REMOVED for a taken-down product, and the detail
   * page could not reach that branch because the payload carried no such field
   * — so a product that had been taken down rendered as APPROVED or PUBLIC,
   * with an action rail offering verbs the server would refuse. VERBS_BY_STATE
   * has said `REMOVED: []` all along, waiting for a state nothing could produce.
   */
  const state = useMemo(
    () => deriveProductState(product?.status, product?.visibility, product?.deleted),
    [product?.status, product?.visibility, product?.deleted],
  );

  const checklist = useMemo<ChecklistItem[]>(() => {
    if (!product) return [];

    // `imageUrls` is now derived from `media` in the mapper and is always an
    // array, so `?? ` never fired and this reported 0 for every product ever —
    // telling operators to add a photograph to products carrying five. The
    // fallback stays for a payload that sends only a poster.
    const images = product.imageUrls?.length || (product.imageUrl ? 1 : 0);
    /*
     * The SERVER's margin, not a percentage re-derived from two prices.
     *
     * This computed ((sellingPrice - basePrice) / basePrice) * 100 in the
     * component — money derived in the browser, which scripts/guard.sh G12
     * exists to forbid, and which disagrees with the server by a rounding step
     * the moment a base price is not a round number. `marginPercent` comes from
     * the same COALESCE(w.margin, 9.50) that produced the selling price, so the
     * two cannot contradict each other.
     */
    const marginPct = product.marginPercent;
    const stock = product.availableStock ?? product.stock;
    const variations = product.variations ?? [];
    const emptyVariants = variations.filter((v) => (v.stock ?? 0) === 0).length;
    const classified = [product.category, product.subCategory, product.productGroup].filter(
      Boolean,
    ).length;

    const items: ChecklistItem[] = [
      {
        label: 'Images on file',
        value: String(images),
        tone: images === 0 ? 'bad' : 'ok',
        note:
          images === 0
            ? 'At least one is required before this can be published.'
            : 'Retailers see the first as the catalogue thumbnail.',
      },
      {
        label: 'Platform margin',
        value: `${marginPct.toFixed(1)}%`,
        tone: marginPct >= MARGIN_FLOOR_PERCENT ? 'ok' : 'warn',
        note:
          marginPct >= MARGIN_FLOOR_PERCENT
            ? `Above the ${MARGIN_FLOOR_PERCENT}% floor.`
            : `Below the ${MARGIN_FLOOR_PERCENT}% floor — check this was intended.`,
      },
      {
        label: 'Classification',
        value: `${classified} of 3`,
        tone: classified >= 3 ? 'ok' : 'warn',
        note: [product.category, product.subCategory, product.productGroup]
          .filter(Boolean)
          .join(' › '),
      },
      {
        label: 'Dispatch time',
        value: product.dispatchTime ? formatDispatchDisplay(product.dispatchTime) : 'Not set',
        tone: product.dispatchTime ? 'ok' : 'warn',
      },
    ];

    // Variant stock only matters when there are variants; on a single-SKU
    // product the parent stock line already says it.
    items.push(
      variations.length > 0
        ? {
            label: 'Variant stock',
            value: emptyVariants === 0 ? 'All stocked' : `${emptyVariants} empty`,
            tone: emptyVariants === 0 ? 'ok' : 'warn',
            note:
              emptyVariants === 0
                ? `${variations.length} sub-SKUs, all with stock.`
                : 'A variant at zero is a choice retailers cannot buy.',
          }
        : {
            label: 'Stock',
            value: String(stock),
            tone: stock === 0 ? 'warn' : 'ok',
          },
    );

    return items;
  }, [product]);

  if (isLoading) return <SkeletonPage shape="detail" />;

  if (error && !product) {
    return (
      <ErrorState
        title="This product could not be loaded"
        message={error}
        onRetry={refetch}
        action={
          <Button variant="outline" size="md" iconLeft={ArrowLeft} onClick={handleBack}>
            Go back
          </Button>
        }
      />
    );
  }

  if (!product) {
    return (
      <EmptyState
        title="Product not found"
        message="It may have been deleted, or you may not have access to it."
        action={
          <Button variant="outline" size="md" iconLeft={ArrowLeft} onClick={handleBack}>
            Back to products
          </Button>
        }
      />
    );
  }

  /*
   * Stored references are `gs://bucket/path`, which is not a scheme a browser
   * implements and which the CSP's img-src rejects outright. `mediaDisplayUrl`
   * rewrites them to the public bucket host and drops anything unloadable, so
   * `images` below is only ever things that can actually render.
   *
   * The COUNT for the publish gate comes from the checklist above, which uses
   * the raw list — a photo that exists but cannot be previewed here still
   * satisfies the server's gate, and saying otherwise would send an operator
   * to fix a problem that is not theirs.
   */
  const storedImages = product.imageUrls?.length
    ? product.imageUrls
    : product.imageUrl
      ? [product.imageUrl]
      : [];

  const images = storedImages.map(mediaDisplayUrl).filter((url): url is string => Boolean(url));
  // Through mediaDisplayUrl for the same reason the images are: a stored value
  // is a `gs://` reference, which no browser can load and the CSP blocks.
  const videoUrl = mediaDisplayUrl(product.videoUrl);
  // Product-level rows only — those are the ones with no variation. A variant
  // product's sizes belong to its variations and are shown in that tab.
  const sizeRows = (product.inventory ?? []).filter((row) => !row.variationId);
  const variations = product.variations ?? [];
  const margin = product.sellingPrice - product.basePrice;

  return (
    <div className="animate-fade-in space-y-5 pb-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <Button variant="ghost" size="sm" iconLeft={ArrowLeft} onClick={handleBack}>
            Back
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold tracking-tight text-ink">{product.name}</h1>
            <p className="truncate font-mono text-2xs text-ink-2">{product.sku}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {state ? (
                <StatusBadge
                  status={state}
                  tone={STATE_TONE[state]}
                  label={PRODUCT_STATE_LABEL[state]}
                  size="sm"
                />
              ) : (
                <StatusBadge status="unknown" tone="neutral" label="Unknown" size="sm" />
              )}
              {variations.length > 0 && (
                <span className="rounded-full border border-brass bg-brass-wash px-1.5 text-2xs font-semibold text-brass">
                  {variations.length} variant{variations.length === 1 ? '' : 's'}
                </span>
              )}
              {/*
                WHOSE PRODUCT THIS IS — the page never said.

                Every rule on this screen is about the supplier: the margin
                comes from their row, a rejection notifies them, a take-down
                affects them, and the self-approval guard compares against who
                submitted. The payload carried only a UUID, so an approver had
                to go back to the list to find out whose product they were
                about to publish. Beside the state, because that is the pair
                being judged together.
              */}
              {product.supplierName && (
                <span className="inline-flex items-baseline gap-1.5 text-2xs text-ink-2">
                  <span className="text-ink">{product.supplierName}</span>
                  {product.supplierCode && (
                    <span className="font-mono text-ink-3">{product.supplierCode}</span>
                  )}
                </span>
              )}
              <Text variant="caption">
                {[product.category, product.subCategory, product.productGroup]
                  .filter(Boolean)
                  .join(' › ')}
              </Text>
            </div>
          </div>
        </div>
        <Button variant="secondary" size="sm" iconLeft={RefreshCw} onClick={refetch}>
          Refresh
        </Button>
      </div>

      {error && (
        <div role="alert" className="flex items-center gap-2 rounded-lg bg-bad-wash p-3 text-sm text-bad">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {state === 'REJECTED' && product.rejectionReason && (
        <div className="flex gap-2.5 rounded-lg border border-bad-border bg-bad-wash p-3 text-sm">
          <span aria-hidden="true" className="text-bad">
            ✕
          </span>
          <span>
            <b className="font-semibold text-ink">This product was rejected.</b>
            <br />
            <span className="text-ink-2">“{product.rejectionReason}”</span>
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_18.5rem]">
        <div className="space-y-4">
          {/* The hero: look at the product and read the reasons in one place. */}
          <Panel className="p-4">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-[10.5rem_minmax(0,1fr)]">
              <div>
                {images.length > 0 ? (
                  <img
                    src={images[0]}
                    alt={product.name}
                    className="aspect-square w-full rounded-md border border-rule object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex aspect-square w-full flex-col items-center justify-center gap-1.5 rounded-md border border-dashed border-warn-border bg-warn-wash text-warn">
                    <ImageOff className="h-7 w-7" aria-hidden="true" />
                    <span className="text-xs font-medium">No image</span>
                  </div>
                )}
                {images.length > 1 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {images.slice(1, 6).map((src) => (
                      <img
                        key={src}
                        src={src}
                        alt=""
                        className="h-11 w-11 rounded-sm border border-rule object-cover"
                        loading="lazy"
                      />
                    ))}
                  </div>
                )}

                {/*
                  THE VIDEO, WHICH NOBODY COULD WATCH BEFORE APPROVING IT.

                  Step 4 of the wizard has a video slot, the server stores the
                  URL and sends it as `videoUrl`, and this page rendered images
                  only. So a clip went out to retailers having passed a review
                  in which it was never played. `controls` and no autoplay: an
                  approver decides when to watch it.
                */}
                {videoUrl && (
                  <video
                    src={videoUrl}
                    controls
                    preload="metadata"
                    className="mt-2 w-full rounded-md border border-rule"
                  />
                )}
              </div>

              <ProductReviewChecklist items={checklist} />
            </div>
          </Panel>

          <Tabs
            items={[
              {
                id: 'variants',
                label: 'Variants',
                // Only when there are some: a "0" pill on every single-SKU
                // product is noise on the majority of the catalogue.
                count: variations.length || undefined,
              },
              { id: 'spec', label: 'Specification' },
              { id: 'audit', label: 'Audit trail' },
            ]}
            value={tab}
            onChange={setTab}
          />

          <Panel className="p-4">
            {tab === 'variants' &&
              (variations.length === 0 ? (
                <EmptyState
                  title="No variants"
                  message="This product is a single SKU. Colour and size options would appear here."
                />
              ) : (
                <ul className="divide-y divide-rule-subtle">
                  {variations.map((v, i) => {
                    const stock = v.stock ?? 0;
                    return (
                      <li
                        key={v.id ?? v.subSku ?? i}
                        className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2"
                      >
                        {/* The variant's own photograph, or the product's
                            marked as borrowed — see VariantThumb. */}
                        <VariantThumb variant={v} fallback={storedImages[0]} size="md" />

                        <span className="min-w-0 flex-1 basis-48">
                          <span className="block truncate text-sm text-ink">
                            {[v.color, v.design].filter(Boolean).join(' · ') || v.subName || '—'}
                          </span>
                          <span className="block truncate font-mono text-2xs text-ink-2">
                            {v.subSku || 'no sub-SKU'}
                          </span>
                        </span>
                        <span className="flex items-baseline gap-1.5">
                          <Text variant="label">Stock</Text>
                          <span
                            className={
                              stock === 0
                                ? 'text-sm font-semibold text-bad'
                                : stock <= 10
                                  ? 'text-sm font-semibold text-warn'
                                  : 'text-sm font-semibold text-ink'
                            }
                          >
                            {stock}
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
                      </li>
                    );
                  })}
                </ul>
              ))}

            {tab === 'spec' && (
              <div className="space-y-5">
              {/*
                THE DESCRIPTION — the thing a retailer actually reads.

                Step 1 collects it and ClassificationTemplates auto-fills it
                from the catalogue leaf, so operators have been writing these
                since the wizard shipped. It is rendered here for the first
                time. If it is empty, say so plainly rather than omitting the
                row: on a review screen, "no description" is itself a finding.
              */}
              <div>
                <Text as="p" variant="label">Description</Text>
                {product.description ? (
                  <p className="mt-1 whitespace-pre-wrap text-sm text-ink">{product.description}</p>
                ) : (
                  <p className="mt-1 text-sm text-ink-3">
                    No description. Retailers see nothing about this product beyond its name.
                  </p>
                )}
              </div>

              {/*
                PER-SIZE STOCK for a product with no variants.

                The rows below the totals. A product can hold 200 units and be
                empty in M and L — the sizes people buy — and every figure on
                this page other than these would still read healthy. The list
                has a `lowStock` filter for exactly this question; until now the
                detail page could not answer it.

                Variant products get this from the Variants tab, which already
                breaks down by variation.
              */}
              {sizeRows.length > 0 && (
                <div>
                  <Text as="p" variant="label">Stock by size</Text>
                  {/* responsive-table-reviewed: four short numeric columns —
                      a size label and three counts — which fit inside 375px
                      without scrolling. Card-stacking would turn a five-size
                      product into twenty labelled lines to answer a question
                      ("which size is empty") that the eye answers instantly
                      down a column. It scrolls if a size label is unusually
                      long. */}
                  <div className="mt-1 overflow-x-auto rounded-md border border-rule">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="bg-sheet-2">
                          <th className="px-3 py-1.5 text-left"><Text variant="label">Size</Text></th>
                          <th className="px-3 py-1.5 text-right"><Text variant="label">Stock</Text></th>
                          <th className="px-3 py-1.5 text-right"><Text variant="label">MOQ</Text></th>
                          <th className="px-3 py-1.5 text-right"><Text variant="label">Alert at</Text></th>
                        </tr>
                      </thead>
                      <tbody>
                        {sizeRows.map((row) => {
                          const qty = row.stock ?? 0;
                          const alert = row.lowStockAlert ?? 0;
                          return (
                            <tr key={row.size} className="border-t border-rule-subtle">
                              <td className="px-3 py-1.5 text-ink">{row.size}</td>
                              <td
                                className={cn(
                                  'px-3 py-1.5 text-right font-semibold tabular-nums',
                                  qty === 0 ? 'text-bad' : alert > 0 && qty <= alert ? 'text-warn' : 'text-ink',
                                )}
                              >
                                {qty}
                              </td>
                              <td className="px-3 py-1.5 text-right tabular-nums text-ink-2">{row.moq ?? 1}</td>
                              <td className="px-3 py-1.5 text-right tabular-nums text-ink-2">{alert}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <dl className="grid grid-cols-[max-content_minmax(0,1fr)] items-baseline gap-x-6 gap-y-2.5">
                <dt className="text-xs text-ink-3">Original SKU</dt>
                <dd className="m-0 font-mono text-sm text-ink">{product.sku}</dd>
                <dt className="text-xs text-ink-3">Base price</dt>
                <dd className="m-0 text-sm text-ink">
                  <Money amount={product.basePrice} decimals />
                </dd>
                <dt className="text-xs text-ink-3">Selling price</dt>
                <dd className="m-0 text-base font-semibold text-ink">
                  <Money amount={product.sellingPrice} decimals />
                </dd>
                <dt className="text-xs text-ink-3">Platform margin</dt>
                <dd className={margin >= 0 ? 'm-0 text-sm text-ok' : 'm-0 text-sm text-bad'}>
                  <Money amount={margin} decimals />
                </dd>
                <dt className="text-xs text-ink-3">Available stock</dt>
                <dd className="m-0 text-sm text-ink">{product.availableStock ?? product.stock}</dd>
                <dt className="text-xs text-ink-3">Reserved</dt>
                <dd className="m-0 text-sm text-ink">{product.reservedStock ?? 0}</dd>
                <dt className="text-xs text-ink-3">MOQ</dt>
                <dd className="m-0 text-sm text-ink">{product.moq}</dd>
                <dt className="text-xs text-ink-3">Unit type</dt>
                <dd className="m-0 text-sm text-ink">{product.unitType || '—'}</dd>
                <dt className="text-xs text-ink-3">Brand</dt>
                <dd className="m-0 text-sm text-ink">{product.brandName || '—'}</dd>
                <dt className="text-xs text-ink-3">Dispatch</dt>
                <dd className="m-0 text-sm text-ink">
                  {product.dispatchTime ? formatDispatchDisplay(product.dispatchTime) : '—'}
                </dd>
                <dt className="text-xs text-ink-3">Visibility</dt>
                <dd className="m-0 text-sm text-ink">{product.visibility}</dd>
                <dt className="text-xs text-ink-3">Last updated</dt>
                <dd className="m-0 text-sm text-ink">
                  {product.updatedAt ? `${formatAge(product.updatedAt)} ago` : '—'}
                </dd>

                {/*
                  THE SPECIFICATION, IN A TAB CALLED SPECIFICATION.

                  Everything below arrives from the server, is validated by the
                  response schema, is produced by the mapper — and was rendered
                  nowhere. The page showed 21 of the 39 fields it holds, and the
                  omissions were the ones an approver judges on: what the thing
                  is made of, what sizes it comes in, what it weighs, and the
                  bottom two levels of the catalogue placement.

                  This is the approval gate. Approving publishes to retailers,
                  so an approver who cannot see the material is certifying a
                  claim they have not read.
                */}
                <dt className="text-xs text-ink-3">Material</dt>
                <dd className="m-0 text-sm text-ink">{product.material || '—'}</dd>
                <dt className="text-xs text-ink-3">Sizes</dt>
                <dd className="m-0 text-sm text-ink">
                  {product.availableSizes?.length ? product.availableSizes.join(', ') : '—'}
                </dd>
                <dt className="text-xs text-ink-3">Weight</dt>
                <dd className="m-0 text-sm text-ink">
                  {product.weight ? `${product.weight} gm` : '—'}
                </dd>
                <dt className="text-xs text-ink-3">Volume</dt>
                <dd className="m-0 text-sm text-ink">
                  {product.volume ? `${product.volume} c.ft` : '—'}
                </dd>

                {/* Levels 4 and 5 of the hierarchy. Levels 1-3 are in the
                    header; without these the placement cannot be checked. */}
                <dt className="text-xs text-ink-3">Classification</dt>
                <dd className="m-0 text-sm text-ink">{product.classification || '—'}</dd>
                <dt className="text-xs text-ink-3">Product detail</dt>
                <dd className="m-0 text-sm text-ink">{product.productDetail || '—'}</dd>

                <dt className="text-xs text-ink-3">Tags</dt>
                <dd className="m-0 text-sm text-ink">
                  {product.trendTags?.length ? product.trendTags.join(', ') : '—'}
                </dd>
                <dt className="text-xs text-ink-3">Created</dt>
                <dd className="m-0 text-sm text-ink">
                  {product.createdAt ? `${formatAge(product.createdAt)} ago` : '—'}
                </dd>
              </dl>
              </div>
            )}

            {tab === 'audit' && productId && <ProductAuditTab productId={productId} />}
          </Panel>
        </div>

        <ProductActionRail
          state={state}
          /*
            The STORED count, not the displayable one.
            The server's publish gate counts rows in products.product_media; a
            photo that exists but cannot be previewed in this browser still
            satisfies it. Passing `images.length` would disable Publish with
            "needs at least one image" over a product that has five.
          */
          imageCount={storedImages.length}
          context={state ? PRODUCT_STATE_MEANING[state] : undefined}
          busy={busy}
          onEdit={handleEdit}
          onApprove={() =>
            void run('approve', () => approve.mutateAsync({ id: product.id }), 'Product approved.')
          }
          onPublish={() =>
            void run(
              'publish',
              () => publish.mutateAsync({ id: product.id }),
              'Product published — retailers can see it now.',
            )
          }
          onReject={() => setReasonFor('reject')}
          onTakeDown={() => setReasonFor('takeDown')}
        />
      </div>

      <ReasonDialog
        open={reasonFor !== null}
        onClose={() => setReasonFor(null)}
        title={reasonFor === 'takeDown' ? 'Take this product down?' : 'Reject this product?'}
        message={
          reasonFor === 'takeDown'
            ? 'It stops being visible to retailers immediately. The supplier sees this reason, and it is recorded in the audit trail against your name.'
            : 'The supplier sees this reason and can correct the product and resubmit. It is recorded in the audit trail against your name.'
        }
        confirmLabel={reasonFor === 'takeDown' ? 'Take down' : 'Reject'}
        loading={busy !== null}
        onConfirm={async (reason) => {
          const verb = reasonFor;
          setReasonFor(null);
          if (verb === 'takeDown') {
            await run(
              'takeDown',
              () => takeDown.mutateAsync({ id: product.id, reason }),
              'Product taken down.',
            );
          } else {
            await run(
              'reject',
              () => reject.mutateAsync({ id: product.id, reason }),
              'Product rejected — the supplier has been told why.',
            );
          }
        }}
      />
    </div>
  );
}
