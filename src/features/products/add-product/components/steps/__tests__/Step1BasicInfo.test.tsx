// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, cleanup } from '@testing-library/react';
import { Step1BasicInfo } from '../Step1BasicInfo';
import { useAddProductStore } from '../../../store/useAddProductStore';
import { validateStep1 } from '../../../utils/validateWizardStep';

/**
 * EIGHT REQUIRED FIELDS, NONE OF THEM MARKED.
 *
 * `validateStep1` has always returned a keyed map — wholesalerId, name,
 * brandName, unitType, category, productGroup, classification, sku — with a
 * specific message per key. `Step1BasicInfo` took no `errors` prop at all, so
 * every one of those was rendered into a single banner at the top of the
 * scroller, above the fold, naming fields the operator then had to find. Steps
 * 2, 3 and 5 already threaded the map down to their controls.
 *
 * The messages are read from `validateStep1` rather than hard-coded, so a
 * reworded rule cannot leave this file asserting a string the operator will
 * never see.
 */

vi.mock('@/src/features/wholesalers/api/wholesalerApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/src/features/wholesalers/api/wholesalerApi')>()),
  listSuppliersForPicker: vi.fn(async () => []),
}));

const store = () => useAddProductStore.getState();

/** Every message validateStep1 produces for a blank form. */
const blankFormErrors = () => validateStep1(store()).errors;

beforeEach(() => store().reset());
afterEach(cleanup);

const renderStep = (errors?: Record<string, string>) =>
  render(withQueryClient(<Step1BasicInfo onSelect={() => {}} generatedSku="" errors={errors} />));

/*
 * Step 1 reads the supplier list through `useSupplierPickerQuery` now, so it
 * needs a client. `retry: false` keeps a failed fetch from stalling the test,
 * and a fresh client per render keeps one test's cache out of the next.
 */
function withQueryClient(ui: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return <QueryClientProvider client={client}>{ui}</QueryClientProvider>;
}

describe('step 1 shows which field is wrong', () => {
  it('renders every message validateStep1 produced', () => {
    const errors = blankFormErrors();
    // The guard against this test quietly narrowing: if a rule is added to
    // validateStep1 and not wired to a control, the count below moves and the
    // loop covers it automatically.
    expect(Object.keys(errors)).toHaveLength(8);

    renderStep(errors);
    for (const message of Object.values(errors)) {
      expect(screen.getAllByText(message).length).toBeGreaterThan(0);
    }
  });

  it('attaches the supplier message to the supplier control, not to the page', () => {
    // The banner already listed "Supplier is required" and the operator still
    // could not tell which of five identical-looking buttons it meant. What
    // makes this a field error is the association.
    renderStep(blankFormErrors());

    const supplier = screen.getByRole('button', { name: /supplier/i });
    expect(supplier.getAttribute('aria-invalid')).toBe('true');
    const describedBy = supplier.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy!)?.textContent).toBe('Supplier is required');
  });

  it('marks each cascade level the validator names and no others', () => {
    renderStep(blankFormErrors());

    for (const name of [/^category/i, /product group/i, /classification/i, /unit type/i]) {
      expect(screen.getByRole('button', { name }).getAttribute('aria-invalid')).toBe('true');
    }
    // Sub-Category is the one level validateStep1 does not require. Marking it
    // would send the operator to open a picker that will not unblock them.
    expect(
      screen.getByRole('button', { name: /sub-category/i }).getAttribute('aria-invalid'),
    ).toBeNull();
  });

  it('says where a SKU comes from, because no control on this step generates one', () => {
    // The SKU is reserved as a side effect of choosing a Classification. The
    // validator can only report that it is missing.
    renderStep(blankFormErrors());
    expect(screen.getByText('SKU must be generated')).toBeTruthy();
    expect(screen.getByText(/choosing a classification/i)).toBeTruthy();
  });

  it('still reports the SKU when it is the placeholder the payload falls back to', () => {
    // 'SKU-XXXX' renders the green "Reserved SKU" panel and is invalid. Hanging
    // the message off that panel would hide it in exactly this case.
    useAddProductStore.setState({ sku: 'SKU-XXXX' });
    renderStep(blankFormErrors());

    expect(screen.getByText('SKU-XXXX')).toBeTruthy();
    expect(screen.getByText('SKU must be generated')).toBeTruthy();
  });

  it('marks nothing when the step is valid', () => {
    renderStep({});

    for (const message of Object.values(blankFormErrors())) {
      expect(screen.queryByText(message)).toBeNull();
    }
    expect(document.querySelectorAll('[aria-invalid="true"]')).toHaveLength(0);
  });

  it('defaults to no errors when the prop is omitted entirely', () => {
    // Step 6 and the summary render this component's siblings without an
    // errors map; an undefined prop must read as "nothing wrong", not crash.
    render(withQueryClient(<Step1BasicInfo onSelect={() => {}} generatedSku="" />));
    expect(screen.queryByText('Product name is required')).toBeNull();
  });
});

describe('the description is not edited in two places', () => {
  /*
   * Step 1 and step 2 both rendered a Description box over the same
   * `description` store key — one field pretending to be two, with nothing on
   * either screen admitting the other existed.
   *
   * Step 2 keeps it, because ClassificationTemplates SEEDS the text from the
   * chosen classification: with the box on step 1 as well, the operator saw an
   * empty Description, moved on, and found it full of Bengali on step 2 that
   * they had not typed.
   */
  it('offers no Description control on step 1', () => {
    renderStep();
    expect(screen.queryByLabelText('Description')).toBeNull();
  });

  it('still carries a description through the store, untouched by step 1', () => {
    useAddProductStore.setState({ description: 'Written on step 2.' });
    renderStep();
    expect(store().description).toBe('Written on step 2.');
  });
});
