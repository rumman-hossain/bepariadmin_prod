// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react';
import { StockMatrix } from '../StockMatrix';
import { useAddProductStore } from '../../store/useAddProductStore';

/**
 * The stock grid, which is where an apparel product's numbers actually live.
 *
 * Three things have to hold, and each of them was a real defect in the form
 * this replaces:
 *
 *   - the three measures are SEPARATE. Stock, MOQ and the low-stock alert are
 *     parallel per-size maps, and editing one must not disturb the others;
 *   - "out of stock" is not zero. `stockedOutSizes` is a decision that a size
 *     is unavailable, stored apart from a quantity that happens to be nil;
 *   - a variant product writes to `variation.inventory`, a plain one writes to
 *     the maps — one grid, two backing stores, and a cell must land in the
 *     right one.
 */

const store = () => useAddProductStore.getState();

function cellFor(size: string): HTMLInputElement {
  // Cells are labelled by measure + size, which is also what a screen reader
  // reads out — so the test addresses them the way a person would.
  return screen.getByLabelText(new RegExp(`for ${size}$`, 'i')) as HTMLInputElement;
}

beforeEach(() => {
  store().reset();
});
afterEach(cleanup);

describe('a plain product writes to the per-size maps', () => {
  beforeEach(() => {
    useAddProductStore.setState({
      hasVariant: false,
      selectedSizes: ['S', 'M'],
      sizeStockSet: { S: '4', M: '6' },
      moqSet: { S: '6', M: '6' },
      sizeLowStockAlertSet: { S: '3', M: '3' },
    });
  });

  it('shows the stock figures it was given', () => {
    render(<StockMatrix />);
    expect(cellFor('S').value).toBe('4');
    expect(cellFor('M').value).toBe('6');
  });

  it('writes an edit back to sizeStockSet', () => {
    render(<StockMatrix />);
    fireEvent.change(cellFor('S'), { target: { value: '11' } });
    expect(store().sizeStockSet.S).toBe('11');
  });

  it('totals every size', () => {
    render(<StockMatrix />);
    // 4 + 6 across the row, and the same as the grand total on one row.
    expect(screen.getAllByText('10').length).toBeGreaterThan(0);
  });

  it('refuses negative stock rather than storing it', () => {
    render(<StockMatrix />);
    fireEvent.change(cellFor('S'), { target: { value: '-5' } });
    expect(store().sizeStockSet.S).toBe('0');
  });

  it('treats a cleared field as zero, not NaN', () => {
    render(<StockMatrix />);
    fireEvent.change(cellFor('S'), { target: { value: '' } });
    expect(store().sizeStockSet.S).toBe('0');
  });
});

describe('the measure switch edits one figure without disturbing the others', () => {
  beforeEach(() => {
    useAddProductStore.setState({
      hasVariant: false,
      selectedSizes: ['S'],
      sizeStockSet: { S: '4' },
      moqSet: { S: '6' },
      sizeLowStockAlertSet: { S: '3' },
    });
  });

  it('shows stock first, with the other two underneath', () => {
    render(<StockMatrix />);
    expect(cellFor('S').value).toBe('4');
    // MOQ · alert, small, under the cell.
    expect(screen.getByText('6 · 3')).toBeTruthy();
  });

  it('switches to MOQ and edits THAT map only', () => {
    render(<StockMatrix />);
    fireEvent.click(screen.getByRole('button', { name: 'MOQ' }));

    expect(cellFor('S').value).toBe('6');
    fireEvent.change(cellFor('S'), { target: { value: '12' } });

    expect(store().moqSet.S).toBe('12');
    // The point of the switch: the other two are untouched.
    expect(store().sizeStockSet.S).toBe('4');
    expect(store().sizeLowStockAlertSet.S).toBe('3');
  });

  it('switches to the low-stock alert and edits that map only', () => {
    render(<StockMatrix />);
    fireEvent.click(screen.getByRole('button', { name: /low-stock alert/i }));

    expect(cellFor('S').value).toBe('3');
    fireEvent.change(cellFor('S'), { target: { value: '9' } });

    expect(store().sizeLowStockAlertSet.S).toBe('9');
    expect(store().sizeStockSet.S).toBe('4');
    expect(store().moqSet.S).toBe('6');
  });
});

