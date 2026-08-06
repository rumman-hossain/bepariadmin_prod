/**
 * Wholesaler API Service
 */

import { request } from '@/src/api/client';
import { hashPassword, hashErrorMessage } from '@/src/auth/passwordHasher';
import type { Wholesaler } from '@/src/types/domain';
import type { SupplierQuery } from '../types';
import type { WholesalerFormData } from '../schemas/wholesalerSchema';
import {
  wholesalerDetailResponseSchema,
  wholesalerListResponseSchema,
  type WholesalerProfilePayload,
} from '../schemas/wholesalerApiSchema';
import { assertOk, parseApiError, WholesalerApiError } from './errors';
import {
  RetailerRequestError,
  documentFailureMessage,
} from '@/src/features/retailers/api/retailersApi';
import { documentUrlSchema } from '@/src/features/retailers/schemas/retailerSchema';
import {
  mapProfileToWholesaler,
  sanitizeLogoUrlForApi,
  docTypeFromName,
} from './mapWholesaler';
import { DEFAULT_COMMISSION_RATE } from '../constants';

function buildUpdatePayload(dto: WholesalerFormData): Record<string, unknown> {
  return {
    name: dto.ownerName,
    shopName: dto.companyName,
    companyName: dto.companyName,
    phone: dto.mobile,
    category: dto.categories.join(', '),
    margin: dto.commissionRate ?? DEFAULT_COMMISSION_RATE,
    logoUrl: sanitizeLogoUrlForApi(dto.logoUrl),
    addresses: (dto.addresses || []).map((a) => ({
      addressType: a.addressType,
      division: a.division || '',
      district: a.district,
      postalCode: a.postalCode,
      addressLine: a.addressLine,
      isDefault: a.isDefault,
    })),
    bkashWallets: (dto.digitalWallets || []).map((w) => ({
      walletType: w.walletType,
      accountNumber: w.accountNumber,
      isDefault: w.isDefault,
    })),
    bankDetails: (dto.bankDetailsList || []).map((b) => ({
      bankName: b.bankName,
      accountName: b.accountName,
      accountNumber: b.accountNumber,
      branch: b.branch || '',
      routing: b.routing || '',
      isDefault: b.isDefault,
    })),
    documents: (dto.documents || [])
      .filter((d) => d.fileUrl && !d.fileUrl.startsWith('mock-gcs://'))
      .map((d) => ({
        docType: docTypeFromName(d.name),
        docName: d.name,
        status: (d.status || 'pending').toLowerCase(),
        fileUrl: d.fileUrl || '',
      })),
  };
}

/**
 * One page of suppliers, narrowed by the SERVER.
 *
 * The old version sent three parameters, ignored the rest, and asked for every
 * supplier on every load — the screen then filtered the array in the browser.
 * That had three costs: the total that should drive a pager described the
 * unfiltered set, nothing past the thousandth supplier was reachable, and every
 * keystroke re-filtered the whole list.
 *
 * `statusCounts` rides along in `meta` rather than coming from a second
 * endpoint, because a count is meaningless apart from the list it describes and
 * two requests could disagree — a supplier suspended between them would be
 * counted in one and listed in the other.
 */
export interface SupplierPage {
  suppliers: Wholesaler[];
  total: number;
  statusCounts: SupplierStatusCounts;
}

export interface SupplierStatusCounts {
  review: number;
  active: number;
  suspended: number;
  rejected: number;
  removed: number;
}

const NO_COUNTS: SupplierStatusCounts = {
  review: 0,
  active: 0,
  suspended: 0,
  rejected: 0,
  removed: 0,
};

