import { z } from 'zod';
import { request } from '@/src/api/client';
import { API_V1 } from '@/src/utils/constants';

/*
 * The loyalty programme.
 *
 * One thing shapes every call here: the programme can be UNCONFIGURED. Nobody
 * has chosen an earning rate, so no settings row exists, so nothing is awarded.
 * `GET /settings` answers 404 for that, and it is a real answer rather than a
 * failure — `getSettings` returns null, and the screen says the programme is
 * not running.
 *
 * An empty object would have been the easy shape to return, and it would have
 * read as "configured, with every rate at zero" — a programme that is running
 * and awarding nothing. Those are different facts and the operator needs the
 * difference.
 */

/*
 * Built from API_V1, not written out.
 *
 * This was `'/loyalty'` — no version prefix. Firebase Hosting rewrites only
 * `/api/**` to Cloud Run and serves index.html for everything else, so every
 * request here returned 200 carrying the SPA's own HTML and this module parsed
 * a web page as JSON. Nothing 404'd and nothing reached the backend logs; the
 * screen simply never worked. Guard G17 now rejects an unprefixed base.
 */
const BASE = `${API_V1}/loyalty`;

export const settingsSchema = z.object({
  earnTakaPerPoint: z.number().int(),
  redeemPaisaPerPoint: z.number().int(),
  minRedeemPoints: z.number().int(),
  referralPoints: z.number().int(),
  silverAt: z.number().int(),
  goldAt: z.number().int(),
  platinumAt: z.number().int(),
  updatedAt: z.string(),
});
export type LoyaltySettings = z.infer<typeof settingsSchema>;

export const summarySchema = z.object({
  configured: z.boolean(),
  membersWithPoints: z.number().int(),
  outstandingPoints: z.number().int(),
  outstandingValueMinor: z.number().int(),
  pointsEarnedTotal: z.number().int(),
  pointsRedeemedTotal: z.number().int(),
  referralsPending: z.number().int(),
  referralsRewarded: z.number().int(),
  byTier: z.array(z.number().int()),
});
export type LoyaltySummary = z.infer<typeof summarySchema>;

export const balanceSchema = z.object({
  retailerId: z.string(),
  balance: z.number().int(),
  tier: z.string(),
  totalEarned: z.number().int(),
  totalRedeemed: z.number().int(),
  updatedAt: z.string(),
  retailerName: z.string(),
  shopName: z.string(),
  phone: z.string(),
});
export type RetailerBalance = z.infer<typeof balanceSchema>;

export const pointsEntrySchema = z.object({
  id: z.string(),
  retailerId: z.string(),
  points: z.number().int(),
  event: z.string(),
  orderId: z.string().nullish(),
  note: z.string().nullish(),
  createdAt: z.string(),
});
export type PointsEntry = z.infer<typeof pointsEntrySchema>;

export const referralSchema = z.object({
  id: z.string(),
  referrerId: z.string(),
  referrerName: z.string(),
  refereeId: z.string(),
  refereeName: z.string(),
  status: z.string(),
  rewardPoints: z.number().int().nullish(),
  qualifyingOrderId: z.string().nullish(),
  rewardedAt: z.string().nullish(),
  createdAt: z.string(),
});
export type Referral = z.infer<typeof referralSchema>;

const meta = z.object({ total: z.number(), page: z.number(), limit: z.number() });

/** Paisa to taka. The only place the conversion happens on this feature. */
export const toTaka = (minor: number): number => minor / 100;

async function get<T>(path: string, schema: z.ZodType<T>, what: string): Promise<T> {
  const res = await request<unknown>('GET', `${BASE}${path}`, { auth: true });
  if (!res.ok) throw new Error(`${what} could not be loaded`);
  const parsed = schema.safeParse(res.data);
  if (!parsed.success) throw new Error(`${what} came back in an unexpected shape`);
  return parsed.data;
}

/**
 * Returns null when the programme has never been configured.
 *
 * null is not an error and not an empty settings object. It means no rate has
 * been chosen, so nothing is being awarded — which is the single most important
 * thing this screen has to be able to say.
 */
export async function getSettings(): Promise<LoyaltySettings | null> {
  const res = await request<unknown>('GET', `${BASE}/admin/settings`, { auth: true });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('The programme settings could not be loaded');
  const parsed = z.object({ data: settingsSchema }).safeParse(res.data);
  if (!parsed.success) throw new Error('The settings came back in an unexpected shape');
  return parsed.data.data;
}

export interface SettingsInput extends Record<string, unknown> {
  earnTakaPerPoint: number;
  redeemPaisaPerPoint: number;
  minRedeemPoints: number;
  referralPoints: number;
  silverAt: number;
  goldAt: number;
  platinumAt: number;
}

export async function saveSettings(input: SettingsInput): Promise<void> {
  const res = await request<unknown>('PUT', `${BASE}/admin/settings`, { auth: true, body: input });
  if (!res.ok) {
    const detail = (res.data as { error?: { message?: string } } | undefined)?.error?.message;
    throw new Error(detail ?? 'The settings could not be saved');
  }
}

export const getSummary = () =>
  get('/admin/summary', z.object({ data: summarySchema }), 'The programme summary').then((r) => r.data);

export const getBalances = (page: number) =>
  get(
    `/admin/balances?page=${page}&limit=25`,
    z.object({ data: z.array(balanceSchema).nullable(), meta }),
    'Retailer balances',
  );

export const getPoints = (retailerId: string, event: string, page: number) =>
  get(
    `/admin/points?retailerId=${encodeURIComponent(retailerId)}&event=${encodeURIComponent(event)}&page=${page}&limit=25`,
    z.object({ data: z.array(pointsEntrySchema).nullable(), meta }),
    'The points ledger',
  );

export const getReferrals = (status: string, page: number) =>
  get(
    `/admin/referrals?status=${encodeURIComponent(status)}&page=${page}&limit=25`,
    z.object({ data: z.array(referralSchema).nullable(), meta }),
    'Referrals',
  );

export interface AdjustmentInput extends Record<string, unknown> {
  retailerId: string;
  /** Signed: positive adds, negative deducts. One field, so it cannot disagree with itself. */
  points: number;
  note: string;
}

export async function adjustPoints(input: AdjustmentInput): Promise<void> {
  const res = await request<unknown>('POST', `${BASE}/admin/adjustments`, { auth: true, body: input });
  if (!res.ok) {
    // 422 is the expected refusal — most often a deduction that would take the
    // balance below zero. The server's message names the reason, so it is shown
    // rather than replaced with something generic.
    const detail = (res.data as { error?: { message?: string } } | undefined)?.error?.message;
    throw new Error(detail ?? 'The adjustment could not be applied');
  }
}
