// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DataTable, type Column } from '../DataTable';

afterEach(cleanup);

interface Row {
  id: string;
  name: string;
  amount: number;
}

const DATA: Row[] = [
  { id: 'a', name: 'Karim Traders', amount: 4000 },
  { id: 'b', name: 'Rahman Textiles', amount: 120 },
  { id: 'c', name: 'Alam Fabrics', amount: 900 },
];

const COLUMNS: Column<Row>[] = [
  { key: 'name', header: 'Supplier', render: (r) => r.name, sortBy: (r) => r.name },
  { key: 'amount', header: 'Amount', align: 'right', render: (r) => r.amount, sortBy: (r) => r.amount },
];

function table(props: Partial<React.ComponentProps<typeof DataTable<Row>>> = {}) {
  return render(
    <MemoryRouter>
      <DataTable columns={COLUMNS} data={DATA} rowKey={(r) => r.id} {...props} />
    </MemoryRouter>,
  );
}

describe('DataTable — reachability', () => {
  it('makes a navigable row a real link', () => {
    /*
     * `onRowClick` sat on a bare `<tr>` with no tabIndex, no role and no key
     * handler, so on both list screens the only way to open a record was a
     * mouse. A link also restores middle-click and open-in-new-tab, which
     * anyone working a queue uses constantly.
     */
    table({ rowHref: (r) => `/suppliers/${r.id}`, rowLabel: (r) => r.name });

    const link = screen.getByRole('link', { name: 'Karim Traders' });
    expect(link.getAttribute('href')).toBe('/suppliers/a');
  });

  it('gives each row exactly one tab stop, not one per cell', () => {
    // A link per cell turns a 50-row table into 100 tab stops.
    table({ rowHref: (r) => `/suppliers/${r.id}` });
    expect(screen.getAllByRole('link')).toHaveLength(DATA.length);
  });

  it('supports Enter and Space when the row acts without navigating', () => {
    const onRowClick = vi.fn();
    table({ onRowClick });

    const row = screen.getByText('Karim Traders').closest('tr')!;
    expect(row.getAttribute('tabindex')).toBe('0');

    fireEvent.keyDown(row, { key: 'Enter' });
    fireEvent.keyDown(row, { key: ' ' });
    expect(onRowClick).toHaveBeenCalledTimes(2);
  });

  it('does not double up focus handling when a link is present', () => {
    // The link is the tab stop; a tabIndex on the row as well would create two.
    const onRowClick = vi.fn();
    table({ onRowClick, rowHref: (r) => `/x/${r.id}` });
    const row = screen.getByText('Karim Traders').closest('tr')!;
    expect(row.getAttribute('tabindex')).toBeNull();
  });

  /*
   * THE CELL AN OPERATOR ACTUALLY AIMS AT.
   *
   * The link used to be an absolutely positioned SIBLING of the first cell's
   * content, with that content given `relative` so it would paint on top. It
   * did — and being on top, it swallowed the clicks meant for the link.
   * Measured on the live supplier list with `elementFromPoint`: Supplier code,
   * Category, Location, Status and Commission all landed on the link, and the
   * company name landed on a bare `<div>` with no link anywhere near it. Every
   * column opened the record except the one anybody would point at.
   *
   * The content now sits INSIDE the link, so this is expressible at all — an
   * overlay only covers anything once a browser has done layout, and jsdom
   * never does. That is why the defect shipped past a file full of link tests.
   */
  it('opens the row when the first cell’s own content is clicked', () => {
    table({ rowHref: (r) => `/suppliers/${r.id}`, rowLabel: (r) => r.name });

    const name = screen.getByText('Karim Traders');
    expect(
      name.closest('a')?.getAttribute('href'),
      'the first cell’s content is not inside the row link — clicking the ' +
        'company name does nothing, which is how this shipped',
    ).toBe('/suppliers/a');
  });

  it('leaves the other cells to the stretched pseudo-element', () => {
    /*
     * The other direction, and the reason the fix is `after:inset-0` rather
     * than a link per cell: wrapping every cell would reach the same clicks and
     * turn a 50-row table into 100 tab stops. The remaining cells carry no link
     * of their own and are covered by the one link's ::after.
     */
    table({ rowHref: (r) => `/suppliers/${r.id}` });

    const amount = screen.getByText('4000');
    expect(amount.closest('a')).toBeNull();
  });

  it('the link is not positioned, or it would only cover its own cell', () => {
    /*
     * `after:inset-0` resolves against the nearest POSITIONED ancestor, which
     * is the `<tr>`. Adding `relative` to the link makes the link itself that
     * ancestor, and the overlay shrinks back to one cell — restoring the old
     * behaviour in reverse, with five dead columns instead of one. jsdom cannot
     * see that, so the class is asserted directly.
     */
    table({ rowHref: (r) => `/suppliers/${r.id}` });

    const link = screen.getAllByRole('link')[0];
    expect(link.className).toContain('after:absolute');
    expect(link.className).toContain('after:inset-0');
    expect(link.className.split(/\s+/)).not.toContain('relative');

    const row = link.closest('tr')!;
    expect(
      row.className.split(/\s+/),
      'the row is not the positioned ancestor the overlay stretches to',
    ).toContain('relative');
  });
});

