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

  const catRes = await getCategories();
  if (catRes.ok && Array.isArray(catRes.data)) {
    maps.categories = indexNodes(catRes.data);
  }

  if (raw.categoryId) {
    const subRes = await getSubCategories(raw.categoryId);
    if (subRes.ok && Array.isArray(subRes.data)) {
      maps.subCategories = indexNodes(subRes.data);
    }
  }

  if (raw.subCategoryId) {
    const groupRes = await getProductGroups(raw.subCategoryId);
    if (groupRes.ok && Array.isArray(groupRes.data)) {
      maps.productGroups = indexNodes(groupRes.data);
    }
  }

  if (raw.productGroupId) {
    const classRes = await getClassifications(raw.productGroupId);
    if (classRes.ok && Array.isArray(classRes.data)) {
      maps.classifications = indexNodes(classRes.data);
    }
  }

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
