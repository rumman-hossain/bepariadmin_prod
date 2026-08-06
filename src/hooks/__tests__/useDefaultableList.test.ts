// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDefaultableList, type DefaultableItem } from '../useDefaultableList';

interface Row extends DefaultableItem {
  label: string;
}

function setup(initial: Row[]) {
  const onChange = vi.fn<(next: Row[]) => void>();
  const { result } = renderHook(() =>
    useDefaultableList<Row>(initial, onChange, (count) => ({
      label: '',
      isDefault: count === 0,
    })),
  );
  return { result, onChange };
}

describe('useDefaultableList', () => {
  it('appends a row with a stable key', () => {
    const { result, onChange } = setup([{ label: 'a', isDefault: true, _key: 'k1' }]);
    act(() => result.current.add());

    const next = onChange.mock.calls[0][0];
    expect(next).toHaveLength(2);
    expect(next[1]._key).toBeTruthy();
    // Only the first row created gets isDefault from the factory.
    expect(next[1].isDefault).toBe(false);
  });

  it('makes the first created row the default', () => {
    const { result, onChange } = setup([]);
    act(() => result.current.add());
    expect(onChange.mock.calls[0][0][0].isDefault).toBe(true);
  });

  it('promotes the next row when the default is removed', () => {
    const { result, onChange } = setup([
      { label: 'a', isDefault: true, _key: 'k1' },
      { label: 'b', isDefault: false, _key: 'k2' },
    ]);
    act(() => result.current.remove(0));

    const next = onChange.mock.calls[0][0];
    expect(next).toHaveLength(1);
    expect(next[0].label).toBe('b');
    expect(next[0].isDefault).toBe(true);
  });

  it('does NOT mutate the existing item when promoting', () => {
    // The three hand-written copies did `next[0].isDefault = true` on an array
    // produced by `filter` — which copies the array but not its elements, so
    // that assignment wrote straight into live form state, outside React.
    const rows: Row[] = [
      { label: 'a', isDefault: true, _key: 'k1' },
      { label: 'b', isDefault: false, _key: 'k2' },
    ];
    const survivor = rows[1];
    const { result } = setup(rows);

    act(() => result.current.remove(0));

    expect(survivor.isDefault).toBe(false);
    expect(rows[1].isDefault).toBe(false);
  });

  it('leaves the flag alone when a non-default row is removed', () => {
    const { result, onChange } = setup([
      { label: 'a', isDefault: true, _key: 'k1' },
      { label: 'b', isDefault: false, _key: 'k2' },
    ]);
    act(() => result.current.remove(1));
    expect(onChange.mock.calls[0][0][0].isDefault).toBe(true);
  });

  it('keeps exactly one default when promoting a different row', () => {
    const { result, onChange } = setup([
      { label: 'a', isDefault: true, _key: 'k1' },
      { label: 'b', isDefault: false, _key: 'k2' },
      { label: 'c', isDefault: false, _key: 'k3' },
    ]);
    act(() => result.current.update(2, 'isDefault', true));

    const next = onChange.mock.calls[0][0];
    expect(next.filter((r) => r.isDefault)).toHaveLength(1);
    expect(next[2].isDefault).toBe(true);
  });

  it('updates an ordinary field without touching the default flags', () => {
    const { result, onChange } = setup([
      { label: 'a', isDefault: true, _key: 'k1' },
      { label: 'b', isDefault: false, _key: 'k2' },
    ]);
    act(() => result.current.update(1, 'label', 'renamed'));

    const next = onChange.mock.calls[0][0];
    expect(next[1].label).toBe('renamed');
    expect(next[0].isDefault).toBe(true);
    expect(next[1].isDefault).toBe(false);
  });

  it('treats an absent list as empty rather than throwing', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useDefaultableList<Row>(undefined, onChange, () => ({ label: '', isDefault: true })),
    );
    expect(result.current.items).toEqual([]);
    act(() => result.current.add());
    expect(onChange.mock.calls[0][0]).toHaveLength(1);
  });
});
