import { z } from 'zod';

/**
 * The coupon contract, written from the SERVER.
 *
 * Source: `beparibd-backend/internal/coupon/coupon.go` — `type Coupon struct`.
 *
 * It differs from the prototype's `Coupon` in ways that would have broken a
 * screen written from the prototype:
 *
 *   - `type` is **"percent"**, not "percentage".
 *   - There is no `status`. Active/expired is derived from `expiresAt`.
 *   - There is no `usedCount` and no `usageLimit`. The only usage field is
 *     `maxUsesPerUser`, and nothing records redemptions — so that limit cannot
 *     currently be enforced or reported on (F-07).
 *   - `wholesalerId` and `categoryId` are `*string` with `omitempty`, so they
 *     are absent from the payload rather than null.
 */

export const COUPON_TYPES = ['percent', 'fixed'] as const;
export type CouponType = (typeof COUPON_TYPES)[number];

export const couponSchema = z.object({
  id: z.string(),
  code: z.string(),
  type: z.enum(COUPON_TYPES),
  value: z.number(),
  minOrder: z.number(),
  maxUsesPerUser: z.number(),
  wholesalerId: z.string().optional(),
  categoryId: z.string().optional(),
  expiresAt: z.string(),
  createdAt: z.string(),
});

export type Coupon = z.infer<typeof couponSchema>;

export const couponListSchema = z.object({ data: z.array(couponSchema) });
export const couponDetailSchema = z.object({ data: couponSchema });

/**
 * What `POST /coupons/` accepts.
 *
 * `value` is validated against `type` with a refinement rather than a flat
 * `min`: a percentage above 100 gives the customer money back, and a fixed
 * discount larger than the minimum order does the same thing more quietly. Both
 * are the sort of mistake that is only obvious after it has been redeemed.
 */
export const couponInputSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(3, 'Code must be at least 3 characters')
      .regex(/^[A-Z0-9-]+$/, 'Use capital letters, digits and hyphens only'),
    type: z.enum(COUPON_TYPES),
    value: z.number({ message: 'Value is required' }).positive('Value must be greater than zero'),
    minOrder: z.number({ message: 'Minimum order is required' }).nonnegative(),
    maxUsesPerUser: z.number().int().positive('Must be at least 1'),
    expiresAt: z.string().min(1, 'Expiry date is required'),
  })
  .refine((c) => c.type !== 'percent' || c.value <= 100, {
    message: 'A percentage discount cannot exceed 100%',
    path: ['value'],
  })
  .refine((c) => c.type !== 'fixed' || c.minOrder === 0 || c.value <= c.minOrder, {
    message: 'A fixed discount larger than the minimum order pays the customer',
    path: ['value'],
  })
  .refine((c) => new Date(c.expiresAt).getTime() > Date.now(), {
    message: 'Expiry must be in the future',
    path: ['expiresAt'],
  });

export type CouponInput = z.infer<typeof couponInputSchema>;

/** Expired is a fact about the clock, not a stored field. */
export function isExpired(coupon: Coupon, now: number = Date.now()): boolean {
  return new Date(coupon.expiresAt).getTime() <= now;
}
