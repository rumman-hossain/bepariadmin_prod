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
  categoryNames: Record<string, string> = {},
): Product {
  const id = String(raw.id);
  const basePrice = Number(raw.basePrice) || 0;
  const platformPrice = Number(raw.platformPrice ?? raw.basePrice) || basePrice;
  const categoryId = raw.categoryId ?? '';

  return {
    id,
    name: raw.name ?? '',
    sku: raw.sku ?? '',
    category: categoryNames[categoryId] ?? (categoryId ? categoryId.slice(0, 8) + '…' : '—'),
    subCategory: raw.subCategoryId ?? '',
    productGroup: raw.productGroupId ?? '',
    basePrice,
    margin: computeMargin(basePrice, platformPrice),
    sellingPrice: platformPrice,
    stock: Number(raw.stock) || 0,
    availableStock: raw.availableStock != null ? Number(raw.availableStock) : Number(raw.stock) || 0,
    reservedStock: raw.reservedStock != null ? Number(raw.reservedStock) : 0,
    moq: Number(raw.moq) || 1,
    dispatchTime: raw.dispatchTime ?? '',
    trendTags: [],
    visibility: mapVisibility(raw.visibility),
    wholesalerId: raw.wholesalerId ?? '',
    status: mapStatus(raw.status),
    imageUrl: raw.imageUrl ?? '',
    imageUrls: raw.imageUrls ?? [],
    rejectionReason: '',
    createdAt: formatTimestamp(raw.createdAt),
    updatedAt: formatTimestamp(raw.updatedAt),
    variations: [],
    description: '',
    brandName: raw.brandName ?? '',
    unitType: raw.unitType ?? '',
    material: raw.material ?? '',
    color: '',
    weight: raw.weight != null ? String(raw.weight) : '',
    volume: raw.volume != null ? String(raw.volume) : '',
    availableSizes: raw.availableSizes ?? [],
    moqSet: {},
    videoUrl: raw.videoUrl ?? '',
  };
}

export function normalizeProductListResponse(
  raw: BackendListResponse,
  categoryNames: Record<string, string> = {},
): NormalizedListResponse {
  const page = raw.meta.page ?? 1;
  const limit = raw.meta.limit ?? 20;
  const products = (raw.data ?? []).map((p) => normalizeBackendProduct(p, categoryNames));
  return {
    products,
    total: raw.meta.total ?? products.length,
    page,
    limit,
  };
}
