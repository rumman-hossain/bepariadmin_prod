import { useCallback, useMemo } from 'react';

/** A row that can be flagged as the default, with a stable client-side key. */
export interface DefaultableItem {
  isDefault?: boolean;
  _key?: string;
}

export interface DefaultableListApi<T> {
  items: T[];
  add: () => void;
  remove: (index: number) => void;
  update: (index: number, key: string, value: string | boolean) => void;
}

/**
 * Add / remove / update for a list where exactly one row is the default.
 *
 * `WholesalerForm` had this algorithm written out three times — for addresses,
 * bank accounts and digital wallets — about 90 lines of byte-identical logic
 * differing only in the field name and the shape of a new row.
 *
 * It also fixes a real defect the copies shared:
 *
 *     const next = list.filter((_, i) => i !== index);
 *     if (list[index]?.isDefault && next.length > 0) {
 *       next[0].isDefault = true;   // <-- mutates the existing object
 *     }
 *
 * `filter` copies the array but not its elements, so `next[0]` is the very same
 * object still held in form state. Assigning to it mutated state in place,
 * outside React — which meant the promotion could be missed on re-render, and
 * would be silently lost by anything relying on reference equality.
 */
export function useDefaultableList<T extends DefaultableItem>(
  items: T[] | undefined,
  onChange: (next: T[]) => void,
  createItem: (currentCount: number) => Omit<T, '_key'>,
): DefaultableListApi<T> {
  const list = useMemo(() => items ?? [], [items]);

  const add = useCallback(() => {
    const created = { ...createItem(list.length), _key: crypto.randomUUID() } as T;
    onChange([...list, created]);
  }, [list, onChange, createItem]);

  const remove = useCallback(
    (index: number) => {
      const removedWasDefault = list[index]?.isDefault === true;
      const next = list.filter((_, i) => i !== index);

      // Replace the object rather than mutating it, so form state is never
      // written to behind React's back.
      if (removedWasDefault && next.length > 0) {
        next[0] = { ...next[0], isDefault: true };
      }
      onChange(next);
    },
    [list, onChange],
  );

  const update = useCallback(
    (index: number, key: string, value: string | boolean) => {
      const promotingToDefault = key === 'isDefault' && value === true;

      onChange(
        list.map((item, i) => {
          if (i === index) return { ...item, [key]: value };
          // Exactly one default: promoting one row demotes the rest.
          return promotingToDefault ? { ...item, isDefault: false } : item;
        }),
      );
    },
    [list, onChange],
  );

  return { items: list, add, remove, update };
}
