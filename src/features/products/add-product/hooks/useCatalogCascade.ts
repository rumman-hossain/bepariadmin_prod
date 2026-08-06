import { useQuery } from '@tanstack/react-query';
import {
  getClassifications,
  getPlatformMargin,
  getProductGroups,
  getSizeConfig,
  getSubCategories,
} from '@/src/api/products';
import { queryKeys } from '@/src/app/queryClient';
import { useCategoryQuery } from '@/src/hooks/useCategoryOptions';
import type { CatalogNode, SizeConfig } from '../../types/registration';

/** Fallback used until the server's platform margin arrives. */
const DEFAULT_PLATFORM_MARGIN = 9.5;

interface ApiResult<T> {
  ok: boolean;
  status?: number;
  data: T;
}

function unwrap<T>(label: string) {
  return (res: ApiResult<T>): T => {
    if (!res.ok) {
      throw Object.assign(new Error(`Failed to load ${label}`), { status: res.status });
    }
    return res.data;
  };
}

/**
 * The category → sub-category → product group → classification cascade, plus
 * the size config and platform margin that hang off it.
 *
 * These were six `useEffect`s in `useAddProductLogic`, each writing into its own
 * `useState`, sharing one `catalogLoading` flag between them. That shape had
 * three problems beyond its size:
 *
 *   - **No request cancellation.** Changing category twice quickly left two
 *     in-flight sub-category fetches with no ordering guarantee, so the slower
 *     one won.
 *   - **A shared loading flag.** Three effects wrote `catalogLoading`, so
 *     whichever finished first cleared it while the others were still running.
 *   - **No caching.** Re-entering the wizard re-fetched the full cascade every
 *     time, even though the catalogue changes perhaps monthly.
 *
 * `enabled` expresses the dependency directly: a level simply does not run
 * until its parent id exists, and returns `[]` in the meantime.
 */
export function useCatalogCascade(ids: {
  categoryId: string;
  subCategoryId: string;
  productGroupId: string;
}) {
  // The catalogue is near-static reference data — worth a long stale time.
  const shared = { staleTime: 10 * 60_000 } as const;

  /*
   * The SHARED categories query — same key, same fetch, same shape as every
   * other consumer. It used to declare its own `queryFn` on this key, which is
   * how one key came to carry two shapes and blank the console (React #31).
   *
   * `CatalogNode` and `CategoryOption` are structurally the same rows; the
   * shared hook's `normalise()` handles every payload shape this endpoint has
   * been seen to return, which the local `unwrap` did not.
   */
  const categories = useCategoryQuery<CatalogNode[]>({
    select: (cats) => cats as CatalogNode[],
  });

  const subCategories = useQuery({
    queryKey: queryKeys.catalog.subCategories(ids.categoryId),
    queryFn: () => getSubCategories(ids.categoryId).then(unwrap<CatalogNode[]>('sub-categories')),
    enabled: Boolean(ids.categoryId),
    ...shared,
  });

  const productGroups = useQuery({
    queryKey: queryKeys.catalog.productGroups(ids.subCategoryId),
    queryFn: () =>
      getProductGroups(ids.subCategoryId).then(unwrap<CatalogNode[]>('product groups')),
    enabled: Boolean(ids.subCategoryId),
    ...shared,
  });

  const classifications = useQuery({
    queryKey: queryKeys.catalog.classifications(ids.productGroupId),
    queryFn: () =>
      getClassifications(ids.productGroupId).then(unwrap<CatalogNode[]>('classifications')),
    enabled: Boolean(ids.productGroupId),
    ...shared,
  });

  const sizeConfig = useQuery({
    queryKey: queryKeys.catalog.sizeConfig(ids.productGroupId),
    queryFn: () => getSizeConfig(ids.productGroupId).then(unwrap<SizeConfig | null>('size config')),
    enabled: Boolean(ids.productGroupId),
    ...shared,
  });

  const platformMargin = useQuery({
    queryKey: queryKeys.catalog.platformMargin(),
    queryFn: () =>
      getPlatformMargin().then((res) =>
        res.ok && res.data.marginPercent != null
          ? res.data.marginPercent
          : DEFAULT_PLATFORM_MARGIN,
      ),
    staleTime: 30 * 60_000,
  });

  return {
    categories: categories.data ?? [],
    subCategories: ids.categoryId ? (subCategories.data ?? []) : [],
    productGroups: ids.subCategoryId ? (productGroups.data ?? []) : [],
    classifications: ids.productGroupId ? (classifications.data ?? []) : [],
    sizeConfig: ids.productGroupId ? (sizeConfig.data ?? null) : null,
    platformMargin: platformMargin.data ?? DEFAULT_PLATFORM_MARGIN,

    // One flag per level would be more precise, but every consumer only ever
    // asks "is the picker still filling?" — and unlike the old shared flag,
    // this one stays true until the last level actually settles.
    catalogLoading:
      subCategories.isFetching || productGroups.isFetching || classifications.isFetching,
  };
}
