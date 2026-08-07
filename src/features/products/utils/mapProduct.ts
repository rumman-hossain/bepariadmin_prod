/**
 * Maps backend product list responses to admin UI Product shape.
 */
import type { Product } from '../types';
import {
  BACKEND_STATUS_TO_DISPLAY,
  BACKEND_VISIBILITY_TO_DISPLAY,
  DISPLAY_STATUS_TO_BACKEND,
  DISPLAY_VISIBILITY_TO_BACKEND,
} from '../constants';
import type { CatalogLabelMaps } from './resolveCatalogLabels';
import { EMPTY_CATALOG_LABELS } from './resolveCatalogLabels';

/** Raw product shape from GET /api/v1/products */
export interface BackendProduct {
  id: string | number;
  wholesalerId: string;
  name: string;
  brandName?: string;
  unitType?: string;
  sku: string;
  categoryId?: string;
  subCategoryId?: string;
  productGroupId?: string;
  classificationId?: string;
  productDetailId?: string;
  material?: string;
  weight?: number;
  volume?: number;
  availableSizes?: string[];
  basePrice: number;
  platformPrice?: number;
  stock?: number;
  availableStock?: number;
  reservedStock?: number;
  moq?: number;
  dispatchTime?: string;
  visibility?: string;
  status?: string;
  imageUrl?: string;
  imageUrls?: string[];
  videoUrl?: string;
  variations?: unknown[];
  createdAt?: string;
  updatedAt?: string;
  isFeatured?: boolean;
  productTags?: string[];
  description?: string;
  media?: Array<{ url?: string; position?: number; mediaType?: string }>;
  inventory?: Array<{ size: string; stock: number; moq: number; lowStockAlert: number }>;
  deleted?: boolean;
  marginPercent?: number;
  hasVariant?: boolean;
  sizeType?: string;
  [key: string]: unknown;
}

export interface BackendListResponse {
  data: BackendProduct[];
  meta: {
    total: number;
    page?: number;
    limit?: number;
  };
}

/** Unwrap `{ data: product }` or bare product from GET /products/:id */
export function extractBackendProduct(raw: unknown): BackendProduct | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const obj = raw as Record<string, unknown>;
  if (obj.data && typeof obj.data === 'object' && obj.data !== null && !Array.isArray(obj.data)) {
    return obj.data as BackendProduct;
  }
  if ('id' in obj && ('name' in obj || 'sku' in obj)) {
    return obj as BackendProduct;
  }
  return null;
}

function lookupLabel(map: Record<string, string>, id?: string): string {
  if (!id) return '';
  return map[id] ?? '';
}

export interface NormalizedListResponse {
  products: Product[];
  total: number;
  page: number;
  limit: number;
}

export function isBackendListResponse(raw: unknown): raw is BackendListResponse {
  if (typeof raw !== 'object' || raw === null) return false;
  const o = raw as BackendListResponse;
  return Array.isArray(o.data) && typeof o.meta === 'object' && o.meta !== null;
}

export function mapDisplayStatusToBackend(display: string): string | undefined {
  if (!display || display === 'All') return undefined;
  return DISPLAY_STATUS_TO_BACKEND[display] ?? display.toLowerCase().replace(/\s+/g, '_');
}

export function mapDisplayVisibilityToBackend(display: string): string | undefined {
  if (!display || display === 'All') return undefined;
  return DISPLAY_VISIBILITY_TO_BACKEND[display] ?? display.toLowerCase();
}

export function mapListQueryParams(params?: {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  status?: string;
  wholesalerId?: string;
  visibility?: string;
}): URLSearchParams {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.search) searchParams.set('search', params.search);
  if (params?.category && params.category !== 'All') {
    searchParams.set('category', params.category);
  }
  // `wholesalerId` was declared in the params type above but never written to
  // the query string, which is why the wholesaler filter silently degraded to
  // client-side filtering over a server-paginated page.
  if (params?.wholesalerId && params.wholesalerId !== 'All') {
    searchParams.set('wholesaler_id', params.wholesalerId);
  }
  const backendStatus = mapDisplayStatusToBackend(params?.status ?? '');
  if (backendStatus) searchParams.set('status', backendStatus);
  const backendVisibility = mapDisplayVisibilityToBackend(params?.visibility ?? '');
  if (backendVisibility) searchParams.set('visibility', backendVisibility);
  return searchParams;
}

function computeMargin(basePrice: number, platformPrice: number): number {
  if (basePrice <= 0) return 0;
  return Math.round(((platformPrice - basePrice) / basePrice) * 10000) / 100;
}

function mapStatus(status?: string): Product['status'] {
  if (!status) return 'Approved';
  const display = BACKEND_STATUS_TO_DISPLAY[status.toLowerCase()];
  if (display) return display as Product['status'];
  return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ') as Product['status'];
}

function mapVisibility(visibility?: string): Product['visibility'] {
  if (!visibility) return 'Public';
  const display = BACKEND_VISIBILITY_TO_DISPLAY[visibility.toLowerCase()];
  if (display === 'Private') return 'Private';
  return 'Public';
}

function formatTimestamp(value?: string): string | undefined {
  if (!value) return undefined;
  return value;
}