describe('stocked out is not the same as zero', () => {
  beforeEach(() => {
    useAddProductStore.setState({
      hasVariant: false,
      selectedSizes: ['S', 'M'],
      sizeStockSet: { S: '4', M: '0' },
    });
  });

  it('counts a zero as an empty cell needing attention', () => {
    render(<StockMatrix />);
    expect(screen.getByText(/1 empty cell/i)).toBeTruthy();
  });

  it('stops counting it once the size is deliberately marked out', () => {
    render(<StockMatrix />);
    // The header toggle for M.
    const header = screen.getByRole('columnheader', { name: /M/ });
    fireEvent.click(within(header).getByRole('button'));

    expect(store().stockedOutSizes).toContain('M');
    // A deliberate stock-out is not an oversight, so the warning clears.
    expect(screen.getByText(/every size stocked/i)).toBeTruthy();
  });

  it('disables the cell for a stocked-out size', () => {
    useAddProductStore.setState({ stockedOutSizes: ['M'] });
    render(<StockMatrix />);
    expect(cellFor('M').disabled).toBe(true);
  });
});

describe('a variant product writes to each variation inventory', () => {
  beforeEach(() => {
    useAddProductStore.setState({
      hasVariant: true,
      selectedSizes: ['S', 'M'],
      variations: [
        {
          id: 'v1',
          subName: 'Red',
          color: 'Red',
          subSku: 'SKU-RD',
          inventory: [
            { size: 'S', stock: 4, moq: 6, lowStockAlert: 3 },
            { size: 'M', stock: 6, moq: 6, lowStockAlert: 3 },
          ],
        },
      ],
    });
  });

  it('writes into the variation rather than the shared maps', () => {
    render(<StockMatrix />);
    fireEvent.change(cellFor('S'), { target: { value: '20' } });

    expect(store().variations[0].inventory?.find((i) => i.size === 'S')?.stock).toBe(20);
    // The non-variant maps stay empty — a variant product does not use them.
    expect(store().sizeStockSet).toEqual({});
  });

  it('creates the inventory row for a size that has none yet', () => {
    useAddProductStore.setState({
      variations: [{ id: 'v1', subName: 'Red', inventory: [] }],
    });
    render(<StockMatrix />);

    fireEvent.change(cellFor('M'), { target: { value: '7' } });
    const row = store().variations[0].inventory?.find((i) => i.size === 'M');
    expect(row?.stock).toBe(7);
    // Seeded with a usable MOQ rather than zero, which would be unorderable.
    expect(row?.moq).toBe(1);
  });

  it('labels the row by colour and design, not by internal id', () => {
    render(<StockMatrix />);
    expect(screen.getByText('Red')).toBeTruthy();
    expect(screen.getByText('SKU-RD')).toBeTruthy();
  });
});

describe('a single free size does not get a grid', () => {
  it('renders a plain row instead of a one-column table', () => {
    useAddProductStore.setState({
      hasVariant: false,
      selectedSizes: ['Free Size'],
      sizeStockSet: { 'Free Size': '25' },
    });
    render(<StockMatrix />);

    // No table at all — a totals row over one column is ceremony.
    expect(screen.queryByRole('table')).toBeNull();
    expect(cellFor('Free Size').value).toBe('25');
  });
});

describe('with no sizes chosen', () => {
  it('says what to do rather than rendering an empty grid', () => {
    useAddProductStore.setState({ selectedSizes: [] });
    render(<StockMatrix />);
    expect(screen.getByText(/choose the sizes/i)).toBeTruthy();
    expect(screen.queryByRole('table')).toBeNull();
  });
});
