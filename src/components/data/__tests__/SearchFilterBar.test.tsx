// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, screen, fireEvent } from '@testing-library/react';
import { SearchFilterBar } from '../SearchFilterBar';

/**
 * A SELECT MUST CONTAIN AN OPTION EQUAL TO ITS VALUE.
 *
 * MEASURED ON DEV, on `/wholesalers`, and it is the reason this file exists.
 *
 * The supplier screen passed real option values with the empty string for "no
 * filter" and no option carrying it. The browser did what it always does with a
 * value it cannot find — displayed the FIRST option — so the filter bar read
 *
 *     Gents Textile · Dhaka · Standard 9.5% · Last 7 days · All four on file
 *
 * over a completely unfiltered table, one of whose two rows was a supplier with
 * no district and four missing certificates.
 *
 * Two failures, one cause:
 *
 *   1. the screen showed filters it was not applying;
 *   2. those first options were UNPICKABLE, because choosing the option that is
 *      already selected fires no `change` event. Category "Gents Textile" and
 *      district "Dhaka" could not be filtered for at all.
 *
 * The retailer screen had it too, on the same day, for the same reason.
 */

afterEach(cleanup);

const CATEGORY = {
  key: 'category',
  label: 'Category',
  options: [
    { label: 'Gents Textile', value: 'Gents Textile' },
    { label: 'Ladies Textile', value: 'Ladies Textile' },
  ],
};

function bar(value: string, onChange = vi.fn()) {
  render(
    <SearchFilterBar
      searchTerm=""
      onSearchChange={() => {}}
      filters={[{ ...CATEGORY, value, onChange }]}
      onClearAll={() => {}}
    />,
  );
  return { select: screen.getByLabelText('Category') as HTMLSelectElement, onChange };
}

describe('a filter with nothing selected', () => {
  it('does not display an option it is not applying', () => {
    /*
     * The whole bug in one line. `selectedIndex === 0` with the first real
     * option showing is what the browser falls back to, and it is a lie the
     * screen tells confidently.
     */
    const { select } = bar('');
    expect(select.value).toBe('');
    expect(select.selectedOptions[0]?.textContent).not.toBe('Gents Textile');
  });

  it('offers a neutral option, named by the field itself', () => {
    const { select } = bar('');
    expect(select.selectedOptions[0]?.textContent).toBe('Category');
  });

  it('lets a screen word its own neutral', () => {
    /*
     * Deriving it read "All joined" and "All registered by" on the supplier
     * screen. The label is the one wording that stays grammatical for every
     * field, so it is the default and anything better is the caller's to say.
     */
    render(
      <SearchFilterBar
        searchTerm=""
        onSearchChange={() => {}}
        filters={[{ ...CATEGORY, value: '', allLabel: 'All categories', onChange: () => {} }]}
      />,
    );
    expect((screen.getByLabelText('Category') as HTMLSelectElement).selectedOptions[0]?.textContent).toBe(
      'All categories',
    );
  });

  it('leaves the FIRST real option selectable', () => {
    /*
     * The consequence nobody would have reported as a bug — they would have
     * said "the category filter doesn't work sometimes". Without a neutral
     * option, picking the first one is a no-op event the browser never fires.
     */
    const { select } = bar('');
    expect(Array.from(select.options).map((o) => o.value)).toContain('Gents Textile');
    expect(select.options[0].value).not.toBe('Gents Textile');
  });
});

describe('a filter that IS set', () => {
  it('shows the value it is applying', () => {
    const { select } = bar('Ladies Textile');
    expect(select.value).toBe('Ladies Textile');
  });

  it('keeps offering the way back to the whole directory', () => {
    /*
     * Caught by this test failing against my own first fix, which supplied the
     * neutral option only when the value matched nothing. That repaired the
     * display and left a dropdown you could enter and not leave: once a
     * category was picked, the only route back was Clear — which discards every
     * OTHER filter with it.
     */
    const { select } = bar('Ladies Textile');
    expect(Array.from(select.options).map((o) => o.value)).toContain('');
  });

  it('offers the neutral option exactly once', () => {
    const { select } = bar('Ladies Textile');
    expect(Array.from(select.options).filter((o) => o.value === '')).toHaveLength(1);
  });

  it('can be cleared back to nothing', () => {
    const { select, onChange } = bar('Ladies Textile');
    fireEvent.change(select, { target: { value: '' } });
    expect(onChange).toHaveBeenCalledWith('');
  });
});

describe("a screen that spells no-filter 'All'", () => {
  /*
   * The product screen carries its own `{label: 'All Statuses', value: 'All'}`
   * and threads that sentinel through its types, its query mapping and its
   * tests. Forcing the empty string on it here would have been a rewrite of a
   * screen that works, so the component restores the invariant only where it is
   * broken.
   */
  it('is left exactly as it was', () => {
    render(
      <SearchFilterBar
        searchTerm=""
        onSearchChange={() => {}}
        filters={[
          {
            key: 'status',
            label: 'Status',
            value: 'All',
            options: [
              { label: 'All Statuses', value: 'All' },
              { label: 'Active', value: 'Active' },
            ],
            onChange: () => {},
          },
        ]}
      />,
    );
    const select = screen.getByLabelText('Status') as HTMLSelectElement;
    expect(select.options).toHaveLength(2);
    expect(select.selectedOptions[0]?.textContent).toBe('All Statuses');
  });
});

describe('the Clear affordance', () => {
  it('stays hidden when nothing is filtered', () => {
    /*
     * `f.value !== 'All'` was true for every empty-string filter, so a virgin
     * supplier screen offered to clear filters it did not have. An affordance
     * that is always on is an affordance nobody reads.
     */
    bar('');
    expect(screen.queryByRole('button', { name: /clear/i })).toBeNull();
  });

  it('appears once something is', () => {
    bar('Ladies Textile');
    expect(screen.getByRole('button', { name: /clear/i })).toBeTruthy();
  });

  it('is not fooled by the All sentinel either', () => {
    render(
      <SearchFilterBar
        searchTerm=""
        onSearchChange={() => {}}
        filters={[
          { key: 's', label: 'Status', value: 'All', options: [{ label: 'All', value: 'All' }], onChange: () => {} },
        ]}
        onClearAll={() => {}}
      />,
    );
    expect(screen.queryByRole('button', { name: /clear/i })).toBeNull();
  });
});

describe('every filter is named to a screen reader', () => {
  it('does not rely on the shared decorative "Filters:" chip', () => {
    // Seven adjacent selects called nothing is what a screen reader had.
    bar('');
    expect(screen.getByLabelText('Category')).toBeTruthy();
  });
});
