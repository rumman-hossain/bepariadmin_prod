import { request } from '@/src/api/client';
import type { RetailerBank, RetailerWallet, RetailerAddress } from '../components/RetailerForm';
import { API_V1 } from '@/src/utils/constants';
import { hashPassword, hashErrorMessage } from '@/src/auth/passwordHasher';
import {
  retailerListSchema,
  retailerDetailSchema,
  retailerCreatedSchema,
  documentUrlSchema,
  type Retailer,
  type RetailerUpdate,
  type RetailerStatusCounts,
} from '../schemas/retailerSchema';

/**
 * Retailer API.
 *
 * Three routes exist and no more — `GET /admin/retailers`,
 * `GET /admin/retailers/{id}`, `PATCH /admin/retailers/{id}`. Suppliers have
 * six lifecycle mutations (approve, reject, suspend, unsuspend,
 * request-resubmit, reset-password); retailers have none of them. The screen
 * says so rather than rendering buttons that would 404.
 *
 * The list IS paginated — `internal/admin/handler.go:53-66` reads `page` and
 * `limit` and returns `meta`. Note the server defaults `limit` to **1000** when
 * absent, which would pull the entire retailer base on first paint, so the
 * client always sends an explicit limit.
 */

const BASE = '/api/v1/admin/retailers';

export interface ListRetailersParams {
  page: number;
  limit: number;
  /** Shop name, owner name or phone. */
  search?: string;
  status?: string;
  district?: string;
  category?: string;
}

export interface RetailerPage {
  data: Retailer[];
  total: number;
  statusCounts?: RetailerStatusCounts;
}

export async function listRetailers({
  page,
  limit,
  search,
  status,
  district,
  category,
}: ListRetailersParams): Promise<RetailerPage> {
  const query = new URLSearchParams({ page: String(page), limit: String(limit) });
  // Only non-empty filters are sent. An empty `status=` would reach the server
  // as a real filter value; it trims and ignores blanks, but not sending them
  // also keeps the URL — and the TanStack query key — clean, so clearing a
  // filter reuses the same cache entry as never having set it.
  for (const [key, value] of Object.entries({ search, status, district, category })) {
    if (value) query.set(key, value);
  }
  const res = await request<unknown>('GET', `${BASE}?${query}`, { auth: true });
  if (!res.ok) throw new Error('Retailers could not be loaded');
  const parsed = retailerListSchema.parse(res.data);
  return {
    data: parsed.data,
    total: parsed.meta.total,
    statusCounts: parsed.meta.statusCounts,
  };
}

/**
 * A failure that still knows what the server said.
 *
 * `new Error(message)` throws the status away, and the caller then cannot tell a
 * 404 from a timeout. That mattered the moment a deleted shop's detail query
 * kept refetching: TanStack retries a failure three times by default, and three
 * retries of a definitive "this row is gone" is three wrong answers and four
 * 404s in the console.
 */
export class RetailerRequestError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'RetailerRequestError';
    this.status = status;
  }
}

/** A 404 is an answer, not a failure to get one. */
export function isNotFound(err: unknown): boolean {
  return err instanceof RetailerRequestError && err.status === 404;
}

/**
 * One retailer, in full.
 *
 * `safeParse` and not `parse`, and the failure NAMES THE FIELDS.
 *
 * The server logs show this endpoint returning 200 while the screen said "could
 * not be loaded" — the response was fine and the client rejected it. With
 * `parse` the thrown error was one generic sentence, so the browser never
 * learned which field was wrong and neither did I.
 *
 * This is the fourth healthy response read as a failure in this feature. Naming
 * the path turns the next one into a one-line diagnosis instead of a reading
 * exercise.
 */
export async function getRetailer(id: string): Promise<Retailer> {
  const res = await request<unknown>('GET', `${BASE}/${encodeURIComponent(id)}`, { auth: true });
  if (!res.ok) {
    throw new RetailerRequestError(
      res.status,
      readServerMessage(res.data) ?? 'This retailer could not be loaded',
    );
  }

  const parsed = retailerDetailSchema.safeParse(res.data);
  if (!parsed.success) {
    const fields = parsed.error.issues
      .map((i) => `${i.path.join('.')} (${i.message})`)
      .join(', ');
    throw new Error(`This retailer could not be loaded — unexpected data: ${fields}`);
  }
  return parsed.data.data;
}