export function normalizeBackendProduct(
  raw: BackendProduct,
  labels: CatalogLabelMaps = EMPTY_CATALOG_LABELS,
): Product {
  const id = String(raw.id);
  const basePrice = Number(raw.basePrice) || 0;
  const platformPrice = Number(raw.platformPrice ?? raw.basePrice) || basePrice;
  const categoryId = raw.categoryId ?? '';
  /*
   * EVERY image, in catalogue order — not just the poster.
   *
   * `imageUrls` used to be `raw.imageUrls ?? []`, and the backend does not send
   * an `imageUrls` field at all: `GET /products/:id` returns `media`, an array
   * of {url, mediaType, position}. So `imageUrls` was ALWAYS `[]`, with two
   * visible consequences on the detail page:
   *
   *   - the checklist read `imageUrls?.length ?? (imageUrl ? 1 : 0)`, and `0`
   *     is not nullish, so the fallback never ran. "Images on file" reported 0
   *     for every product ever, and told the operator "at least one is required
   *     before this can be published" about products carrying five;
   *   - the gallery fell back to `[imageUrl]`, so a product with five
   *     photographs showed one.
   *
   * Derived here rather than patched at either call site, because both symptoms
   * are the same missing mapping and a fix at one would have left the other.
   */
  const mediaItems = Array.isArray(raw.media) ? raw.media : [];
  const imageUrls =
    raw.imageUrls?.length
      ? raw.imageUrls
      : mediaItems
          // A video carries a URL too, and counting it toward the image gate
          // would let a product publish on a clip alone. Absent mediaType is
          // treated as an image, which is what the column defaults to.
          .filter((m) => (m.mediaType ?? 'image') === 'image' && Boolean(m.url))
          .slice()
          .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
          .map((m) => m.url as string);

  const imageUrl = raw.imageUrl ?? imageUrls[0] ?? '';

  return {
    id,
    name: raw.name ?? '',
    sku: raw.sku ?? '',
    category: lookupLabel(labels.categories, categoryId) || (categoryId ? categoryId.slice(0, 8) + '…' : '—'),
    subCategory: lookupLabel(labels.subCategories, raw.subCategoryId),
    productGroup: lookupLabel(labels.productGroups, raw.productGroupId),
    classification: lookupLabel(labels.classifications, raw.classificationId),
    productDetail: lookupLabel(labels.productDetails, raw.productDetailId),
    basePrice,
    margin: computeMargin(basePrice, platformPrice),
    sellingPrice: platformPrice,
    stock: Number(raw.stock) || 0,
    availableStock: raw.availableStock != null ? Number(raw.availableStock) : Number(raw.stock) || 0,
    reservedStock: raw.reservedStock != null ? Number(raw.reservedStock) : 0,
    moq: Number(raw.moq) || 1,
    dispatchTime: raw.dispatchTime ?? '',
    trendTags: Array.isArray(raw.productTags) ? (raw.productTags as string[]) : [],
    visibility: mapVisibility(raw.visibility),
    wholesalerId: raw.wholesalerId ?? '',
    status: mapStatus(raw.status),
    imageUrl,
    imageUrls,
    /*
     * Three facts the server sends and this mapper dropped on the floor.
     *
     * `inventory` is the per-size breakdown for a product with no variants —
     * the rows the detail page needs to answer "which SIZES are empty", which
     * a single stock total cannot. `deleted` is the sixth lifecycle state, and
     * `deriveProductState` has taken it as an argument since the state model
     * was written with nothing able to supply one. `marginPercent` is the
     * supplier's margin as the admin set it, so the detail page stops deriving
     * a percentage from two prices in a React component.
     */
    inventory: Array.isArray(raw.inventory) ? raw.inventory : [],
    deleted: Boolean(raw.deleted),
    marginPercent: Number(raw.marginPercent) || 0,
    rejectionReason: '',
    createdAt: formatTimestamp(raw.createdAt),
    updatedAt: formatTimestamp(raw.updatedAt),
    variations: Array.isArray(raw.variations) ? (raw.variations as Product['variations']) : [],
    description: typeof raw.description === 'string' ? raw.description : '',
    brandName: raw.brandName ?? '',
    unitType: raw.unitType ?? '',
    material: raw.material ?? '',
    color: '',
    weight: raw.weight != null ? String(raw.weight) : '',
    volume: raw.volume != null ? String(raw.volume) : '',
    availableSizes: raw.availableSizes ?? [],
    moqSet: {},
    videoUrl: raw.videoUrl ?? '',
    isFeatured: Boolean(raw.isFeatured),
    categoryId,
    subCategoryId: raw.subCategoryId ?? '',
    productGroupId: raw.productGroupId ?? '',
    classificationId: raw.classificationId ?? '',
    productDetailId: raw.productDetailId ?? '',
  } as Product;
}

export function normalizeProductListResponse(
  raw: BackendListResponse,
  categoryNames: Record<string, string> = {},
): NormalizedListResponse {
  const page = raw.meta.page ?? 1;
  const limit = raw.meta.limit ?? 20;
  const labels: CatalogLabelMaps = { ...EMPTY_CATALOG_LABELS, categories: categoryNames };
  const products = (raw.data ?? []).map((p) => normalizeBackendProduct(p, labels));
  return {
    products,
    total: raw.meta.total ?? products.length,
    page,
    limit,
  };
}
