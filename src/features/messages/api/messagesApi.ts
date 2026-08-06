import { z } from 'zod';
import { request } from '@/src/api/client';
import { API_V1 } from '@/src/utils/constants';

/*
 * The support queue.
 *
 * This module covers the THREAD — who opened it, what it is about, who is
 * handling it. The MESSAGES are not here: they are Firestore documents, read in
 * realtime by the client, and the wiring for that is not built yet. See
 * docs/admin/70-SUPPORT.md for the design and what it is waiting on.
 */

/*
 * Built from API_V1, not written out.
 *
 * This was `'/support'` — no version prefix. Firebase Hosting rewrites only
 * `/api/**` to Cloud Run and serves index.html for everything else, so every
 * request here returned 200 carrying the SPA's own HTML and this module parsed
 * a web page as JSON. Nothing 404'd and nothing reached the backend logs; the
 * screen simply never worked. Guard G17 now rejects an unprefixed base.
 */
const BASE = `${API_V1}/support`;

export const threadSchema = z.object({
  id: z.string(),
  type: z.string(),
  status: z.string(),
  openedById: z.string(),
  openedByName: z.string(),
  openedByKind: z.string(),
  subject: z.string().nullish(),
  lastMessage: z.string().nullish(),
  assignedToId: z.string().nullish(),
  assignedToName: z.string().nullish(),
  lastMessageAt: z.string().nullish(),
  assignedAt: z.string().nullish(),
  closedAt: z.string().nullish(),
  createdAt: z.string(),
});
export type Thread = z.infer<typeof threadSchema>;

const meta = z.object({ total: z.number(), page: z.number(), limit: z.number() });

/**
 * One queue, never both.
 *
 * `audience` is required by the server and deliberately not defaulted: a
 * retailer chasing a delivery and a supplier chasing a payout are different
 * conversations, and a blended inbox makes the person on the desk
 * context-switch on every row. A call that omits it is refused rather than
 * quietly answered with everything.
 */
export async function getThreads(
  audience: 'retailer' | 'wholesaler',
  status: string,
  assignedTo: string,
  page: number,
) {
  const qs = new URLSearchParams({ audience, status, assignedTo, page: String(page), limit: '25' });
  const res = await request<unknown>('GET', `${BASE}/threads?${qs}`, { auth: true });
  if (!res.ok) throw new Error('The support queue could not be loaded');
  const parsed = z.object({ data: z.array(threadSchema), meta }).safeParse(res.data);
  if (!parsed.success) throw new Error('The queue came back in an unexpected shape');
  return parsed.data;
}

/**
 * Claim, release, close and reopen all answer 409 when the thread is not in the
 * state the action needs — most often because a colleague got there first.
 *
 * That is the ordinary outcome of two people working one queue, not a fault, so
 * the server's sentence is surfaced verbatim: "another staff member has already
 * claimed this thread" tells the operator what happened and what to do.
 */
async function act(id: string, action: string, fallback: string): Promise<void> {
  const res = await request<unknown>('POST', `${BASE}/threads/${id}/${action}`, { auth: true });
  if (!res.ok) {
    const detail = (res.data as { error?: { message?: string } } | undefined)?.error?.message;
    throw new Error(detail ?? fallback);
  }
}

/** Waiting counts for both queues, so neither is ever unseen. */
export async function getCounts(): Promise<{ retailer: number; wholesaler: number }> {
  const res = await request<unknown>('GET', `${BASE}/counts`, { auth: true });
  if (!res.ok) throw new Error('The queue counts could not be loaded');
  const parsed = z
    .object({ data: z.object({ retailer: z.number(), wholesaler: z.number() }) })
    .safeParse(res.data);
  if (!parsed.success) throw new Error('The counts came back in an unexpected shape');
  return parsed.data.data;
}

export const claimThread = (id: string) => act(id, 'claim', 'The thread could not be claimed');
export const releaseThread = (id: string) => act(id, 'release', 'The thread could not be released');
export const closeThread = (id: string) => act(id, 'close', 'The thread could not be closed');
export const reopenThread = (id: string) => act(id, 'reopen', 'The thread could not be reopened');
