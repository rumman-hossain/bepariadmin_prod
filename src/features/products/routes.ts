/**
 * Product route paths.
 * Centralized path constants for the products feature.
 */
export const PRODUCT_ROUTES = {
  LIST: '/products',
  DETAIL: '/products/:productId',
  CREATE: '/products/new',
  EDIT: '/products/:productId/edit',
} as const;