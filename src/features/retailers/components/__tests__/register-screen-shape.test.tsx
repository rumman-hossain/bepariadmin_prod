// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { RetailerForm, type RetailerFormValues } from '../RetailerForm';

/**
 * The shape of the register screen, as asked for.
 *
 * Rendered rather than read, because every one of these is a claim about what
 * an operator sees. "I deleted the District field" is only true if the field is
 * not on screen.
 */

// Each `render` leaves its DOM behind without this, so the second test in a
// file finds two of everything.
afterEach(cleanup);

vi.mock('../CategoryPicker', () => ({
  // The real one fetches categories from the backend; this file is about layout.
  CategoryPicker: () => <div data-testid="category-picker" />,
}));

const EMPTY: RetailerFormValues = {
  name: '',
  shopName: '',
  phone: '',
  email: '',
  district: '',
  category: '',
  password: '',
  addresses: [],
  bankDetailsList: [],
  digitalWallets: [],
};

function renderForm(mode: 'create' | 'edit' = 'create', values: Partial<RetailerFormValues> = {}) {
  return render(
    <RetailerForm
      mode={mode}
      values={{ ...EMPTY, ...values }}
      errors={{}}
      onChange={() => {}}
      pendingDocs={{}}
      onDocSelected={() => () => {}}
      missingRequired={[]}
    />,
  );
}

describe('the District field is gone', () => {
  it('does not ask for a district of its own', () => {
    renderForm();
    // It was asked twice — here as free text, and again as a validated picker on
    // every address. The free-text one always lost: "Dhaka " filed a shop the
    // district filter could not find.
    expect(screen.queryByLabelText(/^District/i)).toBeNull();
  });

  it('and the section it lived in no longer claims to be about location', () => {
    renderForm();
    expect(screen.queryByRole('heading', { name: /where it is/i })).toBeNull();
  });

  it('but the categories it shared a section with are still there', () => {
    // Deleting the section wholesale would have taken the category picker with
    // it, and categories are required.
    renderForm();
    expect(screen.getByTestId('category-picker')).toBeTruthy();
  });
});

describe('section order', () => {
  it('puts the assessment BEFORE the uploads', () => {
    const { container } = renderForm();
    const text = container.textContent ?? '';

    const assessment = text.indexOf('Analytical details');
    const documents = text.indexOf('Documents Upload');

    expect(assessment).toBeGreaterThan(-1);
    expect(documents).toBeGreaterThan(-1);
    // Everything above the uploads is typed; the uploads are the one section
    // that finishes over the network. An optional typed section buried beneath
    // them is one an operator scrolls past.
    expect(assessment).toBeLessThan(documents);
  });
});

describe('the password field', () => {
  it('offers a way to see what was typed', () => {
    // This is an admin typing a credential FOR SOMEONE ELSE, and the only moment
    // the value is ever visible — it is hashed in the browser and cannot be read
    // back. Unable to check it, a typo becomes "they cannot sign in".
    renderForm('create');
    expect(screen.getByRole('button', { name: /show/i })).toBeTruthy();
  });

  it('starts hidden', () => {
    renderForm('create');
    const toggle = screen.getByRole('button', { name: /show/i });
    // Someone else may be looking at the screen. The default is the safe one.
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
  });

  it('actually reveals the value when pressed', () => {
    /*
     * The assertion that matters, and the one I nearly left out.
     *
     * Checking only that the button exists and reports aria-pressed passes
     * against a toggle wired to nothing — mutation M70 replaced the input's
     * `type={revealed ? 'text' : 'password'}` with a hardcoded 'password' and
     * broke no test. The button flipped its own label over a field that stayed
     * masked, which is worse than having no button at all.
     */
    renderForm('create', { password: 'Correct-Horse-9' });
    const field = screen.getByLabelText(/password/i) as HTMLInputElement;
    expect(field.type).toBe('password');

    fireEvent.click(screen.getByRole('button', { name: /show/i }));
    expect(field.type).toBe('text');
    expect(field.value).toBe('Correct-Horse-9');

    fireEvent.click(screen.getByRole('button', { name: /hide/i }));
    expect(field.type).toBe('password');
  });

  it('is not offered on edit, where resetting is its own action', () => {
    renderForm('edit');
    expect(screen.queryByRole('button', { name: /show/i })).toBeNull();
  });
});

describe('address type', () => {
  it('is not a chooser', () => {
    // A retailer address is a shop address. The four-way chooser was copied from
    // the supplier form, where a company genuinely has a warehouse and a billing
    // address; here every option but one filed the address under a label nothing
    // downstream reads.
    renderForm('create', {
      addresses: [
        { addressType: 'primary', district: 'Dhaka', addressLine: 'Shop 12', isDefault: true },
      ],
    });

    expect(screen.queryByLabelText(/address type/i)).toBeNull();
    // The address itself is still editable.
    expect(screen.getByLabelText(/full address line/i)).toBeTruthy();
  });
});