/**
 * Saving an edit.
 *
 * Returns nothing, because the server returns nothing useful: the handler
 * replies `{"data":"updated"}` — a STRING where this used to demand a retailer
 * object. `retailerDetailSchema.parse` therefore threw on every successful
 * save, and the operator was told "Changes could not be saved" after they had
 * been. Same shape of mistake as the create endpoint: the client asserted a
 * response the server never promised.
 *
 * The fresh row comes from the refetch `useUpdateRetailer` already triggers, so
 * nothing is lost by not parsing a body. If PATCH is ever changed to return the
 * updated profile, this can return it and seed the cache — but the client must
 * not claim it does so before the server does.
 */
export async function updateRetailer(id: string, input: RetailerUpdate): Promise<void> {
  const res = await request<unknown>('PATCH', `${BASE}/${encodeURIComponent(id)}`, {
    auth: true,
    body: input,
  });
  if (!res.ok) throw new Error(readServerMessage(res.data) ?? 'Changes could not be saved');
}

/**
 * Creates a retailer, with its login.
 *
 * The password is hashed IN THIS BROWSER before it leaves. Nothing on the
 * server, and nothing in any log, ever sees what the operator typed — the same
 * path `createWholesaler` uses, deliberately, so the two flows cannot drift into
 * having different security properties.
 *
 * A separate route from the rest of the admin surface: creating an account is an
 * auth concern, so it lives under `/auth/admin/`, next to create-wholesaler,
 * rather than under `/admin/retailers`.
 */
export async function createRetailer(
  input: RetailerUpdate & { password: string; uploadDraftId?: string },
): Promise<{ id: string }> {
  let passwordHash = '';
  try {
    passwordHash = await hashPassword(input.password);
  } catch (err) {
    // A hashing failure must never fall back to sending the plaintext. The
    // request simply does not happen.
    // hashErrorMessage names the two conditions it recognises and returns null
    // otherwise, so a fallback is required rather than optional.
    throw new Error(hashErrorMessage(err) ?? 'Your browser could not process the password. Please try again.');
  }

  const { password: _discarded, uploadDraftId, ...rest } = input;
  const res = await request<unknown>('POST', `${API_V1}/auth/admin/create-retailer`, {
    auth: true,
    // uploadDraftId is sent under the name the Go request struct binds. The
    // documents are already in that draft; this is what lets the server check
    // NID and trade licence are present BEFORE it inserts the shop.
    body: { ...rest, password_hash: passwordHash, uploadDraftId },
  });
  if (!res.ok) throw new Error(readServerMessage(res.data) ?? 'The retailer could not be created');
  // retailerCreatedSchema, NOT retailerDetailSchema — this endpoint returns a
  // SessionUser, not a retailer profile. See the schema for what that cost.
  return retailerCreatedSchema.parse(res.data).data;
}

/**
 * Suspend, restore, and force a new password.
 *
 * Three routes rather than a `status` field on PATCH. A lifecycle change hidden
 * inside a general-purpose update is a lifecycle change nobody can audit — and
 * these are the actions somebody will be asked to account for.
 *
 * Each takes a reason where the server records one; a suspension with no stated
 * cause is indistinguishable from a mistake six months later.
 */
async function retailerAction(id: string, action: string, body: Record<string, unknown> = {}) {
  const res = await request<unknown>(
    'POST',
    `${BASE}/${encodeURIComponent(id)}/${action}`,
    { auth: true, body },
  );
  if (!res.ok) throw new Error(readServerMessage(res.data) ?? 'That action could not be completed');
}

export const suspendRetailer = (id: string, reason: string) =>
  retailerAction(id, 'suspend', { reason });

