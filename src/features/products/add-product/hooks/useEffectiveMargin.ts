import { useQuery } from '@tanstack/react-query';
import { listSuppliersForPicker } from '@/src/features/wholesalers/api/wholesalerApi';
import { queryKeys } from '@/src/app/queryClient';

/*
 * THE MARGIN THAT ACTUALLY PRICES THIS PRODUCT — WHICH IS THE SUPPLIER'S, NOT
 * THE PLATFORM'S.
 *
 * Every product registered through the wizard was quoted at the wrong price.
 * Measured on dev against a real supplier:
 *
 *     cost ৳500, Mayer Doa Store   wizard said ৳547.50    stored ৳575
 *     cost ৳600, Mayer Doa Store   wizard said ৳657.00    stored ৳690
 *
 * The operator pressed "Register" on a number the catalogue then contradicted by
 * ৳27.50 a unit.
 *
 * The cause was a name. `/catalog/platform-margin` returns ONE global figure
 * (9.5), and the wizard threaded it through Step 3, the Variation Manager and
 * the Summary as though it were the rate this product would sell at. The server
 * has never priced that way: `repository.go` derives both platform_price and
 * sellingPrice from
 *
 *     ROUND(p.base_price * (1 + COALESCE(w.margin, 9.50) / 100), 2)
 *
 * — `w.margin`, the margin on the SUPPLIER row. Those two numbers coincide only
 * when a supplier happens to sit on the default, which is why this survived: of
 * the three suppliers on dev, test-01 is 9.5 and looks perfect, while Mayer Doa
 * Store is 15 and mohan is 12.
 *
 * The 9.5 fallback here is not a guess. It is the same COALESCE the SQL applies
 * when a supplier carries no margin of its own, so an unset supplier and an
 * unpriced one agree with the server rather than merely looking plausible.
 *
 * Before a supplier is chosen there is no per-supplier answer to give, so the
 * platform figure stands in — and it is correct at that point, because nothing
 * has been priced yet.
 */
export function useEffectiveMargin(wholesalerId: string, platformMargin: number): number {
  /*
   * Shares `queryKeys.wholesalers.list()` with the picker in Step 1, which is
   * fetching this exact list anyway. The wizard already asked
   * /admin/wholesalers?limit=200 five times in a single run — a sixth request
   * for a number that is sitting in the cache would be worse than the bug.
   */
  const suppliers = useQuery({
    queryKey: queryKeys.wholesalers.list(),
    queryFn: listSuppliersForPicker,
    staleTime: 10 * 60_000,
    enabled: Boolean(wholesalerId),
  });

  if (!wholesalerId) return platformMargin;

  const supplier = suppliers.data?.find((w) => w.id === wholesalerId);

  /*
   * While the list is in flight `supplier` is undefined, and the platform figure
   * is shown for a moment. That is a visibly WRONG price on a screen the
   * operator may be reading, so it must not be the last word — `useAddProductLogic`
   * re-seeds `margin` whenever this value changes, which is what settles it once
   * the supplier resolves.
   */
  return typeof supplier?.commissionRate === 'number' ? supplier.commissionRate : platformMargin;
}
