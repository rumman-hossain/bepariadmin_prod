/**
 * Products API layer — aligned with wholesaleapp-client + backend contract.
 */
import { request } from './client';
import type { ApiResponse } from '@/src/types/api';
import type { Product } from '@/src/features/products/types';
import type {
  CreateProductInput,
  UpdateProductInput,
  CatalogNode,
  SizeConfig,
} from '@/src/features/products/types/registration';
import {
  mapListQueryParams,
  normalizeProductListResponse,
  normalizeBackendProduct,
  extractBackendProduct,
  isBackendListResponse,
  type BackendListResponse,
} from '@/src/features/products/utils/mapProduct';
import {
  mergeCatalogLabels,
  resolveProductCatalogLabels,
  EMPTY_CATALOG_LABELS,
} from '@/src/features/products/utils/resolveCatalogLabels';

interface GetProductsOptions {
  categoryNames?: Record<string, string>;
}

interface GetProductByIdOptions {
  categoryNames?: Record<string, string>;
  /** Resolve full catalog hierarchy names (detail/edit). Default true. */
  resolveCatalog?: boolean;
}

// ─── Product CRUD ────────────────────────────────────────────────

export async function getProducts(
  params?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    status?: string;
    wholesalerId?: string;
    visibility?: string;
  },
  options?: GetProductsOptions,
): Promise<ApiResponse<{ products: Product[]; total: number; page: number; limit: number }>> {
  const searchParams = mapListQueryParams(params);
  const query = searchParams.toString();
  const res = await request<BackendListResponse>(
    'GET',
    `/api/v1/products${query ? `?${query}` : ''}`,
    { auth: true },
  );

  if (!res.ok || !res.data) {
    return {
      ok: false,
      status: res.status,
      data: { products: [], total: 0, page: params?.page ?? 1, limit: params?.limit ?? 20 },
    };
  }

  if (!isBackendListResponse(res.data)) {
    return {
      ok: false,
      status: res.status || 502,
      data: { products: [], total: 0, page: params?.page ?? 1, limit: params?.limit ?? 20 },
    };
  }

  const normalized = normalizeProductListResponse(res.data, options?.categoryNames ?? {});
  return { ok: true, status: res.status, data: normalized };
}

/** GET /api/v1/products/:id — normalizes backend shape + resolves catalog labels */
export async function getProductById(
  id: string,
  options?: GetProductByIdOptions,
): Promise<ApiResponse<{ data: Product }>> {
  const res = await request<{ data: unknown } | Product>('GET', `/api/v1/products/${id}`, { auth: true });

  const raw = res.ok ? extractBackendProduct(res.data) : null;
  if (!res.ok || !raw) {
    return res as ApiResponse<{ data: Product }>;
  }

  const resolveCatalog = options?.resolveCatalog !== false;
  const labels = resolveCatalog
    ? mergeCatalogLabels(await resolveProductCatalogLabels(raw), options?.categoryNames ?? {})
    : mergeCatalogLabels(EMPTY_CATALOG_LABELS, options?.categoryNames ?? {});

  const normalized = normalizeBackendProduct(raw, labels);

  return { ok: true, status: res.status, data: { data: normalized } };
}

/** Create — same endpoint as mobile wholesaler app */
export async function createProduct(input: CreateProductInput): Promise<ApiResponse<{ data: Product }>> {
  return request<{ data: Product }>('POST', '/api/v1/products', {
    auth: true,
    body: input as unknown as Record<string, unknown>,
  });
}

/** Update — same endpoint as mobile */
export async function updateProduct(
  id: string,
  input: UpdateProductInput,
): Promise<ApiResponse<{ data: Product }>> {
  return request<{ data: Product }>('PATCH', `/api/v1/products/${id}`, {
    auth: true,
    body: input as unknown as Record<string, unknown>,
  });
}

export async function deleteProduct(id: string): Promise<ApiResponse<{ data: string }>> {
  return request<{ data: string }>('DELETE', `/api/v1/products/${id}`, { auth: true });
}

/*
 * `updateProductStatus` USED TO LIVE HERE, and it is gone.
 *
 * It posted to `PATCH /api/v1/products/:id/status`, which the backend now
 * answers with 410 Gone. The route was retired in favour of verbs — approve,
 * reject, publish, take-down, submit — because a caller that simply names the
 * state it wants cannot carry what the transitions require: a reason for
 * reject and take-down, an image for publish, and a different actor from the
 * one who registered the product for approve.
 *
 * The replacements are in `src/api/adminProducts.ts`. Nothing should reintroduce
 * a status-setting call here; the product list page's old banner telling
 * operators to "approve via PATCH /products/:id/status" is gone with it.
 */

// ─── Catalog ─────────────────────────────────────────────────────

export async function getCategories(): Promise<ApiResponse<CatalogNode[]>> {
  return request<CatalogNode[]>('GET', '/api/v1/catalog/categories', { auth: true });
}

export async function getSubCategories(categoryId: string): Promise<ApiResponse<CatalogNode[]>> {
  return request<CatalogNode[]>(
    'GET',
    `/api/v1/catalog/sub-categories?categoryId=${encodeURIComponent(categoryId)}`,
    { auth: true },
  );
}

export async function getProductGroups(subCategoryId: string): Promise<ApiResponse<CatalogNode[]>> {
  return request<CatalogNode[]>(
    'GET',
    `/api/v1/catalog/product-groups?subCategoryId=${encodeURIComponent(subCategoryId)}`,
    { auth: true },
  );
}

export async function getClassifications(productGroupId: string): Promise<ApiResponse<CatalogNode[]>> {
  return request<CatalogNode[]>(
    'GET',
    `/api/v1/catalog/classifications?productGroupId=${encodeURIComponent(productGroupId)}`,
    { auth: true },
  );
}

interface SkuResponse {
  sku: string;
  details?: unknown[];
}

export async function getReservedSku(params: {
  wholesalerCode: string;
  categoryId: string;
  subCategoryId: string;
  productGroupId: string;
  classificationId: string;
}): Promise<ApiResponse<SkuResponse>> {
  const sp = new URLSearchParams({
    wholesaler_code: params.wholesalerCode,
    category_id: params.categoryId,
    sub_category_id: params.subCategoryId,
    product_group_id: params.productGroupId,
    classification_id: params.classificationId,
  });
  return request<SkuResponse>('GET', `/api/v1/catalog/sku?${sp.toString()}`, { auth: true });
}

export async function getPlatformMargin(): Promise<ApiResponse<{ marginPercent: number }>> {
  return request<{ marginPercent: number }>('GET', '/api/v1/catalog/platform-margin', { auth: true });
}

export async function getSizeConfig(productGroupId: string): Promise<ApiResponse<SizeConfig>> {
  return request<SizeConfig>(
    'GET',
    `/api/v1/catalog/product-groups/${encodeURIComponent(productGroupId)}/size-config`,
    { auth: true },
  );
}

