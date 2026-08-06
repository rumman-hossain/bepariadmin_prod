import { request } from '@/src/api/client';
import {
  couponListSchema,
  couponDetailSchema,
  type Coupon,
  type CouponInput,
} from '../schemas/couponSchema';

/**
 * Coupon API.
 *
 * Exactly two routes exist for managing coupons — `GET /coupons/` and
 * `POST /coupons/`. There is **no PATCH and no DELETE**, so a coupon cannot be
 * edited or withdrawn once created; the only way to stop one is to let it
 * expire. The screen states that rather than offering an Edit button that would
 * 404.
 *
 * `POST /coupons/validate` also exists, but it is the buyer-side check ("is this
 * code good for this order") and has no place in an admin console.
 *
 * The list is unpaginated — `GET /coupons/` returns `{ data: [...] }`. Coupon
 * counts are small, so filtering in the browser is honest here, and the screen
 * says so.
 */

const BASE = '/api/v1/coupons/';

export async function listCoupons(): Promise<Coupon[]> {
  const res = await request<unknown>('GET', BASE, { auth: true });
  if (!res.ok) throw new Error('Coupons could not be loaded');
  return couponListSchema.parse(res.data).data;
}

export async function createCoupon(input: CouponInput): Promise<Coupon> {
  const res = await request<unknown>('POST', BASE, { auth: true, body: input });
  if (!res.ok) {
    // A duplicate code is the one failure an operator can act on, so it is
    // named rather than folded into a generic message.
    throw new Error(
      res.status === 409
        ? 'That code is already in use. Choose another.'
        : 'The coupon could not be created',
    );
  }
  return couponDetailSchema.parse(res.data).data;
}
