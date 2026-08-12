// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ForgotPasswordForm } from '../ForgotPasswordForm';

const apiMock = vi.hoisted(() => ({ forgot: vi.fn() }));
const navigateMock = vi.hoisted(() => vi.fn());

vi.mock('../../../api/auth', () => ({ apiForgotPassword: apiMock.forgot }));

vi.mock('react-router-dom', async (importOriginal) => {
  const real = await importOriginal<typeof import('react-router-dom')>();
  return { ...real, useNavigate: () => navigateMock };
});

beforeEach(() => {
  apiMock.forgot.mockReset().mockResolvedValue({ ok: true, status: 200, data: {} });
  navigateMock.mockReset();
});
afterEach(cleanup);

function renderForm() {
  return render(
    <MemoryRouter>
      <ForgotPasswordForm onBack={() => {}} />
    </MemoryRouter>,
  );
}

/** Request a code and land on the confirmation panel. */
async function requestCode() {
  renderForm();
  fireEvent.change(screen.getByLabelText(/email or mobile/i), {
    target: { value: 'Someone@Example.com' },
  });
  fireEvent.click(screen.getByRole('button', { name: /send reset code/i }));
  await waitFor(() => expect(screen.getByRole('button', { name: /enter the code/i })).toBeTruthy());
}

/**
 * The handoff from the screen that ISSUES a reset code to the screen that SPENDS
 * one.
 *
 * This is the only moment the nonce can be captured: it is minted with the code,
 * and there is deliberately no endpoint to fetch it from afterwards — one would
 * hand anybody who read the email the other half of the proof. Dropped here, the
 * binding is gone for the entire reset.
 */
describe('ForgotPasswordForm — handing the issuance to the reset screen', () => {
  it('carries the nonce alongside the address, in router state', async () => {
    apiMock.forgot.mockResolvedValue({
      ok: true,
      status: 200,
      data: { data: { message: 'sent' }, otpNonce: 'n-issued' },
    });

    await requestCode();
    fireEvent.click(screen.getByRole('button', { name: /enter the code/i }));

    expect(navigateMock).toHaveBeenCalledWith('/reset-password', {
      state: {
        identifier: 'someone@example.com',
        email: 'someone@example.com',
        otpNonce: 'n-issued',
      },
    });
  });

  it('reads a nonce nested inside data as well as beside it', async () => {
    // The two shapes the backend already uses for this field differ by one
    // level — LoginResponse carries it inside `data`, resend hangs it off the
    // envelope — and which one a reset nonce would arrive in is not settled.
    apiMock.forgot.mockResolvedValue({
      ok: true,
      status: 200,
      data: { data: { message: 'sent', otpNonce: 'n-nested' } },
    });

    await requestCode();
    fireEvent.click(screen.getByRole('button', { name: /enter the code/i }));

    expect(navigateMock).toHaveBeenCalledWith('/reset-password', {
      state: {
        identifier: 'someone@example.com',
        email: 'someone@example.com',
        otpNonce: 'n-nested',
      },
    });
  });

  it('hands over without one when the response carries none', async () => {
    /*
     * Today's actual behaviour, and it must keep working. `/auth/forgot-password`
     * answers with a fixed message whether or not the account exists — that is
     * what stops this form being an account-enumeration oracle — so there is
     * nowhere safe to put a nonce and it returns none. The reset then runs
     * unbound, which the server accepts while OTP_REQUIRE_BINDING is false.
     */
    await requestCode();
    fireEvent.click(screen.getByRole('button', { name: /enter the code/i }));

    expect(navigateMock).toHaveBeenCalledWith('/reset-password', {
      state: {
        // `identifier` is the real name; `email` rides along for one release
        // so a tab opened before the deploy still prefills.
        identifier: 'someone@example.com',
        email: 'someone@example.com',
        otpNonce: undefined,
      },
    });
  });

  it('never puts the nonce in the URL', async () => {
    apiMock.forgot.mockResolvedValue({
      ok: true,
      status: 200,
      data: { data: { message: 'sent' }, otpNonce: 'n-issued' },
    });

    await requestCode();
    fireEvent.click(screen.getByRole('button', { name: /enter the code/i }));

    // The address moved out of the query string because full request URLs land
    // in Hosting and Cloudflare access logs. The same reasoning applies to the
    // nonce with more force: it is half of a credential, not a contact detail.
    const [path] = navigateMock.mock.calls[0] as [string, unknown];
    expect(path).toBe('/reset-password');
    expect(path).not.toContain('?');
  });
});

/*
 * A MOBILE NUMBER MUST SURVIVE THIS FORM.
 *
 * The regression these guard is invisible to every test above, because every
 * test above types an email address.
 *
 * The field was `type="email"` and the submit handler called `validateEmail`.
 * Between them a mobile number could not leave the screen: the browser refused
 * to submit, or the validator answered "Please enter a valid email address". No
 * request was made, so there was nothing in the network tab and nothing in the
 * server logs — while the backend had been matching
 * `phone_hash = $1 OR email = $2` and texting the code the whole time.
 */
describe('ForgotPasswordForm — a mobile number is a first-class identifier', () => {
  it('sends a mobile number to the server unchanged', async () => {
    renderForm();
    fireEvent.change(screen.getByLabelText(/email or mobile/i), {
      target: { value: '01712345678' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send reset code/i }));

    await waitFor(() => expect(apiMock.forgot).toHaveBeenCalled());
    // Unchanged: no +880, no dashes stripped or added. The server canonicalises
    // the number itself, and a second opinion here would hash to something else.
    expect(apiMock.forgot).toHaveBeenCalledWith('01712345678');
  });

  it('rejects something that is neither, naming both', async () => {
    renderForm();
    fireEvent.change(screen.getByLabelText(/email or mobile/i), {
      target: { value: 'not-an-identifier' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send reset code/i }));

    await waitFor(() => expect(screen.getByText(/valid email address or/i)).toBeTruthy());
    // The old message said "Please enter a valid email address" for a phone
    // number, which named the wrong field and offered no way forward.
    expect(apiMock.forgot).not.toHaveBeenCalled();
  });
});
