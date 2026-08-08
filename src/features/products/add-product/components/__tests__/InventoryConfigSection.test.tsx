// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { InventoryConfigSection } from '../InventoryConfigSection';
import { useAddProductStore } from '../../store/useAddProductStore';
import { validateWizardStep } from '../../utils/validateWizardStep';

/**
 * The stock-out switch for a product with no sizes.
 *
 * `generalStockedOut` disabled the three inputs here and made validateStep3
 * skip them — and nothing in the console could set it. So a sizeless product
 * that was genuinely out of stock could not be recorded as one: the operator
 * either invented a stock figure or could not leave step 3. The sized path had
 * its counterpart all along, as the per-size In/Out toggle in the stock grid.
 */

const store = () => useAddProductStore.getState();
const outSwitch = () => screen.getByRole('checkbox', { name: /out of stock/i });

beforeEach(() => {
  store().reset();
  useAddProductStore.setState({ hasVariant: false, basePrice: '100', selectedSizes: [] });
});
afterEach(cleanup);

describe('a sizeless product can be marked out of stock', () => {
  it('offers a control that sets the flag', () => {
    render(<InventoryConfigSection selectedSizes={[]} />);
    expect(store().generalStockedOut).toBe(false);

    fireEvent.click(outSwitch());
    expect(store().generalStockedOut).toBe(true);
  });

  it('lets step 3 pass without inventing a stock figure', () => {
    const { rerender } = render(<InventoryConfigSection selectedSizes={[]} />);

    // Empty figures, which is the honest state for something unavailable.
    useAddProductStore.setState({ stock: '', moq: '', lowStockAlert: '' });
    expect(validateWizardStep(3, store()).isValid).toBe(false);

    fireEvent.click(outSwitch());
    rerender(<InventoryConfigSection selectedSizes={[]} />);

    expect(validateWizardStep(3, store()).isValid).toBe(true);
  });

  it('disables the figures rather than clearing them, so unticking restores them', () => {
    useAddProductStore.setState({ stock: '40', moq: '5', lowStockAlert: '3' });
    const { rerender } = render(<InventoryConfigSection selectedSizes={[]} />);

    fireEvent.click(outSwitch());
    rerender(<InventoryConfigSection selectedSizes={[]} />);

    expect((screen.getByLabelText('Stock') as HTMLInputElement).disabled).toBe(true);
    // A stock-out is a decision about availability, not an instruction to
    // forget what was in the warehouse.
    expect(store().stock).toBe('40');
  });
});

/**
 * Marking a size out used to destroy its figures, and restocking did not bring
 * them back: going out wrote '0' into stock, MOQ and the alert, and coming back
 * in only cleared the flag. isVariationStocked refuses a zero stock, so the
 * operator was blocked on a size they had just restocked and had to retype
 * three numbers they never chose to clear.
 *
 * Nothing needed writing at all — `stockedOutSizes` already records the fact,
 * and the validator skips a size that is in it.
 */
describe('marking a size out and back in does not lose its figures', () => {
  const SIZES = ['S', 'M'];

  beforeEach(() => {
    useAddProductStore.setState({
      hasVariant: false,
      basePrice: '100',
      selectedSizes: SIZES,
      sizeStockSet: { S: '40', M: '25' },
      moqSet: { S: '5', M: '5' },
      sizeLowStockAlertSet: { S: '3', M: '3' },
    });
  });

  // The row control only exists in edit mode — restocking is an edit, not
  // something you do to a product being created.
  const outToggleFor = (size: string) =>
    screen.getByRole('button', { name: new RegExp(`size ${size}$`, 'i') });

  it('keeps stock, MOQ and the alert when a size goes out', () => {
    render(<InventoryConfigSection selectedSizes={SIZES} isEditMode />);
    fireEvent.click(outToggleFor('S'));

    expect(store().stockedOutSizes).toContain('S');
    expect(store().sizeStockSet.S).toBe('40');
    expect(store().moqSet.S).toBe('5');
    expect(store().sizeLowStockAlertSet.S).toBe('3');
  });

  it('lets step 3 pass again the moment the size is restocked', () => {
    const { rerender } = render(<InventoryConfigSection selectedSizes={SIZES} isEditMode />);
    fireEvent.click(outToggleFor('S'));
    rerender(<InventoryConfigSection selectedSizes={SIZES} isEditMode />);
    fireEvent.click(outToggleFor('S'));

    expect(store().stockedOutSizes).not.toContain('S');
    // The figures are the ones the operator entered, so this is valid with no
    // retyping. Against the old behaviour S would be 0 here and step 3 blocked.
    expect(store().sizeStockSet.S).toBe('40');
    expect(validateWizardStep(3, store()).isValid).toBe(true);
  });
});

/**
 * The three keys this section is the control for had no inline renderer.
 *
 * It rendered `errors.sizes` — a STEP 2 key that validateStep3 can never
 * produce, so the line was dead — while `sizeStockSet`, `moqSet` and
 * `sizeLowStockAlertSet` reached the operator only as unlabelled entries in
 * the summary banner. "MOQ required for all active sizes" sat at the top of the
 * page with nothing connecting it to the grid that sets MOQ.
 */
describe('the size errors appear on the control that fixes them', () => {
  beforeEach(() => {
    useAddProductStore.setState({
      hasVariant: false,
      basePrice: '100',
      selectedSizes: ['S'],
      sizeStockSet: { S: '40' },
    });
  });

  it.each([
    ['moqSet', 'MOQ required for all active sizes'],
    ['sizeLowStockAlertSet', 'Alert required for all active sizes'],
    ['sizeStockSet', 'Stock required for all active sizes'],
    ['moqSetLimit', 'MOQ must be less than stock'],
  ])('renders %s inline', (key, message) => {
    render(<InventoryConfigSection selectedSizes={['S']} errors={{ [key]: message }} />);
    expect(screen.getByText(message)).toBeTruthy();
  });

  it('shows every outstanding one at once, not just the first', () => {
    render(
      <InventoryConfigSection
        selectedSizes={['S']}
        errors={{ moqSet: 'MOQ required', sizeLowStockAlertSet: 'Alert required' }}
      />,
    );
    expect(screen.getByText('MOQ required')).toBeTruthy();
    expect(screen.getByText('Alert required')).toBeTruthy();
  });
});
