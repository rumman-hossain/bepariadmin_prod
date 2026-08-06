// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import type React from 'react';
import { WholesalerFormProvider } from '../components/form/context';
import { CredentialsSection } from '../components/form/CredentialsSection';
import type { WholesalerFormData } from '../schemas/wholesalerSchema';

/**
 * What the operator can actually type into, RENDERED.
 *
 * The first version of this guard read the source file for the string
 * `values.mobile` — and two mutants walked past it: one that bound the mobile
 * input to `values.email`, and one that removed the field from the JSX while
 * leaving its definition above. Both left the string in the file.
 *
 * A grep proves a variable exists. Only a render proves a field is on screen,
 * carries the value it claims to, and writes back to the right one.
 */

vi.mock('@/src/services/upload/useUpload', () => ({
  useUpload: () => ({ uploadSlot: vi.fn() }),
}));

afterEach(cleanup);

const VALUES = {
  companyName: 'Elegant Apparel Ltd',
  ownerName: 'Mohammad Ali',
  email: 'supplier@example.com',
  mobile: '01712345678',
  categories: [],
  addresses: [],
  bankDetailsList: [],
  digitalWallets: [],
  documents: [],
  password: '',
} as unknown as WholesalerFormData;

function renderSection(
  setField = vi.fn(),
  mode: 'create' | 'edit' = 'create',
  aside?: React.ReactNode,
) {
  render(
    <WholesalerFormProvider
      values={VALUES}
      errors={{}}
      setField={setField}
      isSubmitting={false}
      mode={mode}
    >
      <CredentialsSection aside={aside} />
    </WholesalerFormProvider>,
  );
  return setField;
}

describe('Login Credentials', () => {
  it('offers a mobile field, carrying the supplier’s number', () => {
    // Either credential signs the supplier in — the server matches
    // `phone_hash = $1 OR email = $2` — so both belong in this section.
    renderSection();

    const mobile = screen.getByLabelText(/login mobile/i) as HTMLInputElement;
    expect(mobile.value).toBe('01712345678');
  });

  it('writes back to the mobile, not to the email', () => {
    /*
     * The mutant that survived a source-level check: the input rendered, was
     * labelled Login Mobile, and edited `email`. On screen it looked correct and
     * every keystroke went into the wrong column.
     */
    const setField = renderSection();

    fireEvent.change(screen.getByLabelText(/login mobile/i), {
      target: { value: '01799001122' },
    });

    expect(setField).toHaveBeenCalledWith('mobile', '01799001122');
    expect(setField).not.toHaveBeenCalledWith('email', '01799001122');
  });

  it('still offers the email, and writes back to it', () => {
    const setField = renderSection();

    const email = screen.getByLabelText(/login email/i) as HTMLInputElement;
    expect(email.value).toBe('supplier@example.com');

    fireEvent.change(email, { target: { value: 'new@example.com' } });
    expect(setField).toHaveBeenCalledWith('email', 'new@example.com');
  });

  it('marks the mobile required, because the server now refuses a create without it', () => {
    renderSection();
    expect(screen.getByText(/login mobile/i).textContent).toContain('*');
  });

  it('says the number is a way in', () => {
    // It used to sit under a "Mobile Number" label beside the owner's name,
    // where it read as a contact detail to call.
    renderSection();
    expect(screen.getByText(/sign in with this number/i)).toBeTruthy();
  });

  it('offers a password on create and never on edit', () => {
    // Editing offers a reset card instead, and must not prefill one.
    renderSection(vi.fn(), 'create');
    expect(screen.queryByLabelText(/password/i)).toBeTruthy();

    cleanup();
    renderSection(vi.fn(), 'edit');
    expect(screen.queryByLabelText(/password/i)).toBeNull();
  });

  it('offers the mobile in the ASIDE layout too', () => {
    /*
     * THE BRANCH THAT WAS UNTESTED.
     *
     * This section renders two ways: on its own, and beside the reset-password
     * card on the edit screen. A mutant that deleted the phone field from the
     * aside branch alone survived everything above, because every test rendered
     * the other one — the number would simply have vanished from the edit
     * screen with nothing to say so.
     */
    const setField = renderSection(vi.fn(), 'edit', <div>reset card</div>);

    const mobile = screen.getByLabelText(/login mobile/i) as HTMLInputElement;
    expect(mobile.value).toBe('01712345678');
    expect(screen.getByLabelText(/login email/i)).toBeTruthy();
    expect(screen.getByText('reset card')).toBeTruthy();

    fireEvent.change(mobile, { target: { value: '01799001122' } });
    expect(setField).toHaveBeenCalledWith('mobile', '01799001122');
  });
});