export const unsuspendRetailer = (id: string) => retailerAction(id, 'unsuspend');

/**
 * Turning down an application.
 *
 * Pending only — the server refuses anything else, and that restriction is the
 * safety: `rejected` is the one status a permanent delete is reachable from, so
 * being able to reject an ACTIVE shop would make "reject, then delete" a
 * two-click route to erasing a trading shop.
 */
export const rejectRetailer = (id: string, reason: string) =>
  retailerAction(id, 'reject', { reason });

/**
 * Removing a shop — and the server decides which kind of removal.
 *
 * `suspended` gets a soft delete: hidden, with its orders and payments intact.
 * `rejected` gets a permanent one, and only when it left nothing behind. The
 * response says which happened, because "deleted" for both would hide that one
 * is reversible and the other is not.
 */
export async function deleteRetailer(id: string): Promise<'soft' | 'hard'> {
  const res = await request<unknown>('DELETE', `${BASE}/${encodeURIComponent(id)}`, { auth: true });
  if (!res.ok) {
    throw new Error(readServerMessage(res.data) ?? 'That shop could not be deleted');
  }
  // The server answers "soft" or "hard". Anything else is treated as soft — the
  // cautious reading, since it is the one that claims less.
  return (res.data as { data?: string } | undefined)?.data === 'hard' ? 'hard' : 'soft';
}

export async function resetRetailerPassword(id: string, password: string): Promise<void> {
  let passwordHash = '';
  try {
    passwordHash = await hashPassword(password);
  } catch (err) {
    // hashErrorMessage names the two conditions it recognises and returns null
    // otherwise, so a fallback is required rather than optional.
    throw new Error(hashErrorMessage(err) ?? 'Your browser could not process the password. Please try again.');
  }
  await retailerAction(id, 'reset-password', { password_hash: passwordHash });
}

/**
 * Binding uploaded paperwork to a shop that already exists.
 *
 * Create claims its draft inside the transaction that inserts the row, so the
 * shop and its documents land together. Editing has no such moment — the row is
 * already there — so the claim needs a call of its own.
 *
 * Without this, the edit screen uploaded into a draft nobody ever claimed: every
 * slot reported success, no `retailer_documents` row was written, and the
 * operator was told a document was on file when it was bound to nothing. The
 * fifth instance in this feature of a write path complete at both ends and not
 * joined in the middle.
 *
 * Under `/auth/admin/`, next to create-retailer, because claiming an upload
 * draft is the same act as create performs and shares its refusal rules.
 */
export async function attachRetailerDocuments(id: string, uploadDraftId: string): Promise<void> {
  const res = await request<unknown>(
    'POST',
    `${API_V1}/auth/admin/retailers/${encodeURIComponent(id)}/documents`,
    { auth: true, body: { uploadDraftId } },
  );
  if (!res.ok) {
    throw new Error(readServerMessage(res.data) ?? 'The documents could not be saved');
  }
}

/**
 * Why a document would not open, in terms that match what happened.
 *
 * Exported for tests: each of these is a different fact, and collapsing them
 * into one sentence is what made the missing endpoint look like a deleted file
 * for as long as it did.
 *
 * # null is the point, not an oversight
 *
 * Returns null for a status this screen has nothing better to say about, so the
 * caller can fall back to the server's own message. It used to answer every
 * status — including a made-up sentence for statuses it knew nothing about —
 * which forced the caller to prefer the server's wording to avoid inventing
 * reasons. That preference is what put "Resource not found" on screen for a
 * document that was mid-save: the server's generic phrase beat the sentence
 * written for exactly this case.
 *
 * Now the precedence runs the other way for the three statuses that HAVE a
 * written explanation, and the server keeps the rest — where its message is
 * usually the actionable part ("that phone number is already registered").
 */
export function documentFailureMessage(status: number): string | null {
  if (status === 403) {
    return 'You do not have permission to open this document.';
  }
  if (status === 404) {
    return 'That document is not on file for this shop.';
  }
  if (status === 401) {
    return 'Your session has ended. Sign in again to open this document.';
  }
  return null;
}