export async function listWholesalers(
  filters?: SupplierQuery,
  options?: { bustCache?: boolean },
): Promise<SupplierPage> {
  const searchParams = new URLSearchParams();

  // Only what is set. An empty parameter would narrow to the empty string on
  // the server rather than meaning "no filter".
  const put = (key: string, value: string | number | undefined) => {
    if (value === undefined || value === '' || value === 0) return;
    searchParams.set(key, String(value));
  };

  put('search', filters?.search);
  put('status', filters?.status);
  put('district', filters?.district);
  put('category', filters?.category);
  put('commission', filters?.commission);
  put('joinedWithinDays', filters?.joinedWithinDays);
  put('paperwork', filters?.paperwork);
  put('products', filters?.products);
  put('registeredBy', filters?.registeredBy);
  put('page', filters?.page);
  put('limit', filters?.limit);
  if (options?.bustCache) searchParams.set('_', String(Date.now()));

  const query = searchParams.toString();
  const res = await request<unknown>(
    'GET',
    `/api/v1/admin/wholesalers${query ? `?${query}` : ''}`,
    { auth: true },
  );

  assertOk(res);

  const raw = res.data;
  let profiles: WholesalerProfilePayload[] = [];
  let total: number | undefined;
  let counts: SupplierStatusCounts | undefined;

  if (Array.isArray(raw)) {
    // A bare array, from a server older than the paged envelope. Kept so a
    // rollback does not blank the screen.
    profiles = raw as WholesalerProfilePayload[];
  } else {
    const parsed = wholesalerListResponseSchema.safeParse(raw);
    if (!parsed.success) {
      throw new WholesalerApiError('Invalid supplier list received from server', res.status);
    }
    profiles = parsed.data.data;
    const meta = (raw as { meta?: { total?: number; statusCounts?: SupplierStatusCounts } }).meta;
    total = meta?.total;
    counts = meta?.statusCounts;
  }

  return {
    suppliers: profiles.map((p) => mapProfileToWholesaler(p)),
    // Falling back to the page length rather than to zero: a zero would make the
    // pager vanish and the header claim there are no suppliers over a table
    // showing some.
    total: total ?? profiles.length,
    statusCounts: counts ?? NO_COUNTS,
  };
}

/**
 * Every supplier a picker can offer.
 *
 * The product wizard and the product-list filter need a plain list to choose
 * from, not a page of a narrowed directory. Named so the difference is explicit:
 * a picker that silently received page one of a filtered list would offer an
 * arbitrary 25 suppliers and look like a complete set.
 */
export async function listSuppliersForPicker(): Promise<Wholesaler[]> {
  const { suppliers } = await listWholesalers({ limit: 200 });
  return suppliers;
}

/**
 * Restoring a supplier that was removed.
 *
 * The soft delete was only half-built: `deleted_at` hid the row from the
 * directory, the detail screen and sign-in, and nothing could clear it. Delete
 * offered two outcomes and delivered one.
 */
export async function restoreWholesaler(id: string): Promise<void> {
  const res = await request<unknown>(
    'POST',
    `/api/v1/admin/wholesalers/${encodeURIComponent(id)}/restore`,
    { auth: true, body: {} },
  );
  if (!res.ok) throw parseApiError(res);
}

export async function resetWholesalerPassword(
  wholesalerId: string,
  newPasswordHash: string,
): Promise<void> {
  const res = await request<{ data?: string; message?: string }>(
    'POST',
    `/api/v1/admin/wholesalers/${encodeURIComponent(wholesalerId)}/reset-password`,
    { auth: true, body: { new_password_hash: newPasswordHash } },
  );
  assertOk(res);
}

export async function getWholesaler(id: string): Promise<Wholesaler> {
  const res = await request<unknown>(
    'GET',
    `/api/v1/admin/wholesalers/${encodeURIComponent(id)}`,
    { auth: true },
  );

  assertOk(res);

  const parsed = wholesalerDetailResponseSchema.safeParse(res.data);
  const profile = parsed.success
    ? parsed.data.data
    : ((res.data as Record<string, unknown>)?.data as WholesalerProfilePayload) ??
      (res.data as WholesalerProfilePayload);

  if (!profile || typeof profile !== 'object' || !('id' in profile)) {
    throw new WholesalerApiError('Invalid supplier detail received from server', res.status);
  }

  return mapProfileToWholesaler(profile);
}

