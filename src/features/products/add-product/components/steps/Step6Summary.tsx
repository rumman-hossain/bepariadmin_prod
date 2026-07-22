import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Package,
  FileText,
  DollarSign,
  Image as ImageIcon,
  Shield,
  AlertCircle,
} from 'lucide-react';
import { Card } from '@/src/components/ui/Card';
import { cn } from '@/src/design-system/utils/cn';
import { formatCurrency } from '@/src/utils/formatCurrency';
import { listWholesalers } from '@/src/features/wholesalers/api/wholesalerApi';
import { useAddProductStore } from '../../store/useAddProductStore';
import type { ProductVariation, ProductMediaState } from '../../../types/registration';

interface Props {
  sellPrice: number;
  platformMargin: number;
}

import { formatDispatchDisplay } from '@/src/features/products/utils/dispatchTime';

function formatMoney(value: string | number): string {
  const n = typeof value === 'number' ? value : Number(value || 0);
  if (!n) return '—';
  return formatCurrency(n);
}

function SummaryStat({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'success' | 'warning';
}) {
  return (
    <div
      className={cn(
        'rounded-xl border px-3 py-2.5 min-w-0',
        tone === 'success' && 'bg-emerald-50 border-emerald-200',
        tone === 'warning' && 'bg-amber-50 border-amber-200',
        tone === 'default' && 'bg-surface-muted border-border-subtle',
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-text-tertiary truncate">{label}</p>
      <p className="text-sm font-bold text-text-primary truncate mt-0.5">{value}</p>
    </div>
  );
}

function SectionStatus({
  title,
  subtitle,
  icon: Icon,
  tone = 'default',
}: {
  title: string;
  subtitle: string;
  icon: React.ElementType;
  tone?: 'default' | 'success' | 'warning';
}) {
  return (
    <div
      className={cn(
        'rounded-xl border p-3 min-w-0',
        tone === 'success' && 'bg-emerald-50/80 border-emerald-200',
        tone === 'warning' && 'bg-amber-50/80 border-amber-200',
        tone === 'default' && 'bg-surface-muted/60 border-border-subtle',
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        <div className="w-7 h-7 rounded-full bg-white/80 flex items-center justify-center shrink-0">
          <Icon className="w-3.5 h-3.5 text-accent-primary" />
        </div>
        <p className="text-xs font-semibold text-text-primary truncate">{title}</p>
      </div>
      <p className="text-[11px] text-text-secondary leading-snug line-clamp-2">{subtitle}</p>
    </div>
  );
}

function DataRow({ label, value }: { label: string; value: React.ReactNode }) {
  const empty = value === undefined || value === null || value === '';
  return (
    <div className="py-2.5 border-b border-border-subtle last:border-0">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary mb-1">{label}</p>
      <div className="text-sm text-text-primary">{empty ? '—' : value}</div>
    </div>
  );
}

function SummarySection({
  step,
  title,
  icon: Icon,
  children,
  defaultOpen = true,
}: {
  step: number;
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-surface-muted/50 transition-colors text-left"
      >
        <div className="w-8 h-8 rounded-lg bg-accent-primary-light flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-accent-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-text-tertiary font-medium">Step {step}</p>
          <p className="text-sm font-semibold text-text-primary">{title}</p>
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-text-tertiary shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-text-tertiary shrink-0" />
        )}
      </button>
      {open && <div className="px-4 pb-4 pt-0 border-t border-border-subtle">{children}</div>}
    </Card>
  );
}

function SizeGrid({
  sizes,
  stockMap,
  moqMap,
  alertMap,
}: {
  sizes: string[];
  stockMap: Record<string, string>;
  moqMap: Record<string, string>;
  alertMap: Record<string, string>;
}) {
  if (sizes.length === 0) return null;
  return (
    <div className="mt-1 overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-text-tertiary uppercase">
            <th className="text-left py-1 pr-2 font-semibold">Size</th>
            <th className="text-left py-1 px-2 font-semibold">Stock</th>
            <th className="text-left py-1 px-2 font-semibold">MOQ</th>
            <th className="text-left py-1 pl-2 font-semibold">Alert</th>
          </tr>
        </thead>
        <tbody>
          {sizes.map((size) => (
            <tr key={size} className="border-t border-border-subtle">
              <td className="py-1.5 pr-2 font-semibold text-text-primary">{size}</td>
              <td className="py-1.5 px-2 text-text-secondary">{stockMap[size] ?? '0'}</td>
              <td className="py-1.5 px-2 text-text-secondary">{moqMap[size] ?? '1'}</td>
              <td className="py-1.5 pl-2 text-text-secondary">{alertMap[size] ?? '0'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function countProductMedia(productMedia: ProductMediaState, variations: ProductVariation[]) {
  const mainCount = [
    productMedia.front.localUri || productMedia.front.uploadedUrl,
    productMedia.back.localUri || productMedia.back.uploadedUrl,
    productMedia.left.localUri || productMedia.left.uploadedUrl,
    productMedia.right.localUri || productMedia.right.uploadedUrl,
    productMedia.poster.localUri || productMedia.poster.uploadedUrl,
  ].filter(Boolean).length;

  const extraCount = productMedia.more.filter((m) => m.localUri || m.uploadedUrl).length;

  const variationImagesCount = variations.reduce((acc, v) => {
    const media = v.media as ProductMediaState | undefined;
    if (!media) return acc;
    const vMain = [media.front, media.back].filter((s) => s?.localUri || s?.uploadedUrl).length;
    const vExtra = media.more?.filter((m) => m.localUri || m.uploadedUrl).length ?? 0;
    return acc + vMain + vExtra;
  }, 0);

  const hasVideo =
    !!(productMedia.video.localUri || productMedia.video.uploadedUrl) ||
    variations.some((v) => {
      const media = v.media as ProductMediaState | undefined;
      return !!(media?.video?.localUri || media?.video?.uploadedUrl);
    });

  const pendingCount =
    [productMedia.front, productMedia.back, productMedia.poster, productMedia.left, productMedia.right, productMedia.video, ...productMedia.more].filter(
      (s) => s.uploadStatus === 'uploading',
    ).length +
    variations.reduce((acc, v) => {
      const media = v.media as ProductMediaState | undefined;
      if (!media) return acc;
      return acc + [media.front, media.back, media.video, ...(media.more ?? [])].filter((s) => s?.uploadStatus === 'uploading').length;
    }, 0);

  return { mainCount, extraCount, variationImagesCount, totalImageCount: mainCount + extraCount + variationImagesCount, hasVideo, pendingCount };
}

function PolicyBlock({
  title,
  firstLabel,
  firstValue,
  secondLabel,
  secondValue,
}: {
  title: string;
  firstLabel: string;
  firstValue: string;
  secondLabel: string;
  secondValue: string;
}) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface-muted/40 p-3 space-y-1">
      <p className="text-sm font-semibold text-text-primary mb-2">{title}</p>
      <DataRow label={firstLabel} value={firstValue} />
      <DataRow label={secondLabel} value={secondValue} />
    </div>
  );
}

export function Step6Summary({ sellPrice, platformMargin }: Props) {
  const s = useAddProductStore();
  const [wholesalerLabel, setWholesalerLabel] = useState('');

  useEffect(() => {
    if (!s.wholesalerId) return;
    void listWholesalers({ search: '', category: 'All', location: 'All', recentlyAdded: false }).then((data) => {
      const match = data.find((w) => w.id === s.wholesalerId);
      if (match) setWholesalerLabel(match.companyName || match.id);
    });
  }, [s.wholesalerId]);

  const marginValue = parseFloat(s.margin) || platformMargin;
  const basePriceValue = parseFloat(s.basePrice) || 0;
  const calculateRetail = (base: number) => (base > 0 ? base + (base * marginValue) / 100 : 0);

  const variantBasePrices = s.variations.map((v) => Number(v.price) || basePriceValue).filter((p) => p > 0);
  const hasVariablePricing = s.hasVariant === true && variantBasePrices.length > 0;
  const minBase = variantBasePrices.length > 0 ? Math.min(...variantBasePrices) : basePriceValue;
  const maxBase = variantBasePrices.length > 0 ? Math.max(...variantBasePrices) : basePriceValue;
  const minRetail = calculateRetail(minBase);
  const maxRetail = calculateRetail(maxBase);

  const basePriceLabel = hasVariablePricing
    ? minBase === maxBase
      ? formatMoney(minBase)
      : `${formatMoney(minBase)} – ${formatMoney(maxBase)}`
    : formatMoney(basePriceValue);

  const retailPriceLabel = hasVariablePricing
    ? minRetail === maxRetail
      ? formatMoney(minRetail)
      : `${formatMoney(minRetail)} – ${formatMoney(maxRetail)}`
    : formatMoney(sellPrice);

  const mediaStats = useMemo(() => countProductMedia(s.productMedia, s.variations), [s.productMedia, s.variations]);

  const enabledPoliciesCount = [s.warrantyEnabled, s.returnPolicyEnabled, s.exchangeEnabled].filter(Boolean).length;

  const productDetailName = useMemo(() => {
    if (!s.productDetailId || !Array.isArray(s.classificationDetails)) return '';
    const match = (s.classificationDetails as Array<{ id?: string; name?: string }>).find(
      (d) => d.id === s.productDetailId,
    );
    return match?.name ?? '';
  }, [s.productDetailId, s.classificationDetails]);

  const summarySections = [
    {
      title: 'Basic Info',
      subtitle: `${s.name || 'Unnamed'} · ${s.category || 'No category'}`,
      icon: Package,
      tone: s.name && s.category && s.productGroup ? ('success' as const) : ('warning' as const),
    },
    {
      title: 'Details',
      subtitle: `${s.material ? 'Material set' : 'No material'} · ${s.tags.length} tags`,
      icon: FileText,
      tone: s.material || s.weight ? ('success' as const) : ('default' as const),
    },
    {
      title: 'Pricing',
      subtitle: `${basePriceLabel} base · ${retailPriceLabel} retail`,
      icon: DollarSign,
      tone: basePriceValue > 0 ? ('success' as const) : ('warning' as const),
    },
    {
      title: 'Media',
      subtitle: mediaStats.pendingCount
        ? `${mediaStats.pendingCount} still uploading`
        : `${mediaStats.totalImageCount} images${mediaStats.hasVideo ? ' + video' : ''}`,
      icon: ImageIcon,
      tone: mediaStats.pendingCount ? ('warning' as const) : mediaStats.totalImageCount > 0 ? ('success' as const) : ('default' as const),
    },
    {
      title: 'Policies',
      subtitle: enabledPoliciesCount > 0 ? `${enabledPoliciesCount} enabled` : 'None enabled',
      icon: Shield,
      tone: enabledPoliciesCount > 0 ? ('success' as const) : ('default' as const),
    },
  ];

  return (
    <div className="space-y-4 pb-2">
      <Card className="p-4 bg-gradient-to-br from-accent-primary-light/40 to-surface-primary">
        <div className="flex gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0">
            <ClipboardCheck className="w-5 h-5 text-accent-primary" />
          </div>
          <div>
            <h3 className="text-base font-bold text-text-primary">Final Submission Review</h3>
            <p className="text-sm text-text-secondary mt-0.5">
              Review all 5 steps before registering this product.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {summarySections.map((section) => (
            <SectionStatus key={section.title} {...section} />
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-2">
        <SummaryStat label={hasVariablePricing ? 'Base Range' : 'Base Price'} value={basePriceLabel} />
        <SummaryStat label={hasVariablePricing ? 'Retail Range' : 'Retail Price'} value={retailPriceLabel} tone="success" />
        <SummaryStat label="Margin" value={`${marginValue}%`} />
      </div>

      <SummarySection step={1} title="Basic Information" icon={Package}>
        <DataRow label="Product Name" value={s.name} />
        <DataRow label="Wholesaler" value={wholesalerLabel || s.wholesalerId} />
        <DataRow label="Brand" value={s.brandName} />
        <DataRow label="Unit Type" value={s.unitType} />
        <DataRow label="Category" value={s.category} />
        <DataRow label="Sub-Category" value={s.subCategory} />
        <DataRow label="Product Group" value={s.productGroup} />
        <DataRow label="Classification" value={s.productClassification} />
        {productDetailName && <DataRow label="Classification Detail" value={productDetailName} />}
        <DataRow label="Description" value={s.description} />
        <DataRow label="Listing SKU" value={s.sku} />
      </SummarySection>

      <SummarySection step={2} title="Product Details" icon={FileText}>
        <DataRow label="Material" value={s.material} />
        <DataRow label="Weight" value={s.weight ? `${s.weight} gm` : ''} />
        <DataRow label="Volume" value={s.volume ? `${s.volume} c.ft` : ''} />
        <DataRow label="Colors" value={s.colors} />
        <DataRow
          label="Available Sizes"
          value={s.selectedSizes.length > 0 ? s.selectedSizes.join(', ') : ''}
        />
        <DataRow label="Tags" value={s.tags.length > 0 ? s.tags.join(', ') : ''} />
      </SummarySection>

      <SummarySection step={3} title="Pricing & Inventory" icon={DollarSign}>
        <div className="grid grid-cols-3 gap-2 py-3">
          <SummaryStat label="Base" value={basePriceLabel} />
          <SummaryStat label="Retail" value={retailPriceLabel} tone="success" />
          <SummaryStat label="Margin" value={`${marginValue}%`} />
        </div>
        <DataRow label="Has Variants" value={s.hasVariant == null ? '—' : s.hasVariant ? 'Yes' : 'No'} />
        <DataRow label="Dispatch Time" value={formatDispatchDisplay(s.dispatchTime)} />

        {hasVariablePricing ? (
          <DataRow
            label="Variations"
            value={
              <div className="space-y-3 mt-1">
                {s.variations.map((v, idx) => (
                  <div key={v.id ?? idx} className="rounded-lg border border-border-subtle p-3 bg-surface-muted/30">
                    <div className="flex justify-between gap-3">
                      <div>
                        <p className="font-semibold text-sm">{v.displayLabel || v.subName}</p>
                        <p className="text-xs text-text-tertiary">{v.subSku || 'No SKU'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-emerald-600">
                          {formatMoney(calculateRetail(Number(v.price) || basePriceValue))}
                        </p>
                        <p className="text-xs text-text-tertiary">Base: {formatMoney(Number(v.price) || basePriceValue)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            }
          />
        ) : s.selectedSizes.length > 0 ? (
          <DataRow
            label="Inventory by Size"
            value={
              <SizeGrid
                sizes={s.selectedSizes}
                stockMap={s.sizeStockSet}
                moqMap={s.moqSet}
                alertMap={s.sizeLowStockAlertSet}
              />
            }
          />
        ) : (
          <>
            <DataRow label="Stock" value={s.stock} />
            <DataRow label="MOQ" value={s.moq} />
            <DataRow label="Low Stock Alert" value={s.lowStockAlert} />
          </>
        )}
      </SummarySection>

      <SummarySection step={4} title="Media" icon={ImageIcon}>
        <DataRow label="Main Product Images" value={`${mediaStats.mainCount} uploaded`} />
        <DataRow label="Extra Images" value={`${mediaStats.extraCount} uploaded`} />
        {s.hasVariant && (
          <DataRow
            label="Variation Images"
            value={`${mediaStats.variationImagesCount} across ${s.variations.length} variant(s)`}
          />
        )}
        <DataRow label="Total Images" value={String(mediaStats.totalImageCount)} />
        <DataRow label="Video" value={mediaStats.hasVideo ? 'Included' : 'Not added'} />
        {mediaStats.pendingCount > 0 && (
          <div className="flex items-start gap-2 mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{mediaStats.pendingCount} file(s) still uploading — wait before submitting.</span>
          </div>
        )}
      </SummarySection>

      <SummarySection step={5} title="Policies" icon={Shield} defaultOpen={enabledPoliciesCount > 0}>
        {enabledPoliciesCount === 0 ? (
          <p className="text-sm text-text-secondary py-2">
            No warranty, return, or exchange policy enabled for this product.
          </p>
        ) : (
          <div className="space-y-3 pt-2">
            {s.warrantyEnabled && (
              <PolicyBlock
                title="Warranty"
                firstLabel="Duration"
                firstValue={s.warrantyDuration}
                secondLabel="Terms"
                secondValue={s.warrantyDescription}
              />
            )}
            {s.returnPolicyEnabled && (
              <PolicyBlock
                title="Return Policy"
                firstLabel="Window"
                firstValue={s.returnWindow}
                secondLabel="Condition"
                secondValue={s.returnCondition}
              />
            )}
            {s.exchangeEnabled && (
              <PolicyBlock
                title="Exchange Policy"
                firstLabel="Window"
                firstValue={s.exchangeWindow}
                secondLabel="Terms"
                secondValue={s.exchangeDescription}
              />
            )}
          </div>
        )}
      </SummarySection>
    </div>
  );
}