describe('DataTable — selection', () => {
  function selectable(selected: string[] = []) {
    const onSelectionChange = vi.fn();
    const utils = table({
      selectedKeys: new Set(selected),
      onSelectionChange,
      rowLabel: (r) => r.name,
    });
    return { ...utils, onSelectionChange };
  }

  it('renders no checkboxes unless selection is wired up', () => {
    table();
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
  });

  it('toggles one row', () => {
    const { onSelectionChange } = selectable();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select Karim Traders' }));
    expect(onSelectionChange.mock.calls[0]![0]).toEqual(new Set(['a']));
  });

  it('deselects a selected row', () => {
    const { onSelectionChange } = selectable(['a']);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select Karim Traders' }));
    expect(onSelectionChange.mock.calls[0]![0]).toEqual(new Set());
  });

  it('selects only the rows currently shown', () => {
    /*
     * "Select all" that reaches beyond the visible page is how a bulk action
     * lands on records nobody reviewed.
     */
    const { onSelectionChange } = selectable();
    fireEvent.click(screen.getByRole('checkbox', { name: /select all/i }));
    expect(onSelectionChange.mock.calls[0]![0]).toEqual(new Set(['a', 'b', 'c']));
  });

  it('clears everything when all are already selected', () => {
    const { onSelectionChange } = selectable(['a', 'b', 'c']);
    fireEvent.click(screen.getByRole('checkbox', { name: /clear selection/i }));
    expect(onSelectionChange.mock.calls[0]![0]).toEqual(new Set());
  });

  it('shows the header checkbox as indeterminate on a partial selection', () => {
    // Neither checked nor unchecked is the truth, and showing either is a lie
    // about what a bulk action would touch.
    selectable(['a']);
    const header = screen.getByRole('checkbox', { name: /select all/i }) as HTMLInputElement;
    expect(header.indeterminate).toBe(true);
    expect(header.checked).toBe(false);
  });

  it('marks selected rows for assistive tech', () => {
    selectable(['a']);
    const row = screen.getByText('Karim Traders').closest('tr')!;
    expect(row.getAttribute('aria-selected')).toBe('true');
  });

  it('does not fire the row action when the checkbox is clicked', () => {
    // Ticking a row to include it in a bulk action must not also open it.
    const onRowClick = vi.fn();
    render(
      <MemoryRouter>
        <DataTable
          columns={COLUMNS}
          data={DATA}
          rowKey={(r) => r.id}
          onRowClick={onRowClick}
          selectedKeys={new Set()}
          onSelectionChange={vi.fn()}
          rowLabel={(r) => r.name}
        />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select Karim Traders' }));
    expect(onRowClick).not.toHaveBeenCalled();
  });
});

describe('DataTable — sorting', () => {
  const bodyText = () =>
    within(document.querySelector('tbody')!)
      .getAllByRole('row')
      .map((r) => r.querySelector('td')!.textContent);

  it('sorts locally by default', () => {
    table();
    fireEvent.click(screen.getByRole('button', { name: /supplier/i }));
    expect(bodyText()).toEqual(['Alam Fabrics', 'Karim Traders', 'Rahman Textiles']);
  });

  it('cycles asc → desc → cleared rather than trapping the user', () => {
    table();
    const header = screen.getByRole('button', { name: /amount/i });

    fireEvent.click(header);
    expect(bodyText()[0]).toBe('Rahman Textiles'); // 120
    fireEvent.click(header);
    expect(bodyText()[0]).toBe('Karim Traders'); // 4000
    fireEvent.click(header);
    expect(bodyText()).toEqual(DATA.map((d) => d.name)); // original order
  });

  it('does not mutate the caller’s array', () => {
    const data = [...DATA];
    render(
      <MemoryRouter>
        <DataTable columns={COLUMNS} data={data} rowKey={(r) => r.id} />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: /supplier/i }));
    expect(data).toEqual(DATA);
  });

  it('announces sort state to assistive tech', () => {
    table();
    fireEvent.click(screen.getByRole('button', { name: /supplier/i }));
    expect(screen.getByRole('columnheader', { name: /supplier/i }).getAttribute('aria-sort')).toBe(
      'ascending',
    );
  });

  it('hands sorting to the caller when asked, and does not re-sort', () => {
    /*
     * Client-side sort over a server-paginated list silently orders one page
     * and looks like it worked. When the caller owns sorting, the table must
     * render exactly what it was given.
     */
    const onSortChange = vi.fn();
    table({ sort: { key: 'amount', direction: 'asc' }, onSortChange });

    expect(bodyText()).toEqual(DATA.map((d) => d.name));
    fireEvent.click(screen.getByRole('button', { name: /supplier/i }));
    expect(onSortChange).toHaveBeenCalledWith({ key: 'name', direction: 'asc' });
  });

  it('offers no sort control on an unsortable column', () => {
    render(
      <MemoryRouter>
        <DataTable
          columns={[{ key: 'name', header: 'Supplier', render: (r) => r.name }]}
          data={DATA}
          rowKey={(r) => r.id}
        />
      </MemoryRouter>,
    );
    expect(screen.queryByRole('button', { name: /supplier/i })).toBeNull();
  });
});

