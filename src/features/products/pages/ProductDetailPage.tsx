/**
 * Product Detail Page — full product view.
 *
 * Architecture:
 * - Reads productId from URL params
 * - Uses useProductDetail hook
 * - Uses useProductForm for edit action
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
import { Button } from '@/src/components/ui/Button';
import { StatusBadge } from '@/src/components/ui/StatusBadge';
import { Card } from '@/src/components/ui/Card';
import { useProductDetail } from '../hooks/useProductDetail';
import { useProductForm } from '../hooks/useProductForm';
import { PRODUCT_ROUTES } from '../routes';
import { formatCurrency } from '@/src/utils/formatCurrency';

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
      <span className="text-text-tertiary flex-shrink-0">{icon}</span>
      <span className="text-xs font-medium text-text-tertiary uppercase tracking-wide flex-shrink-0">
        {label}
      </span>
      <span
        className="text-sm text-text-primary truncate ml-auto text-right"
        title={String(value)}
      >
        {value}
      </span>
    </div>
  );
}

// ─── Skeleton widths (static — no impure render calls) ──────────

const skeletonWidths = ['85%', '60%', '75%', '92%', '55%', '68%'];

// ─── Skeleton ───────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in" aria-busy="true" aria-label="Loading product">
      <div className="h-8 w-48 bg-surface-muted rounded-lg animate-pulse" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="aspect-square bg-surface-muted rounded-2xl animate-pulse" />
        </div>
        <div className="lg:col-span-2 space-y-4">
          {skeletonWidths.map((w, i) => (
            <div key={i} className="h-6 bg-surface-muted rounded animate-pulse" style={{ width: w }} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Error ─────────────────────────────────────────────────────

function DetailError({ message, onRetry, onBack }: { message: string; onRetry: () => void; onBack: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center">
      <AlertTriangle className="w-14 h-14 text-semantic-danger" aria-hidden="true" />
      <h2 className="text-xl font-semibold text-text-primary">Unable to load product</h2>
      <p className="text-sm text-text-secondary max-w-sm">{message}</p>
      <div className="flex gap-3">
        <Button variant="outline" size="md" iconLeft={ArrowLeft} onClick={onBack}>
          Go Back
        </Button>
        <Button variant="secondary" size="md" iconLeft={RefreshCw} onClick={onRetry}>
          Retry
        </Button>
      </div>
    </div>
  );
}

// ─── Not Found ─────────────────────────────────────────────────

function DetailNotFound({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center">
      <div className="text-6xl" aria-hidden="true">📦</div>
      <h2 className="text-xl font-semibold text-text-primary">Product not found</h2>
      <p className="text-sm text-text-secondary max-w-sm">
        The product you're looking for doesn't exist or you may not have access.
      </p>
      <Button variant="outline" size="md" iconLeft={ArrowLeft} onClick={onBack}>
        Back to Products
      </Button>
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
  const { openEdit } = useProductForm();

  const handleBack = useCallback(() => {
    navigate(PRODUCT_ROUTES.LIST);
  }, [navigate]);

  // ── Loading ─────────────────────────────────────────
  if (isLoading) {
    return <DetailSkeleton />;
  }

  // ── Error ──────────────────────────────────────────
  if (error && !product) {
    return <DetailError message={error} onRetry={refetch} onBack={handleBack} />;
  }

  // ── Not found ──────────────────────────────────────
  if (!product) {
    return <DetailNotFound onBack={handleBack} />;
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
          <h1 className="text-2xl font-bold text-text-primary tracking-tight truncate">
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
            onClick={() => openEdit(product)}
          >
            Edit
          </Button>
        </div>
      </div>

      {/* Error banner (non-blocking) */}
      {error && (
        <div role="alert" className="flex items-center gap-2 p-3 rounded-lg bg-semantic-danger-light text-sm text-semantic-danger">
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
          <Card className="p-0 overflow-hidden">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full aspect-square object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full aspect-square flex flex-col items-center justify-center bg-surface-muted text-text-tertiary gap-2">
                <ImageIcon className="w-12 h-12" aria-hidden="true" />
                <span className="text-sm">No image</span>
              </div>
            )}
          </Card>

          {/* Badge tags */}
          <div className="flex flex-wrap gap-2">
            {product.isTrending && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200">
                <TrendingUp className="w-3 h-3" /> Trending
              </span>
            )}
            {product.isNew && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                <Sparkles className="w-3 h-3" /> New
              </span>
            )}
            {product.isFeatured && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                <Star className="w-3 h-3" /> Featured
              </span>
            )}
            {product.isSponsored && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                <Star className="w-3 h-3" /> Sponsored
              </span>
            )}
          </div>

          {/* Quick metrics */}
          <Card className="p-4 space-y-3">
            <h3 className="text-sm font-semibold text-text-primary">Quick Metrics</h3>
            <div className="space-y-2">
              <MetaRow icon={<Package className="w-3.5 h-3.5" />} label="SKU" value={product.sku} />
              <MetaRow icon={<Hash className="w-3.5 h-3.5" />} label="Qty Available" value={stockAvailable} />
              <MetaRow icon={<ShoppingCart className="w-3.5 h-3.5" />} label="Reserved" value={stockReserved} />
              <MetaRow icon={<BarChart3 className="w-3.5 h-3.5" />} label="MOQ" value={product.moq} />
              <MetaRow icon={<Clock className="w-3.5 h-3.5" />} label="Dispatch" value={product.dispatchTime} />
              <MetaRow icon={<Eye className="w-3.5 h-3.5" />} label="Visibility" value={product.visibility} />
            </div>
          </Card>

          {/* Visibility badge */}
          <Card className="p-4 flex items-center justify-between">
            <span className="text-sm font-medium text-text-primary">Visibility</span>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                product.visibility === 'Public'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-gray-100 text-gray-600 border-gray-200'
              }`}
            >
              <Eye className="w-3 h-3" />
              {product.visibility}
            </span>
          </Card>
        </div>

        {/* ── Right column: details ── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Pricing card */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-4">Pricing</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-text-tertiary uppercase tracking-wide">Base Price</p>
                <p className="text-2xl font-bold text-text-primary tabular-nums">
                  {formatCurrency(product.basePrice)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-text-tertiary uppercase tracking-wide">Selling Price</p>
                <p className="text-2xl font-bold text-text-primary tabular-nums">
                  {formatCurrency(product.sellingPrice)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-text-tertiary uppercase tracking-wide">Margin</p>
                <p className="text-2xl font-bold text-emerald-600 tabular-nums">
                  {product.margin}%
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-text-tertiary uppercase tracking-wide">Profit / Unit</p>
                <p className="text-lg font-semibold text-emerald-600 tabular-nums">
                  {formatCurrency(profit)}
                </p>
              </div>
              {product.discountPercentage != null && product.discountPercentage > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-text-tertiary uppercase tracking-wide">Discount</p>
                  <p className="text-lg font-semibold text-semantic-danger tabular-nums">
                    {product.discountPercentage}% off
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Product info card */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-4">Product Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
              <MetaRow icon={<Tag className="w-3.5 h-3.5" />} label="Category" value={product.category} />
              {product.subCategory && (
                <MetaRow icon={<Tag className="w-3.5 h-3.5" />} label="Sub-Category" value={product.subCategory} />
              )}
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
          </Card>

          {/* Sizes */}
          {product.availableSizes && product.availableSizes.length > 0 && (
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-text-primary mb-3">Available Sizes</h3>
              <div className="flex flex-wrap gap-2">
                {product.availableSizes.map((size) => (
                  <span
                    key={size}
                    className="px-3 py-1 rounded-lg bg-surface-muted text-sm font-medium text-text-primary border border-border-default"
                  >
                    {size}
                  </span>
                ))}
              </div>
            </Card>
          )}

          {/* Description */}
          {product.description && (
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-text-primary mb-3">Description</h3>
              <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-line">
                {product.description}
              </p>
            </Card>
          )}

          {/* Timeline */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-3">Timeline</h3>
            <div className="space-y-2">
              {product.createdAt && (
                <MetaRow icon={<Clock className="w-3.5 h-3.5" />} label="Created" value={formatDate(product.createdAt)} />
              )}
              {product.updatedAt && (
                <MetaRow icon={<Clock className="w-3.5 h-3.5" />} label="Last Updated" value={formatDate(product.updatedAt)} />
              )}
            </div>
          </Card>

          {/* Wholesaler info */}
          {product.wholesalerId && (
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-text-primary mb-2">Wholesaler</h3>
              <MetaRow icon={<User className="w-3.5 h-3.5" />} label="ID" value={product.wholesalerId} />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}