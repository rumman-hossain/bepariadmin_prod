import { z } from 'zod';
import { request } from '@/src/api/client';
import { API_V1 } from '@/src/utils/constants';

/*
 * Sales Brain — who the retailers are and how they are behaving.
 *
 * Every figure is counted from delivered orders. There is no stored segment and
 * no threshold in the code deciding who is valuable: value is a TERCILE of real
 * spend, and the activity window is sent by the screen so the number and its
 * definition travel together.
 *
 * The prototype defaulted every retailer to 'Active Buyer' and 'Medium
 * Potential', so someone who had never ordered was indistinguishable from the
 * best customer on the platform — on the screen the sales team uses to decide
 * who to call.
 */

/*
 * Built from API_V1, not written out.
 *
 * This was `'/crm'` — no version prefix. Firebase Hosting rewrites only
 * `/api/**` to Cloud Run and serves index.html for everything else, so every
 * request here returned 200 carrying the SPA's own HTML and this module parsed
 * a web page as JSON. Nothing 404'd and nothing reached the backend logs; the
 * screen simply never worked. Guard G17 now rejects an unprefixed base.
 */
const BASE = `${API_V1}/crm`;

export const profileSchema = z.object({
  retailerId: z.string(),
  name: z.string(),
  shopName: z.string(),
  district: z.string(),
  phone: z.string(),
  orderCount: z.number().int(),
  totalSpentMinor: z.number().int(),
  avgOrderMinor: z.number().int(),
  lastOrderAt: z.string().nullish(),
  daysSinceOrder: z.number().int().nullish(),
  valueSegment: z.string(),
  behaviourSegment: z.string(),
});
export type RetailerProfile = z.infer<typeof profileSchema>;

export const campaignSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  segmentId: z.string().nullish(),
  segmentName: z.string().nullish(),
  discountAmount: z.number().nullish(),
  message: z.string().nullish(),
  startDate: z.string(),
  endDate: z.string(),
  status: z.string(),
  createdAt: z.string(),
});
export type Campaign = z.infer<typeof campaignSchema>;

const meta = z.object({ total: z.number(), page: z.number(), limit: z.number() });

export const toTaka = (minor: number): number => minor / 100;

/** The activity window. Sent on every call — the server refuses to assume one. */
export interface Window {
  activeWithinDays: number;
  churnAfterDays: number;
}

/**
 * How long since an order before a retailer stops counting as active.
 *
 * A STARTING POINT SHOWN ON SCREEN, not a hidden constant. The operator can
 * change it and the figures move with it; the server has no default at all and
 * refuses a request that omits it. That is the difference between a definition
 * somebody chose and one a developer typed years ago.
 */
export const DEFAULT_WINDOW: Window = { activeWithinDays: 30, churnAfterDays: 90 };

function windowQuery(w: Window, extra: Record<string, string> = {}) {
  return new URLSearchParams({
    activeWithinDays: String(w.activeWithinDays),
    churnAfterDays: String(w.churnAfterDays),
    ...extra,
  });
}

export async function getRetailers(
  w: Window,
  filters: { district?: string; valueSegment?: string; behaviourSegment?: string },
  page: number,
) {
  const qs = windowQuery(w, {
    district: filters.district ?? '',
    valueSegment: filters.valueSegment ?? '',
    behaviourSegment: filters.behaviourSegment ?? '',
    page: String(page),
    limit: '25',
  });
  const res = await request<unknown>('GET', `${BASE}/retailers?${qs}`, { auth: true });
  if (!res.ok) throw new Error('Retailer profiles could not be loaded');
  const parsed = z.object({ data: z.array(profileSchema), meta }).safeParse(res.data);
  if (!parsed.success) throw new Error('Retailer profiles came back in an unexpected shape');
  return parsed.data;
}

export async function getSegmentCounts(w: Window) {
  const res = await request<unknown>('GET', `${BASE}/segment-counts?${windowQuery(w)}`, { auth: true });
  if (!res.ok) throw new Error('Segment counts could not be loaded');
  const parsed = z
    .object({
      data: z.object({
        active: z.number().int(),
        churn_risk: z.number().int(),
        inactive: z.number().int(),
        never_ordered: z.number().int(),
      }),
    })
    .safeParse(res.data);
  if (!parsed.success) throw new Error('Segment counts came back in an unexpected shape');
  return parsed.data.data;
}

export async function getCampaigns(): Promise<Campaign[]> {
  const res = await request<unknown>('GET', `${BASE}/campaigns`, { auth: true });
  if (!res.ok) throw new Error('Campaigns could not be loaded');
  const parsed = z.object({ data: z.array(campaignSchema) }).safeParse(res.data);
  if (!parsed.success) throw new Error('Campaigns came back in an unexpected shape');
  return parsed.data.data;
}

export interface CampaignInput extends Record<string, unknown> {
  name: string;
  type: string;
  message?: string;
  startDate: string;
  endDate: string;
}

export async function createCampaign(input: CampaignInput): Promise<string> {
  const res = await request<unknown>('POST', `${BASE}/campaigns`, { auth: true, body: input });
  if (!res.ok) {
    const detail = (res.data as { error?: { message?: string } } | undefined)?.error?.message;
    throw new Error(detail ?? 'The campaign could not be saved');
  }
  return (res.data as { data: { id: string } }).data.id;
}

export const VALUE_SEGMENTS = [
  { value: '', label: 'Any value' },
  { value: 'top', label: 'Top third by spend' },
  { value: 'middle', label: 'Middle third' },
  { value: 'small', label: 'Bottom third' },
  { value: 'none', label: 'Never ordered' },
];

export const BEHAVIOUR_SEGMENTS = [
  { value: '', label: 'Any activity' },
  { value: 'active', label: 'Active' },
  { value: 'churn_risk', label: 'At risk' },
  { value: 'inactive', label: 'Lapsed' },
  { value: 'never_ordered', label: 'Never ordered' },
];
