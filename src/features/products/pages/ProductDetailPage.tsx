/**
 * Product Detail Page — full product view.
 *
 * Architecture:
 * - Reads productId from URL params
 * - Uses useProductDetail hook
 * - Uses route navigation for edit action
 * - Zero props — fully self-contained
 * - Handles: loading, not-found, error, success states
 */
import React, { useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Pencil,
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  Star,
  Sparkles,
  Eye,
  Image as ImageIcon,
  Tag,
  Package,
  Truck,
  Hash,
  BarChart3,
  Clock,
  ShoppingCart,
  User,
} from 'lucide-react';
import { Button } from '@/src/components/controls';
import { SkeletonPage, ErrorState, EmptyState } from '@/src/components/feedback';
import { StatusBadge } from '@/src/components/data/StatusBadge';
import { useProductDetail } from '../hooks/useProductDetail';
import { PRODUCT_ROUTES } from '../routes';
import { formatDispatchDisplay } from '@/src/features/products/utils/dispatchTime';
import { Text, Money, formatDateTime } from '@/src/components/data';
import { Panel } from '@/src/components/layout/primitives';

// ─── Metadata row ───────────────────────────────────────────────

interface MetaRowProps {
  icon: React.ReactNode;
  label: string;
  value: string | number | undefined | null;
  className?: string;
}

function MetaRow({ icon, label, value, className = '' }: MetaRowProps) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className={`flex items-center gap-2 min-w-0 ${className}`}>
      <span className="text-ink-3 flex-shrink-0">{icon}</span>
      <Text variant="label" className="flex-shrink-0">
        {label}
      </Text>
      <span
        className="text-sm text-ink truncate ml-auto text-right"
        title={String(value)}
      >
        {value}
      </span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Product Detail Page
// ═══════════════════════════════════════════════════════════════

