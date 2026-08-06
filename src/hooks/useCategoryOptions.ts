import { useQuery } from '@tanstack/react-query';
import { getCategories } from '@/src/api/products';
import { queryKeys } from '@/src/app/queryClient';

export interface CategoryOption {
  id: string;
  name: string;
}

/**
 * The API returns the category list in one of three shapes depending on the
 * endpoint version: a bare array, `{ data: [...] }`, or `{ categories: [...] }`.
 *
 * Normalising it belongs here, not in a form component's render layer — which
 * is where 34 lines of this shape-sniffing lived, alongside three separate
 * `setState` error paths.
 */
function normalise(payload: unknown): CategoryOption[] {
  if (Array.isArray(payload)) return payload as CategoryOption[];
  if (payload && typeof payload === 'object') {
    const obj = payload as { data?: unknown; categories?: unknown };
    const nodes = obj.data ?? obj.categories;
    if (Array.isArray(nodes)) return nodes as CategoryOption[];
  }
  return [];
}

/**
 * The platform's trading categories, from the server.
 *
 * Shared by the wholesaler and retailer forms — hence `src/hooks` rather than
 * either feature folder. Nothing in here was ever wholesaler-specific; it lived
 * under `features/wholesalers` only because that is where it was first needed,
 * and copying it for retailers would have meant two normalisers drifting apart
 * the first time the endpoint changed shape.
 *
 * Shared cache key with the product feature's category lookup, so opening
 * either form after visiting the product list costs nothing.
 */
/**
 * THE ONE CATEGORIES QUERY.
 *
 * A cache key must mean exactly one shape. `queryKeys.catalog.categories()` was
 * shared by three hooks with two different `queryFn`s — two returning an ARRAY
 * of category nodes, one returning a `Record<id, name>`. Whichever mounted
 * first filled the cache and the others silently read the wrong shape, because
 * a populated cache entry inside `staleTime` never re-runs its `queryFn`.
 *
 * MEASURED ON DEV: Suppliers → Products blanked the entire console. The
 * Suppliers list cached the array; the Products screen read it as a Record and
 * did `Object.entries(array)`, which yields `[["0", {…category object}]]` — so
 * a category OBJECT became a `<option>` label, and React refused to render an
 * object as a child (error #31).
 *
 * Everything now projects from this ONE fetch with `select`. A projection
 * cannot disagree with the cache the way a second `queryFn` can: there is only
 * one stored shape, and each consumer derives what it needs from it.
 */
export function useCategoryQuery<T = CategoryOption[]>(options?: {
  select?: (categories: CategoryOption[]) => T;
}) {
  return useQuery({
    queryKey: queryKeys.catalog.categories(),
    queryFn: async () => {
      const res = await getCategories();
      if (!res.ok) {
        throw Object.assign(new Error(`Failed to load categories (${res.status})`), {
          status: res.status,
        });
      }
      return normalise(res.data);
    },
    select: options?.select,
    staleTime: 10 * 60_000,
  });
}

/** The categories as a list, for pickers and filter dropdowns. */
export function useCategoryOptions() {
  const { data, isPending, error, refetch } = useCategoryQuery();

  /*
   * Belt and braces on the shape.
   *
   * `select` guarantees this is an array today. The check costs nothing and
   * means that if anything ever writes a different shape to this key again —
   * `setQueryData`, a stale persisted cache, a merge gone wrong — a picker
   * renders empty rather than throwing `categories.map is not a function` and
   * taking the screen down.
   */
  const categories = Array.isArray(data) ? data : [];

  return {
    categories,
    isLoading: isPending,
    // An empty list is not an error, but it IS worth saying out loud — a
    // category picker with nothing in it otherwise looks broken.
    error: error
      ? error.message
      : !isPending && categories.length === 0
        ? 'No categories are configured on the server yet.'
        : null,
    refetch: () => void refetch(),
  };
}