export async function createWholesaler(dto: WholesalerFormData): Promise<Wholesaler> {
  let passwordHash = '';
  if (dto.password) {
    try {
      passwordHash = await hashPassword(dto.password);
    } catch (err) {
      const msg = hashErrorMessage(err);
      if (msg) throw new WholesalerApiError(msg, 0);
      throw err;
    }
  }

  const fullPayload = {
    email: dto.email,
    password_hash: passwordHash,
    name: dto.ownerName,
    shopName: dto.companyName,
    companyName: dto.companyName,
    phone: dto.mobile,
    category: dto.categories.join(', '),
    margin: dto.commissionRate ?? DEFAULT_COMMISSION_RATE,
    logoUrl: sanitizeLogoUrlForApi(dto.logoUrl),
    addresses: (dto.addresses || []).map((a) => ({
      addressType: a.addressType,
      division: a.division || '',
      district: a.district,
      postalCode: a.postalCode,
      addressLine: a.addressLine,
      isDefault: a.isDefault,
    })),
    bankDetails: (dto.bankDetailsList || []).map((b) => ({
      bankName: b.bankName,
      accountName: b.accountName,
      accountNumber: b.accountNumber,
      branch: b.branch || '',
      routing: b.routing || '',
      isDefault: b.isDefault,
    })),
    bkashWallets: (dto.digitalWallets || []).map((w) => ({
      walletType: w.walletType,
      accountNumber: w.accountNumber,
      isDefault: w.isDefault,
    })),
    /*
     * The DRAFT, not a list of documents.
     *
     * This used to send `{docType, docName, fileUrl}` per slot, composed by this
     * page, and the server stored it verbatim. "All four documents are required"
     * against THAT would have been a check on a claim the browser makes about
     * itself — four invented paths satisfy it, and the supplier is onboarded
     * with no paperwork while every screen reports four documents on file.
     *
     * The server reads the draft instead: it knows which files it accepted and
     * whether their bytes landed, claims the draft in the same transaction that
     * inserts the supplier, and derives the rows itself. The array is REMOVED
     * rather than sent and ignored — a field the server no longer reads is one
     * somebody will keep filling in and expecting to matter.
     */
    uploadDraftId: dto.uploadDraftId ?? '',
  };

  const res = await request<{ data?: Record<string, unknown> }>(
    'POST',
    '/api/v1/auth/admin/create-wholesaler',
    { auth: true, body: fullPayload },
  );

  if (!res.ok) {
    throw parseApiError(res);
  }

  const wholesalerId = res.data?.data?.id as string | undefined;
  if (!wholesalerId) {
    throw new WholesalerApiError(
      'Supplier onboarded but server returned an incomplete response. Refresh the list.',
      res.status,
    );
  }

  return getWholesaler(wholesalerId);
}

export async function updateWholesaler(id: string, dto: WholesalerFormData): Promise<Wholesaler> {
  const res = await request<Record<string, unknown>>(
    'PATCH',
    `/api/v1/admin/wholesalers/${encodeURIComponent(id)}`,
    { auth: true, body: buildUpdatePayload(dto) },
  );

  if (!res.ok) {
    throw parseApiError(res);
  }

  return getWholesaler(id);
}

export async function updateWholesalerMargin(id: string, margin: number): Promise<Wholesaler> {
  const res = await request<Record<string, unknown>>(
    'PATCH',
    `/api/v1/admin/wholesalers/${encodeURIComponent(id)}`,
    { auth: true, body: { margin } },
  );

  if (!res.ok) {
    throw parseApiError(res);
  }

  return getWholesaler(id);
}

async function postAction(path: string, body?: Record<string, unknown>): Promise<void> {
  const res = await request<unknown>('POST', path, { auth: true, body });
  assertOk(res);
}

export async function approveWholesaler(id: string, _reviewedBy: string): Promise<Wholesaler> {
  await postAction(`/api/v1/admin/wholesalers/${encodeURIComponent(id)}/approve`, {});
  return getWholesaler(id);
}

export async function rejectWholesaler(
  id: string,
  _reviewedBy: string,
  reason: string,
): Promise<Wholesaler> {
  await postAction(`/api/v1/admin/wholesalers/${encodeURIComponent(id)}/reject`, { reason });
  return getWholesaler(id);
}

export async function suspendWholesaler(
  id: string,
  _reviewedBy: string,
  reason: string,
): Promise<Wholesaler> {
  await postAction(`/api/v1/admin/wholesalers/${encodeURIComponent(id)}/suspend`, { reason });
  return getWholesaler(id);
}