export function ProductDetailPage() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { product, isLoading, error, refetch } = useProductDetail(productId ?? null);

  const handleBack = useCallback(() => {
    navigate(PRODUCT_ROUTES.LIST);
  }, [navigate]);

  const handleEdit = useCallback(() => {
    if (!productId) return;
    navigate(PRODUCT_ROUTES.EDIT.replace(':productId', productId));
  }, [navigate, productId]);

  // ── Loading ─────────────────────────────────────────
  if (isLoading) {
    return <SkeletonPage shape="detail" />;
  }

  // ── Error ──────────────────────────────────────────
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

  // ── Not found ──────────────────────────────────────
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

  // ── Content ────────────────────────────────────────
  const profit = product.estimatedProfit
    ? product.estimatedProfit
    : product.sellingPrice - product.basePrice;
  const stockAvailable = product.availableStock ?? product.stock;
  const stockReserved = product.reservedStock ?? 0;

  return (
    <div className="space-y-8 animate-fade-in pb-8">
      {/* Top bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            iconLeft={ArrowLeft}
            onClick={handleBack}
            aria-label="Back to products"
          >
            Back
          </Button>
          <h1 className="text-2xl font-bold text-ink tracking-tight truncate">
            {product.name}
          </h1>
          <StatusBadge status={product.status} />
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" iconLeft={RefreshCw} onClick={refetch}>
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            iconLeft={Pencil}
            onClick={handleEdit}
          >
            Edit
          </Button>
        </div>
      </div>

      {/* Error banner (non-blocking) */}
      {error && (
        <div role="alert" className="flex items-center gap-2 p-3 rounded-lg bg-bad-wash text-sm text-bad">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          <span>{error}</span>
          <button onClick={refetch} className="ml-auto text-xs font-medium underline hover:no-underline">
            Retry
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left column: Image + summary ── */}
        <div className="lg:col-span-1 space-y-4">
          {/* Image */}
          <Panel className="p-0 overflow-hidden">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full aspect-square object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full aspect-square flex flex-col items-center justify-center bg-sheet-2 text-ink-3 gap-2">
                <ImageIcon className="w-12 h-12" aria-hidden="true" />
                <span className="text-sm">No image</span>
              </div>
            )}
          </Panel>

          {/* Badge tags */}
          <div className="flex flex-wrap gap-2">
            {product.isTrending && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-warn-wash text-warn border border-warn-border">
                <TrendingUp className="w-3 h-3" /> Trending
              </span>
            )}
            {product.isNew && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-note-wash text-note border border-note-border">
                <Sparkles className="w-3 h-3" /> New
              </span>
            )}
            {product.isFeatured && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-brass-wash text-brass border border-brass/20">
                <Star className="w-3 h-3" /> Featured
              </span>
            )}
            {product.isSponsored && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-warn-wash text-warn border border-warn-border">
                <Star className="w-3 h-3" /> Sponsored
              </span>
            )}
          </div>

          {/* Quick metrics */}
          <Panel className="p-4 space-y-3">
            <h3 className="text-sm font-semibold text-ink">Quick Metrics</h3>
            <div className="space-y-2">
              <MetaRow icon={<Package className="w-3.5 h-3.5" />} label="SKU" value={product.sku} />
              <MetaRow icon={<Hash className="w-3.5 h-3.5" />} label="Qty Available" value={stockAvailable} />
              <MetaRow icon={<ShoppingCart className="w-3.5 h-3.5" />} label="Reserved" value={stockReserved} />
              <MetaRow icon={<BarChart3 className="w-3.5 h-3.5" />} label="MOQ" value={product.moq} />
              <MetaRow icon={<Clock className="w-3.5 h-3.5" />} label="Dispatch" value={formatDispatchDisplay(product.dispatchTime)} />
              <MetaRow icon={<Eye className="w-3.5 h-3.5" />} label="Visibility" value={product.visibility} />
            </div>
          </Panel>

          {/* Visibility badge */}
          <Panel className="p-4 flex items-center justify-between">
            <span className="text-sm font-medium text-ink">Visibility</span>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                product.visibility === 'Public'
                  ? 'bg-ok-wash text-ok border-ok-border'
                  : 'bg-mute-wash text-mute border-mute-border'
              }`}
            >
              <Eye className="w-3 h-3" />
              {product.visibility}
            </span>
          </Panel>
        </div>

        {/* ── Right column: details ── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Pricing card */}
          <Panel className="p-5">
            <h3 className="text-sm font-semibold text-ink mb-4">Pricing</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Text as="p" variant="label">Base Price</Text>
                <Money amount={product.basePrice} decimals size="display" />
              </div>
              <div className="space-y-1">
                <Text as="p" variant="label">Selling Price</Text>
                <Money amount={product.sellingPrice} decimals size="display" />
              </div>
              <div className="space-y-1">
                <Text as="p" variant="label">Margin</Text>
                <p className="text-2xl font-bold text-ok tabular-nums">
                  {product.margin}%
                </p>
              </div>
              <div className="space-y-1">
                <Text as="p" variant="label">Profit / Unit</Text>
                <Money amount={profit} decimals className="text-lg font-semibold text-ok" />
              </div>
              {product.discountPercentage != null && product.discountPercentage > 0 && (
                <div className="space-y-1">
                  <Text as="p" variant="label">Discount</Text>
                  <p className="text-lg font-semibold text-bad tabular-nums">
                    {product.discountPercentage}% off
                  </p>
                </div>
              )}
            </div>
          </Panel>

          {/* Product info card */}
          <Panel className="p-5">
            <h3 className="text-sm font-semibold text-ink mb-4">Product Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
              <MetaRow icon={<Tag className="w-3.5 h-3.5" />} label="Category" value={product.category} />
              <MetaRow icon={<Tag className="w-3.5 h-3.5" />} label="Sub-Category" value={product.subCategory} />
              <MetaRow icon={<Tag className="w-3.5 h-3.5" />} label="Product Group" value={product.productGroup} />
              <MetaRow icon={<Tag className="w-3.5 h-3.5" />} label="Classification" value={product.classification} />
              <MetaRow icon={<Tag className="w-3.5 h-3.5" />} label="Detail" value={product.productDetail} />
              {product.brandName && (
                <MetaRow icon={<Star className="w-3.5 h-3.5" />} label="Brand" value={product.brandName} />
              )}
              {product.unitType && (
                <MetaRow icon={<Package className="w-3.5 h-3.5" />} label="Unit Type" value={product.unitType} />
              )}
              {product.material && (
                <MetaRow icon={<Package className="w-3.5 h-3.5" />} label="Material" value={product.material} />
              )}
              {product.color && (
                <MetaRow icon={<Package className="w-3.5 h-3.5" />} label="Color" value={product.color} />
              )}
              {product.weight && (
                <MetaRow icon={<Truck className="w-3.5 h-3.5" />} label="Weight" value={product.weight} />
              )}
              {product.volume && (
                <MetaRow icon={<Truck className="w-3.5 h-3.5" />} label="Volume" value={product.volume} />
              )}
            </div>
          </Panel>

          {/* Sizes */}
          {product.availableSizes && product.availableSizes.length > 0 && (
            <Panel className="p-5">
              <h3 className="text-sm font-semibold text-ink mb-3">Available Sizes</h3>
              <div className="flex flex-wrap gap-2">
                {product.availableSizes.map((size) => (
                  <span
                    key={size}
                    className="px-3 py-1 rounded-lg bg-sheet-2 text-sm font-medium text-ink border border-rule"
                  >
                    {size}
                  </span>
                ))}
              </div>
            </Panel>
          )}

          {/* Description */}
          {product.description && (
            <Panel className="p-5">
              <h3 className="text-sm font-semibold text-ink mb-3">Description</h3>
              <Text as="p" variant="secondary" className="leading-relaxed whitespace-pre-line">
                {product.description}
              </Text>
            </Panel>
          )}

          {/* Timeline */}
          <Panel className="p-5">
            <h3 className="text-sm font-semibold text-ink mb-3">Timeline</h3>
            <div className="space-y-2">
              {product.createdAt && (
                <MetaRow icon={<Clock className="w-3.5 h-3.5" />} label="Created" value={formatDateTime(product.createdAt)} />
              )}
              {product.updatedAt && (
                <MetaRow icon={<Clock className="w-3.5 h-3.5" />} label="Last Updated" value={formatDateTime(product.updatedAt)} />
              )}
            </div>
          </Panel>

          {/* Wholesaler info */}
          {product.wholesalerId && (
            <Panel className="p-5">
              <h3 className="text-sm font-semibold text-ink mb-2">Supplier</h3>
              <MetaRow icon={<User className="w-3.5 h-3.5" />} label="ID" value={product.wholesalerId} />
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}

