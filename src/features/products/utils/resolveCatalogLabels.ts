/**
 * Resolves catalog UUIDs on a backend product to human-readable names.
 */
import {
  getCategories,
  getSubCategories,
  getProductGroups,
  getClassifications,
  getReservedSku,
} from '@/src/api/products';
import { getWholesaler } from '@/src/features/wholesalers/api/wholesalerApi';
import type { BackendProduct } from './mapProduct';

export interface CatalogLabelMaps {
  categories: Record<string, string>;
  subCategories: Record<string, string>;
  productGroups: Record<string, string>;
  classifications: Record<string, string>;
  productDetails: Record<string, string>;
}

export const EMPTY_CATALOG_LABELS: CatalogLabelMaps = {
  categories: {},
  subCategories: {},
  productGroups: {},
  classifications: {},
  productDetails: {},
};

function indexNodes(nodes: Array<{ id: string; name: string }> | undefined): Record<string, string> {
  const map: Record<string, string> = {};
  if (!nodes) return map;
  for (const node of nodes) {
    if (node.id && node.name) map[node.id] = node.name;
  }
  return map;
}

/** Walk the catalog hierarchy and build id → name maps for all levels on a product. */
export async function resolveProductCatalogLabels(raw: BackendProduct): Promise<CatalogLabelMaps> {
  const maps: CatalogLabelMaps = {
    categories: {},
    subCategories: {},
    productGroups: {},
    classifications: {},
    productDetails: {},
  };

  /*
   * These four ran sequentially, but none of them depends on another's RESULT —
   * their inputs (`categoryId`, `subCategoryId`, `productGroupId`) all come
   * from the already-fetched product. Awaiting them one at a time turned the
   * product detail screen into 7 round trips where 3 suffice: roughly 1,050 ms
   * on a 150 ms RTT versus 450 ms.
   *
   *
   * `allSettled`, not `all`: a missing sub-category should not take out the
   * category labels too. Each map independently falls back to empty.
   */
  const [catRes, subRes, groupRes, classRes] = await Promise.allSettled([
    getCategories(),
    raw.categoryId ? getSubCategories(raw.categoryId) : null,
    raw.subCategoryId ? getProductGroups(raw.subCategoryId) : null,
    raw.productGroupId ? getClassifications(raw.productGroupId) : null,
  ]);

  /** Reads a settled catalog response into an id → name map. */
  function toMap(
    settled: PromiseSettledResult<{ ok: boolean; data?: unknown } | null>,
  ): Record<string, string> {
    if (settled.status !== 'fulfilled' || !settled.value) return {};
    const { ok, data } = settled.value;
    return ok && Array.isArray(data) ? indexNodes(data as Array<{ id: string; name: string }>) : {};
  }

  maps.categories = toMap(catRes);
  maps.subCategories = toMap(subRes);
  maps.productGroups = toMap(groupRes);
  maps.classifications = toMap(classRes);

  // This one genuinely IS sequential: the SKU lookup needs the wholesaler's
  // code, which only the wholesaler fetch provides.
  if (raw.classificationId && raw.wholesalerId) {
    try {
      const wholesaler = await getWholesaler(raw.wholesalerId);
      const code = wholesaler.code?.trim();
      if (code) {
        const skuRes = await getReservedSku({
          wholesalerCode: code,
          categoryId: raw.categoryId ?? '',
          subCategoryId: raw.subCategoryId ?? '',
          productGroupId: raw.productGroupId ?? '',
          classificationId: raw.classificationId,
        });
        const details = skuRes.ok ? skuRes.data.details : undefined;
        if (Array.isArray(details)) {
          for (const item of details) {
            const row = item as { id?: string; name?: string };
            if (row.id && row.name) maps.productDetails[row.id] = row.name;
          }
        }
      }
    } catch {
      /* product detail names are optional */
    }
  }

  return maps;
}

export function mergeCatalogLabels(
  base: CatalogLabelMaps,
  categoryNames: Record<string, string> = {},
): CatalogLabelMaps {
  return {
    categories: { ...categoryNames, ...base.categories },
    subCategories: base.subCategories,
    productGroups: base.productGroups,
    classifications: base.classifications,
    productDetails: base.productDetails,
  };
}
