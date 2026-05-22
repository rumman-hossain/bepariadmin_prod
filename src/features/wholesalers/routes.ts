/**
 * Wholesaler route paths.
 * Centralized path constants so route changes happen in one place.
 */
export const WHOLESALER_ROUTES = {
  LIST: '/wholesalers',
  CREATE: '/wholesalers/create',
  DETAIL: (id: string) => `/wholesalers/${id}`,
  EDIT: (id: string) => `/wholesalers/${id}/edit`,
} as const;