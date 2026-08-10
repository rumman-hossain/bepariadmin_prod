import type { Wholesaler } from '@/src/types/domain';

/**
 * How a supplier is named wherever one is listed or chosen.
 *
 * There were two renderings of the same row. The product-list filter built
 * `WHL-00007 · mohan`; the wizard's picker printed the name and the code as two
 * adjacent spans with only an `ml-2` between them, which reads correctly on
 * screen but concatenates to `mohanWHL-00007` in the accessibility tree and in
 * anything else that takes the text rather than the pixels.
 *
 * The code leads because it is what the SKU carries and what an operator
 * matches a row against. Suppliers created before codes existed have none, so
 * the name has to stand alone rather than trail a separator with nothing before
 * it.
 */
export function supplierLabel(w: Pick<Wholesaler, 'id' | 'code' | 'companyName'>): string {
  const name = w.companyName || w.id;
  return w.code ? `${w.code} · ${name}` : name;
}
