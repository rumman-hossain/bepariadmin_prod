import type { ProductVariation } from '../../types/registration';

/** Resolve variant flag — edit hydrate may leave null when backend omits hasVariant. */
export function resolveHasVariant(
  hasVariant: boolean | null,
  variations: ProductVariation[] = [],
): boolean {
  if (hasVariant === true || hasVariant === false) return hasVariant;
  return variations.length > 0;
}
