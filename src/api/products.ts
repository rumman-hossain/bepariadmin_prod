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
  isBackendListResponse,
  type BackendListResponse,
} from '@/src/features/products/utils/mapProduct';
import { DISPLAY_STATUS_TO_BACKEND } from '@/src/features/products/constants';

export interface GetProductsOptions {
  categoryNames?: Record<string, string>;
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

/** TODO: admin detail — uses same path pattern as mobile until admin route exists */
export async function getProductById(id: string): Promise<ApiResponse<{ data: Product }>> {
  const res = await request<{ data: Product } | Product>('GET', `/api/v1/products/${id}`, { auth: true });
  if (res.ok && res.data && 'data' in (res.data as object)) {
    return res as ApiResponse<{ data: Product }>;
  }
  if (res.ok && res.data && !('data' in (res.data as object))) {
    return { ...res, data: { data: res.data as Product } };
  }
  return res as ApiResponse<{ data: Product }>;
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

export async function updateProductStatus(
  id: string,
  status: string,
  reason?: string,
): Promise<ApiResponse<Product>> {
  const backendStatus =
    DISPLAY_STATUS_TO_BACKEND[status] ?? status.toLowerCase().replace(/\s+/g, '_');
  return request<Product>('PATCH', `/api/v1/products/${id}/status`, {
    auth: true,
    body: { status: backendStatus, rejectionReason: reason } as unknown as Record<string, unknown>,
  });
}

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

export interface SkuResponse {
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

export async function generateVariants(
  productTemplateId: string,
  colors: string[],
  designs: string[],
): Promise<ApiResponse<unknown[]>> {
  return request<unknown[]>('POST', `/api/v1/catalog/product-templates/${productTemplateId}/variants`, {
    auth: true,
    body: { colors, designs } as unknown as Record<string, unknown>,
  });
}
