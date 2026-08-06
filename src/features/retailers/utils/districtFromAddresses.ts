import type { RetailerAddress } from '../components/RetailerForm';

/**
 * The district a shop belongs to, taken from its addresses.
 *
 * # Why this exists
 *
 * The register form used to ask for the district TWICE: once as a free-text
 * field of its own, and again — as a picker, against the canonical list — on
 * every address. The free-text one is gone.
 *
 * But `users.retailers.district` is still a real column: the list screen filters
 * on it, the detail screen shows it, and segmentation reads it. Dropping the
 * field without replacing the value would leave every newly registered shop with
 * an empty district and invisible to that filter.
 *
 * So it is derived from the answer that was actually validated against a list,
 * rather than the one somebody typed. "Dhaka " and "dhaka" cannot happen here.
 *
 * # Which address
 *
 * The default one. A shop with a second address has marked one as its default,
 * and that is the shop's own answer to "where are you". Falling back to the
 * first is for the ordinary case where there is only one and nothing is marked.
 */
export function districtFromAddresses(addresses: RetailerAddress[] | undefined): string {
  if (!addresses?.length) return '';

  const chosen = addresses.find((a) => a.isDefault) ?? addresses[0];
  return chosen.district?.trim() ?? '';
}