/**
 * The server's own message, when it sent one.
 *
 * A refusal usually names something the operator can act on — "that phone
 * number is already registered" — and replacing it with a generic sentence
 * throws away the only useful part of the response.
 */
function readServerMessage(data: unknown): string | null {
  const message = (data as { error?: { message?: string } } | undefined)?.error?.message;
  return typeof message === 'string' && message.trim() !== '' ? message : null;
}

/**
 * A short-lived signed URL for one document.
 *
 * Requested at the moment somebody presses View, and never stored. The server
 * decides whether to sign — an admin, or the shop itself, and nobody else (see
 * `canViewRetailerDocument`). The bucket has public_access_prevention enforced,
 * so an unsigned address simply does not resolve.
 */
export async function getRetailerDocumentUrl(
  retailerId: string,
  documentId: string,
): Promise<{ url: string; expiresAt: string }> {
  const res = await request<unknown>(
    'GET',
    `${BASE}/${encodeURIComponent(retailerId)}/documents/${encodeURIComponent(documentId)}/url`,
    { auth: true },
  );
  if (!res.ok) {
    /*
     * "It may have been removed" was said for every failure, and for a long
     * time it was said about an endpoint that did not exist: the route was
     * never registered, so chi answered its own 404 and the screen invented a
     * reason. The file was in the bucket the whole time.
     *
     * A refusal and an absence are different facts and deserve different
     * sentences — so OUR sentence wins for the three statuses that have one,
     * and the server's wins everywhere else. That order matters: this endpoint's
     * 404 carries the server's generic "Resource not found", which is what an
     * operator saw when they pressed View on a document that was still being
     * saved.
     *
     * RetailerRequestError, not Error, so the caller can tell a 404 from a 403.
     * A document that is mid-save and one the operator may not read are not the
     * same situation, and only the first is worth waiting through.
     */
    throw new RetailerRequestError(
      res.status,
      documentFailureMessage(res.status) ??
        readServerMessage(res.data) ??
        `That document could not be opened (${res.status}).`,
    );
  }
  return documentUrlSchema.parse(res.data).data;
}

/**
 * Bank accounts and mobile wallets.
 *
 * A SEPARATE call after create, not part of it: the endpoint is keyed by
 * retailer id, and that id does not exist until create returns. Folding it into
 * the create request would mean the server writing child rows for a shop it is
 * still inserting.
 *
 * PUT, and the body is the complete set — including the omissions. A shop that
 * closed an account sends the list without it, and that IS the instruction to
 * remove it.
 *
 * This function did not exist. The endpoint was built and integration-tested a
 * round earlier, the form collected banks and wallets, and nothing connected
 * them — so everything an operator typed into that section was discarded on
 * submit with no error. The fourth instance of the same shape in this feature:
 * a write path that looks complete at both ends and is not joined in the middle.
 */
export async function updateRetailerFinancials(
  id: string,
  bankDetails: RetailerBank[],
  mobileWallets: RetailerWallet[],
): Promise<void> {
  const res = await request<unknown>('PUT', `${BASE}/${encodeURIComponent(id)}/financials`, {
    auth: true,
    body: { bankDetails, mobileWallets },
  });
  if (!res.ok) {
    throw new Error(readServerMessage(res.data) ?? 'Payment details could not be saved');
  }
}

/**
 * Addresses.
 *
 * Same shape and same reasoning as the financials: a separate PUT after create,
 * because the endpoint is keyed by an id that does not exist until create
 * returns, and the body is the complete set including the omissions.
 *
 * This endpoint did not exist at all until now — the form collected addresses
 * and there was nowhere to send them.
 */
export async function updateRetailerAddresses(
  id: string,
  addresses: RetailerAddress[],
): Promise<void> {
  const res = await request<unknown>('PUT', `${BASE}/${encodeURIComponent(id)}/addresses`, {
    auth: true,
    body: { addresses },
  });
  if (!res.ok) {
    throw new Error(readServerMessage(res.data) ?? 'Addresses could not be saved');
  }
}
