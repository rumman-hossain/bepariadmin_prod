/**
 * The back-office product API — the list, and the lifecycle verbs.
 *
 * Split from `src/api/products.ts` because they talk to different surfaces.
 * That file speaks to the catalogue (`/api/v1/products`), which is shared with
 * retailers and narrowed to approved+public; this one speaks to the routes
 * built for staff.
 *
 * WHAT THIS REPLACES
 *
 * The console used to drive lifecycle changes through
 * `PATCH /api/v1/products/:id/status`. That route is now 410 Gone — it was
 * replaced by verbs, because a single status field could not express the
 * guards. `reject` and `take-down` require a reason, `publish` requires an
 * image, and `approve` refuses self-approval; none of those can be enforced by
 * a caller that just names the state it wants.
 */
import { request } from './client';
import type { ApiResponse } from '@/src/types/api';
import {
  EMPTY_STATE_COUNTS,
  type AdminProductListParams,
  type AdminProductListResult,
  type AdminProductRow,
  type ProductStateCounts,
} from '@/src/features/products/types/adminProduct';

// ─── List ────────────────────────────────────────────────────────

interface AdminListEnvelope {
  data: AdminProductRow[] | null;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    statusCounts?: ProductStateCounts | null;
  };
}

function buildListQuery(params: AdminProductListParams): string {
  const q = new URLSearchParams();
  q.set('page', String(params.page));
  q.set('limit', String(params.limit));
  if (params.search) q.set('search', params.search);
  // `state` is sent ONLY when set. The server refuses an unknown value with a
  // 400 rather than ignoring it, so an empty string must not be sent — that is
  // the difference between "every state" and a filter that silently does
  // nothing, which is the bug this whole change exists to remove.
  if (params.state) q.set('state', params.state);
  if (params.supplierId) q.set('supplierId', params.supplierId);
  if (params.categoryId) q.set('categoryId', params.categoryId);
  // Server-side. These were applied in the browser over one already-truncated
  // page, so the row count and the pager's total disagreed and nothing past the
  // current page was ever considered.
  if (params.hasImage !== undefined) q.set('hasImage', String(params.hasImage));
  if (params.lowStock) q.set('lowStock', 'true');
  return q.toString();
}

/**
 * GET /api/v1/admin/products
 *
 * Returns rows AND the per-state counts in one round trip. They ride together
 * because a count is meaningless apart from the list it describes, and two
 * calls could disagree — a product approved between them would be counted in
 * one and listed in the other.
 */
export async function listAdminProducts(
  params: AdminProductListParams,
): Promise<ApiResponse<AdminProductListResult>> {
  const res = await request<AdminListEnvelope>(
    'GET',
    `/api/v1/admin/products?${buildListQuery(params)}`,
    { auth: true },
  );

  const empty: AdminProductListResult = {
    products: [],
    total: 0,
    page: params.page,
    limit: params.limit,
    counts: EMPTY_STATE_COUNTS,
  };

  if (!res.ok || !res.data) {
    return { ok: false, status: res.status, data: empty };
  }

  const rows = Array.isArray(res.data.data) ? res.data.data : [];

  return {
    ok: true,
    status: res.status,
    data: {
      products: rows,
      total: res.data.meta?.total ?? rows.length,
      page: res.data.meta?.page ?? params.page,
      limit: res.data.meta?.limit ?? params.limit,
      /*
       * Counts are OPTIONAL on the wire and this must not fail without them.
       * The server logs and serves the list when the count query fails, on the
       * grounds that the list is the point — so the console degrades the same
       * way rather than blanking a screen over a missing convenience.
       */
      counts: res.data.meta?.statusCounts ?? EMPTY_STATE_COUNTS,
    },
  };
}

// ─── Lifecycle verbs ─────────────────────────────────────────────

export interface TransitionResult {
  productId: string;
  from: string;
  to: string;
}

interface TransitionEnvelope {
  data: TransitionResult;
}

function transition(id: string, verb: string, reason?: string) {
  return request<TransitionEnvelope>('POST', `/api/v1/products/${id}/${verb}`, {
    auth: true,
    // An empty body is valid; the machine decides whether a reason is required
    // and answers REASON_REQUIRED itself, so the client never pre-judges it.
    body: (reason ? { reason } : {}) as unknown as Record<string, unknown>,
  });
}

/** PENDING → APPROVED. Refused if the approver registered the product. */
export const approveProduct = (id: string) => transition(id, 'approve');

/** PENDING → REJECTED. Reason required — the supplier reads it. */
export const rejectProduct = (id: string, reason: string) => transition(id, 'reject', reason);

/** APPROVED → PUBLIC. Refused unless the product has at least one image. */
export const publishProduct = (id: string) => transition(id, 'publish');

/**
 * Any live state → PRIVATE. Reason required.
 *
 * This is what "make this private" means. Reachable from every live state
 * because it answers "this must stop being visible now", and walking a product
 * back through the lifecycle first would be an obstacle at exactly the wrong
 * moment.
 */
export const takeDownProduct = (id: string, reason: string) =>
  transition(id, 'take-down', reason);

/** DRAFT | REJECTED → PENDING. Supplier-facing; here for completeness. */
export const submitProduct = (id: string) => transition(id, 'submit');

// ─── Audit ───────────────────────────────────────────────────────

export interface ProductHistoryEntry {
  action: string;
  actorId: string;
  actorRole: string;
  from?: string;
  to?: string;
  reason?: string;
  createdAt: string;
}

/** GET /api/v1/products/:id/audit — who did what, when, and why. */
export async function getProductAudit(
  id: string,
): Promise<ApiResponse<ProductHistoryEntry[]>> {
  const res = await request<{ data: ProductHistoryEntry[] | null }>(
    'GET',
    `/api/v1/products/${id}/audit`,
    { auth: true },
  );
  if (!res.ok || !res.data) return { ok: false, status: res.status, data: [] };
  return { ok: true, status: res.status, data: res.data.data ?? [] };
}
