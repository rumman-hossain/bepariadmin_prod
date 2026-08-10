// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { VariationConfigSection } from '../VariationConfigSection';
import { useAddProductStore } from '../../store/useAddProductStore';
import type { VariationIssue } from '../../utils/validateWizardStep';

/**
 * The Variation Manager, which for a long time could not express the thing the
 * validator demanded and quietly rewrote the numbers the operator typed.
 */

const store = () => useAddProductStore.getState();

beforeEach(() => {
  store().reset();
  useAddProductStore.setState({
    hasVariant: true,
    basePrice: '100',
    selectedSizes: [],
    variations: [
      { id: 'v1', color: 'Red', subName: 'Red', subSku: 'SKU-RD', displayLabel: 'Red' },
    ],
  });
});
afterEach(cleanup);

function open() {
  render(<VariationConfigSection onGenerate={vi.fn()} effectiveMargin={10} />);
  fireEvent.click(screen.getByRole('button', { name: /manage 1 variation/i }));
}

describe('a typed zero is not rewritten', () => {
  /*
   * `Number(v) || fallback` swallows 0, because 0 is falsy. MOQ coerced a typed
   * 0 to 1 and price coerced it to undefined, so the box showed a number the
   * operator had not entered. An empty string is falsy too, so clearing a field
   * was equally impossible — it became the fallback rather than staying empty.
   *
   * The validator distinguishes "not filled in" from "filled in as zero"; this
   * collapsed both before it ever got there.
   */
  it.each([
    ['MOQ', 'moq'],
    ['Stock', 'stock'],
    ['Low-stock alert', 'lowStockAlert'],
  ])('keeps a 0 typed into %s', (label, field) => {
    open();
    fireEvent.change(screen.getByLabelText(label), { target: { value: '0' } });
    expect(store().variations[0][field as 'moq']).toBe(0);
  });

  it('leaves a cleared field absent rather than substituting a default', () => {
    open();
    const moq = screen.getByLabelText('MOQ');
    fireEvent.change(moq, { target: { value: '5' } });
    fireEvent.change(moq, { target: { value: '' } });
    expect(store().variations[0].moq).toBeUndefined();
  });
});

describe('the low-stock alert has a control at all', () => {
  // `isVariationStocked` requires it above 0 for a variant product with no
  // sizes, and nothing in the console could write it — the same shape as the
  // two blockers before it. The wholesale app has had this input all along.
  it('writes lowStockAlert onto the variation', () => {
    open();
    fireEvent.change(screen.getByLabelText('Low-stock alert'), { target: { value: '3' } });
    expect(store().variations[0].lowStockAlert).toBe(3);
  });
});

describe('stock, MOQ and the alert are not shown when sizes decide them', () => {
  /*
   * They were REDUNDANT, not merely confusing. `rollUpVariation` discards all
   * three the moment per-size inventory exists, replacing them with the grid's
   * sum / min / max — so 500 typed into Stock was saved as the sum of the cells
   * below. The panel figure does not even seed the grid.
   *
   * They stay on the no-size branch because there is no grid there, and they
   * are then the only place stock lives. That asymmetry is the whole behaviour,
   * so both directions are asserted: hiding them in the wrong branch would make
   * stock unenterable for a sized-less variant product, which is worse than the
   * bug being fixed.
   */
  const sized = () =>
    useAddProductStore.setState({ selectedSizes: ['M', 'L'] });

  it.each(['Stock', 'MOQ', 'Low-stock alert'])('hides %s once sizes exist', (label) => {
    sized();
    open();
    expect(screen.queryByLabelText(label)).toBeNull();
  });

  it('keeps Base Price, which no grid rolls up', () => {
    sized();
    open();
    expect(screen.getByLabelText('Base Price')).toBeTruthy();
  });

  it.each(['Stock', 'MOQ', 'Low-stock alert', 'Base Price'])(
    'still offers %s when there are no sizes',
    (label) => {
      open();
      expect(screen.getByLabelText(label)).toBeTruthy();
    },
  );

  it('says where the figures went instead of leaving the operator to hunt', () => {
    sized();
    open();
    expect(screen.getByText(/set per size in the grid below/i)).toBeTruthy();
  });

  it('drops the hint that apologised for the dead inputs', () => {
    sized();
    open();
    expect(screen.queryByText(/override this/i)).toBeNull();
  });
});

describe('the manager says what is wrong and where', () => {
  const issues: VariationIssue[] = [
    { variationId: 'v1', label: 'Red', field: 'moq', message: 'Must be below the stock of 20' },
  ];

  it('puts the reason on the offending field', () => {
    render(
      <VariationConfigSection onGenerate={vi.fn()} effectiveMargin={10} issues={issues} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /manage 1 variation/i }));
    expect(screen.getByText('Must be below the stock of 20')).toBeTruthy();
  });

  it('shows the validator alongside its own message rather than hiding it', () => {
    // `{alert || errorMessage}` meant this component's imperative message —
    // set on a button press, cleared only by the next successful generate —
    // hid the validator entirely while it was set.
    render(
      <VariationConfigSection
        onGenerate={vi.fn()}
        effectiveMargin={10}
        errorMessage="1 variation(s) need attention"
      />,
    );
    // Provoke the local alert.
    fireEvent.click(screen.getByRole('button', { name: /generate/i }));

    expect(screen.getByText(/complete steps 1–2/i)).toBeTruthy();
    expect(screen.getByText('1 variation(s) need attention')).toBeTruthy();
  });
});
