import { describe, it, expect, vi, afterEach } from 'vitest';

const request = vi.fn();
vi.mock('@/src/api/client', async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  request: (...a: unknown[]) => request(...a),
}));

const { getSmsBalance } = await import('../dashboard');

afterEach(() => request.mockReset());

/**
 * THE DOUBLE ENVELOPE, TESTED WHERE IT ACTUALLY HAPPENS.
 *
 * `request` resolves `{ ok, data }` where `data` is the RAW BODY — and every
 * /api/v1 endpoint wraps its payload again as `{ data: … }`. The value therefore
 * lives at `res.data.data`.
 *
 * Reading one level too few returned an object with no `configured` key, which
 * is falsy, so the dashboard reported "No SMS gateway is wired on this
 * environment" while the response in the network tab plainly said
 * `configured: true, balance: 997.9`.
 *
 * The card's own tests could not catch it: they mock `getSmsBalance` itself, so
 * the unwrapping never runs. A mutation reverting this function to the buggy
 * shape passed that whole suite. This file exercises the real function against
 * the real response shape, which is the only place the mistake is visible.
 */
describe('getSmsBalance unwraps the API envelope', () => {
  it('returns the inner payload, not the body around it', async () => {
    // The exact response observed from the live endpoint.
    request.mockResolvedValue({
      ok: true,
      data: { data: { configured: true, available: true, balance: 997.9 } },
    });

    const result = await getSmsBalance();

    expect(result.configured).toBe(true);
    expect(result.available).toBe(true);
    expect(result.balance).toBe(997.9);
  });

  it('refuses a body that is missing the inner payload', async () => {
    /*
     * Rather than returning something shaped wrongly and letting the card draw a
     * confident "Not configured" from it. A thrown error surfaces as the card's
     * "could not be reached" state, which is honest about not knowing.
     */
    request.mockResolvedValue({ ok: true, data: { configured: true } });
    await expect(getSmsBalance()).rejects.toThrow(/unexpected shape/i);
  });

  it('refuses a failed request rather than reporting a gateway that is not there', async () => {
    request.mockResolvedValue({ ok: false, data: undefined });
    await expect(getSmsBalance()).rejects.toThrow(/could not be read/i);
  });
});
