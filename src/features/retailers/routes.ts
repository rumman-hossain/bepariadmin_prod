/**
 * Retailer route paths.
 *
 * Centralised so a path change happens in one place — and so every one of these
 * is a real route. onboard retailer is `/retailers/new`, a page with a URL, not a
 * modal: the form has five sections, a password, four uploads and a bank
 * account, and a dialog gives that a scrollbar inside a scrollbar, no address to
 * return to, and no way back from a mis-click on the backdrop.
 */
export const RETAILER_ROUTES = {
  LIST: '/retailers',
  CREATE: '/retailers/new',
  DETAIL: (id: string) => `/retailers/${id}`,
  EDIT: (id: string) => `/retailers/${id}/edit`,
} as const;
