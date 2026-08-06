import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listCoupons, createCoupon } from '../api/couponsApi';
import type { CouponInput } from '../schemas/couponSchema';

const couponKeys = {
  all: ['coupons'] as const,
  list: () => [...couponKeys.all, 'list'] as const,
};

export function useCouponList() {
  return useQuery({ queryKey: couponKeys.list(), queryFn: listCoupons });
}

export function useCreateCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CouponInput) => createCoupon(input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: couponKeys.all }),
  });
}