describe('DataTable — empty', () => {
  it('renders the caller’s empty state', () => {
    // Not built in: a table that renders its own empty state is a table that
    // disagrees with the rest of the screen.
    render(
      <MemoryRouter>
        <DataTable
          columns={COLUMNS}
          data={[]}
          rowKey={(r) => r.id}
          empty={<p>No suppliers match those filters.</p>}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText('No suppliers match those filters.')).toBeTruthy();
    expect(screen.queryByRole('table')).toBeNull();
  });
});

describe('DataTable — card mode below md', () => {
  /*
   * jsdom has no stylesheet, so it cannot tell us what the cards LOOK like —
   * that was checked in a real browser at 375px. What jsdom can pin is the
   * contract the stylesheet depends on: the attributes `.table-cards` selects
   * on. If these stop being emitted the CSS silently matches nothing and every
   * table reverts to a 6-column strip on a phone, with no test failing.
   */

  it('labels every cell with its column header', () => {
    // Without data-label the ::before renders nothing and a card becomes a
    // column of bare values with no indication of what they are.
    table();
    const cells = document.querySelectorAll('tbody td');
    expect(cells.length).toBe(DATA.length * COLUMNS.length);
    cells.forEach((td) => {
      expect(td.getAttribute('data-label')).toBeTruthy();
    });
    expect(document.querySelector('td[data-label="Amount"]')).not.toBeNull();
  });

  it('marks the first column as the card heading by default', () => {
    table();
    const first = document.querySelectorAll('tbody tr')[0]!;
    const tds = first.querySelectorAll('td');
    expect(tds[0]!.hasAttribute('data-primary')).toBe(true);
    expect(tds[1]!.hasAttribute('data-primary')).toBe(false);
  });

  it('lets a column claim the heading instead of the first', () => {
    table({
      columns: [
        { key: 'name', header: 'Supplier', render: (r: Row) => r.name },
        { key: 'amount', header: 'Amount', primary: true, render: (r: Row) => r.amount },
      ],
    });
    const tds = document.querySelectorAll('tbody tr')[0]!.querySelectorAll('td');
    expect(tds[0]!.hasAttribute('data-primary')).toBe(false);
    expect(tds[1]!.hasAttribute('data-primary')).toBe(true);
  });

  it('omits data-hide-mobile unless asked, so nothing vanishes by accident', () => {
    table();
    expect(document.querySelector('td[data-hide-mobile]')).toBeNull();

    cleanup();
    table({
      columns: [
        { key: 'name', header: 'Supplier', render: (r: Row) => r.name },
        { key: 'amount', header: 'Amount', hideOnMobile: true, render: (r: Row) => r.amount },
      ],
    });
    expect(document.querySelectorAll('td[data-hide-mobile]').length).toBe(DATA.length);
  });

  it('keeps table semantics explicit, because display:block drops them', () => {
    /*
     * `.table-cards` sets `display: block` on the table, rows and cells below
     * md. Several engines drop the implicit ARIA table roles when it does. The
     * layout is allowed to stop being a table; the semantics are not.
     */
    table();
    expect(document.querySelector('table')!.getAttribute('role')).toBe('table');
    expect(document.querySelector('tbody tr')!.getAttribute('role')).toBe('row');
    expect(document.querySelector('tbody td')!.getAttribute('role')).toBe('cell');
  });

  it('carries the class the stylesheet actually selects on', () => {
    table();
    expect(document.querySelector('table')!.className).toContain('table-cards');
    // The wrapper sheds its border and scroller in card mode.
    expect(document.querySelector('.table-cards-wrap')).not.toBeNull();
  });
});