export async function unsuspendWholesaler(id: string, _reviewedBy: string): Promise<Wholesaler> {
  await postAction(`/api/v1/admin/wholesalers/${encodeURIComponent(id)}/unsuspend`, {});
  return getWholesaler(id);
}

export async function requestResubmitWholesaler(
  id: string,
  _reviewedBy: string,
  reason: string,
): Promise<Wholesaler> {
  await postAction(`/api/v1/admin/wholesalers/${encodeURIComponent(id)}/request-resubmit`, { reason });
  return getWholesaler(id);
}

/**
 * Removing a supplier, and the two things that can mean.
 *
 * `SUSPENDED` gets a soft delete: hidden, with its orders and payments intact.
 * `REJECTED` gets a permanent one, and only when it left nothing behind — the
 * server refuses if there is a single order, payment or product. The response
 * says WHICH happened, because reporting "deleted" for both would hide that one
 * is reversible and the other destroyed everything.
 */
export async function deleteWholesaler(id: string): Promise<'soft' | 'hard'> {
  const res = await request<unknown>(
    'DELETE',
    `/api/v1/admin/wholesalers/${encodeURIComponent(id)}`,
    { auth: true },
  );
  if (!res.ok) {
    throw parseApiError(res);
  }
  // The server answers "soft" or "hard". Anything else is read as soft — the
  // cautious reading, because it is the one that claims less happened.
  return (res.data as { data?: string } | undefined)?.data === 'hard' ? 'hard' : 'soft';
}

/*
 * Re-exported so the mapping's move to `mapWholesaler.ts` is not a breaking
 * change for callers that have always imported it from here.
 */
export { mapProfileToWholesaler, sanitizeLogoUrlForApi } from './mapWholesaler';

/**
 * A short-lived link to one of a supplier's certificates.
 *
 * The retailer counterpart is `getRetailerDocumentUrl`; both return a path on
 * OUR domain — `/api/v1/doc/<token>` — which the backend then streams. A
 * storage address, with the bucket name and object path in it, never reaches
 * the browser.
 *
 * Requested at the moment somebody presses View or Download, and never stored.
 */
export async function getWholesalerDocumentUrl(
  wholesalerId: string,
  documentId: string,
): Promise<{ url: string; expiresAt: string }> {
  const res = await request<unknown>(
    'GET',
    `/api/v1/admin/wholesalers/${encodeURIComponent(wholesalerId)}/documents/${encodeURIComponent(documentId)}/url`,
    { auth: true },
  );
  if (!res.ok) {
    /*
     * RetailerRequestError, despite the name, because `isNotFound` is what the
     * shared opener uses to decide whether a document is worth waiting for.
     * Throwing a plain Error here would make every supplier 404 read as a hard
     * failure and lose the "still being saved" retry the retailer vault has.
     *
     * The name is wrong for this caller and renaming it is a wider change than
     * this one; the behaviour is what matters and it is shared deliberately.
     */
    throw new RetailerRequestError(
      res.status,
      documentFailureMessage(res.status) ??
        readWholesalerServerMessage(res.data) ??
        `That document could not be opened (${res.status}).`,
    );
  }
  return documentUrlSchema.parse(res.data).data;
}

/** The server's own message, when it sent one. */
function readWholesalerServerMessage(data: unknown): string | null {
  const message = (data as { error?: { message?: string } } | undefined)?.error?.message;
  return typeof message === 'string' && message.trim() !== '' ? message : null;
}

/**
 * Binds an upload draft to a supplier that already exists.
 *
 * The create call claims its draft inside the transaction that inserts the
 * supplier. Editing has no such moment — and without this, a certificate
 * uploaded from the edit screen landed in a draft nobody ever claimed: the slot
 * said "done", a document row was written, and the object it named had no
 * recorded owner, so the vault refused to open it.
 */
export async function attachWholesalerDocuments(id: string, uploadDraftId: string): Promise<void> {
  const res = await request<unknown>(
    'POST',
    `/api/v1/auth/admin/wholesalers/${encodeURIComponent(id)}/documents`,
    { auth: true, body: { uploadDraftId } },
  );
  if (!res.ok) {
    throw new WholesalerApiError(
      readWholesalerServerMessage(res.data) ?? 'The documents could not be saved',
      res.status,
    );
  }
}
