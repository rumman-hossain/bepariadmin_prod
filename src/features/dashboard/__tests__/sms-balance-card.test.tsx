// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SmsBalanceCard, LOW_BALANCE_THRESHOLD } from '../components/SmsBalanceCard';

const getSmsBalance = vi.fn();
vi.mock('@/src/api/dashboard', () => ({ getSmsBalance: (...a: unknown[]) => getSmsBalance(...a) }));

afterEach(() => { cleanup(); getSmsBalance.mockReset(); });

const renderCard = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={client}><SmsBalanceCard /></QueryClientProvider>,
  );
};
/*
 * Resolves the UNWRAPPED value, because that is what getSmsBalance returns.
 *
 * This used to hand back `{ ok: true, data }` — mirroring the shape of the raw
 * client rather than the function actually being mocked. That is precisely how
 * the bug survived a green suite: the double envelope was wrong in the source
 * AND wrong in the same direction here, so the test agreed with the defect
 * instead of catching it. The card reported "Not configured" for a gateway
 * answering `configured: true`.
 */
const answer = (data: unknown) => getSmsBalance.mockResolvedValue(data);

/**
 * THE NUMBER THAT SILENTLY STOPS EVERY SIGN-IN.
 *
 * When SMS credit runs out the gateway rejects the send, the login screen still
 * says a code was sent, and nobody finds out until somebody cannot get in. There
 * is no error for an operator to see, which is exactly why the figure is on the
 * dashboard and why it has to shout BEFORE it reaches zero.
 */
describe('the SMS balance card', () => {
  it('asks for a recharge below the threshold', async () => {
    answer({ configured: true, available: true, balance: LOW_BALANCE_THRESHOLD - 1 });
    renderCard();
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(screen.getByText(/please recharge/i)).toBeTruthy();
  });

  it('does not shout at exactly the threshold', async () => {
    /*
     * `< 500`, not `<= 500`. The boundary is where an off-by-one silently
     * changes who gets warned, so it is pinned rather than assumed.
     */
    answer({ configured: true, available: true, balance: LOW_BALANCE_THRESHOLD });
    renderCard();
    await waitFor(() => expect(screen.getByText(/৳/)).toBeTruthy());
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByText(/please recharge/i)).toBeNull();
  });

  it('shows the figure when there is plenty', async () => {
    answer({ configured: true, available: true, balance: 12_500 });
    renderCard();
    await waitFor(() => expect(screen.getByText(/12,500/)).toBeTruthy());
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('says NOT CONFIGURED rather than showing a zero', async () => {
    /*
     * A missing gateway and an empty account look identical on a screen that
     * only carries a number, and they need opposite responses — one is a
     * deployment question, the other is a payment. Showing "0" here would have
     * somebody topping up an account nothing is using.
     */
    answer({ configured: false });
    renderCard();
    await waitFor(() => expect(screen.getByText(/not configured/i)).toBeTruthy());
    expect(screen.queryByText(/please recharge/i)).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('says the figure is UNKNOWN when the provider cannot be reached', async () => {
    // Unknown is not low. Rendering "0" would be a confident wrong number, and
    // would send somebody to buy credit they may already have.
    answer({ configured: true, available: false });
    renderCard();
    await waitFor(() => expect(screen.getByText(/could not be reached/i)).toBeTruthy());
    expect(screen.queryByText(/please recharge/i)).toBeNull();
  });
});
