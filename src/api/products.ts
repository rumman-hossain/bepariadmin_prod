/**
 * Products API layer.
 * All product data fetching centralized here.
 * Communicates with beparibd-backend product/catalog endpoints.
 */
import { request } from './client';
import type { ApiResponse } from '@/src/types/api';
import type { Product } from '@/src/features/products/types';
import type { CreateProductDTO, UpdateProductDTO } from '@/src/features/products/types';

// ─── Product CRUD ────────────────────────────────────────────────

/**
 * Fetch paginated product list for admin.
 * GET /api/v1/admin/products
 */
export async function getProducts(params?: {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  status?: string;
  wholesalerId?: string;
  visibility?: string;
}): Promise<ApiResponse<{ products: Product[]; total: number; page: number; limit: number }>> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.search) searchParams.set('search', params.search);
  if (params?.category) searchParams.set('category', params.category);
  if (params?.status) searchParams.set('status', params.status);
  if (params?.wholesalerId) searchParams.set('wholesalerId', params.wholesalerId);
  if (params?.visibility) searchParams.set('visibility', params.visibility);

  const query = searchParams.toString();
  return request<{ products: Product[]; total: number; page: number; limit: number }>(
    'GET',
    `/api/v1/admin/products${query ? `?${query}` : ''}`,
    { auth: true },
  );
}

/**
 * Fetch single product by ID.
 * GET /api/v1/admin/products/:id
 */
export async function getProductById(id: string): Promise<ApiResponse<Product>> {
  return request<Product>('GET', `/api/v1/admin/products/${id}`, { auth: true });
}

/**
 * Create a new product.
 * POST /catalog/register
 */
export async function createProduct(dto: CreateProductDTO): Promise<ApiResponse<Product>> {
  return request<Product>('POST', '/catalog/register', {
    auth: true,
    body: dto as unknown as Record<string, unknown>,
  });
}

/**
 * Update an existing product.
 * PATCH /catalog/edit/:id
 */
export async function updateProduct(
  id: string,
  dto: UpdateProductDTO,
): Promise<ApiResponse<Product>> {
  return request<Product>('PATCH', `/catalog/edit/${id}`, {
    auth: true,
    body: dto as unknown as Record<string, unknown>,
  });
}

/**
 * Delete a product.
 * DELETE /catalog/delete/:id
 */
export async function deleteProduct(id: string): Promise<ApiResponse<{ success: boolean }>> {
  return request<{ success: boolean }>('DELETE', `/catalog/delete/${id}`, { auth: true });
}

/**
 * Update product status (approve, reject, archive, suspend, etc.).
 * PATCH /api/v1/admin/products/:id/status
 */
export async function updateProductStatus(
  id: string,
  status: string,
  reason?: string,
): Promise<ApiResponse<Product>> {
  return request<Product>('PATCH', `/api/v1/admin/products/${id}/status`, {
    auth: true,
    body: { status, rejectionReason: reason } as unknown as Record<string, unknown>,
  });
}

// ─── Catalog Tree ────────────────────────────────────────────────

interface CategoryNode {
  id: string;
  name: string;
  code?: string;
}

/**
 * Fetch all root categories.
 * GET /api/v1/catalog/categories
 */
export async function getCategories(): Promise<ApiResponse<CategoryNode[]>> {
  return request<CategoryNode[]>('GET', '/api/v1/catalog/categories', { auth: true });
}

/**
 * Fetch sub-categories for a given category.
 * GET /api/v1/catalog/sub-categories?categoryId=
 */
export async function getSubCategories(categoryId: string): Promise<ApiResponse<CategoryNode[]>> {
  return request<CategoryNode[]>('GET', `/api/v1/catalog/sub-categories?categoryId=${encodeURIComponent(categoryId)}`, { auth: true });
}

/**
 * Fetch product groups for a given sub-category.
 * GET /api/v1/catalog/product-groups?subCategoryId=
 */
export async function getProductGroups(subCategoryId: string): Promise<ApiResponse<CategoryNode[]>> {
  return request<CategoryNode[]>('GET', `/api/v1/catalog/product-groups?subCategoryId=${encodeURIComponent(subCategoryId)}`, { auth: true });
}

/**
 * Fetch classifications for a given product group.
 * GET /api/v1/catalog/classifications?productGroupId=
 */
export async function getClassifications(productGroupId: string): Promise<ApiResponse<CategoryNode[]>> {
  return request<CategoryNode[]>('GET', `/api/v1/catalog/classifications?productGroupId=${encodeURIComponent(productGroupId)}`, { auth: true });
}

// ─── SKU & Margins ───────────────────────────────────────────────

interface SkuResponse {
  sku: string;
}

/**
 * Reserve a SKU code.
 * GET /api/v1/catalog/sku?wholesaler_code=&category_id=&sub_category_id=&product_group_id=&classification_id=
 */
export async function getSku(params: {
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

interface PlatformMarginResponse {
  margin: number;
}

/**
 * Fetch platform margin configuration.
 * GET /api/v1/catalog/platform-margin
 */
export async function getPlatformMargin(): Promise<ApiResponse<PlatformMarginResponse>> {
  return request<PlatformMarginResponse>('GET', '/api/v1/catalog/platform-margin', { auth: true });
}

// ─── Size Configuration ──────────────────────────────────────────

interface SizeConfig {
  sizes: string[];
}

/**
 * Fetch available sizes for a product group.
 * GET /api/v1/catalog/product-groups/:id/size-config
 */
export async function getSizeConfig(productGroupId: string): Promise<ApiResponse<SizeConfig>> {
  return request<SizeConfig>('GET', `/api/v1/catalog/product-groups/${encodeURIComponent(productGroupId)}/size-config`, { auth: true });
}