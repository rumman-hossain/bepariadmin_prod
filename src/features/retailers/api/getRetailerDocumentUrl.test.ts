import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * THE REGRESSION TEST.
 *
 * The backend stopped handing out Google signed URLs and started returning
 * `/api/v1/doc/<token>` — a path on our own origin. The response schema still
 * said `z.string().url()`, so Zod rejected every document and the screen showed
 * "Could not open that document", blaming the file for a rule about its address.
 *
 * Nothing caught it because this function had no test at all. Both sides of the
 * change were verified — the backend served the bytes, the header rules were
 * proved live — and the one line between them was never exercised. It is the
 * same failure this codebase keeps repeating: the rule is checked, the call site
 * is not.
 *
 * So these run the REAL `getRetailerDocumentUrl`, with only the transport
 * stubbed.
 */

const request = vi.fn();
vi.mock('../../../api/client', () => ({
  request: (...args: unknown[]) => request(...args),
}));

const { getRetailerDocumentUrl, isNotFound } = await import('./retailersApi');

const EXPIRES = '2026-08-05T13:41:03Z';

function respond(url: string) {
  request.mockResolvedValue({ ok: true, status: 200, data: { data: { url, expiresAt: EXPIRES } } });
}

beforeEach(() => {
  request.mockReset();
});

describe('getRetailerDocumentUrl', () => {
  it('accepts the proxy path the backend actually returns', async () => {
    // Verbatim from a live response: {"data":{"url":"/api/v1/doc/oX35ZNlBiflpGSbD-RxqWw", …}}
    respond('/api/v1/doc/oX35ZNlBiflpGSbD-RxqWw');

    await expect(getRetailerDocumentUrl('ret-1', 'doc-1')).resolves.toEqual({
      url: '/api/v1/doc/oX35ZNlBiflpGSbD-RxqWw',
      expiresAt: EXPIRES,
    });
  });

  it('refuses a storage address, which is the whole point of the proxy', async () => {
    /*
     * Relaxing the schema to `z.string()` would have fixed the bug and thrown
     * away the guarantee. The bucket name and object path must never reach the
     * browser again — if a change starts returning one, it fails here.
     */
    respond(
      'https://storage.googleapis.com/beparibd-private-bepari-bd-dev/uploads/d/f?X-Goog-Signature=abc',
    );

    await expect(getRetailerDocumentUrl('ret-1', 'doc-1')).rejects.toThrow();
  });

  it('refuses a bare prefix with no token', async () => {
    // `/api/v1/doc/` opens the route with nothing to resolve. A 404 in a new tab
    // is a worse answer than an error on the screen the operator is looking at.
    respond('/api/v1/doc/');

    await expect(getRetailerDocumentUrl('ret-1', 'doc-1')).rejects.toThrow();
  });

  it('refuses a path on somebody else’s origin', async () => {
    // Protocol-relative: `//evil.example/api/v1/doc/x` is an absolute URL to
    // another host that reads like a path. It must not pass.
    respond('//evil.example/api/v1/doc/x');

    await expect(getRetailerDocumentUrl('ret-1', 'doc-1')).rejects.toThrow();
  });

  it('asks the endpoint the backend registered, with both ids escaped', async () => {
    respond('/api/v1/doc/tok');

    await getRetailerDocumentUrl('ret 1', 'doc/1');

    const [method, path] = request.mock.calls[0];
    expect(method).toBe('GET');
    expect(path).toBe('/api/v1/admin/retailers/ret%201/documents/doc%2F1/url');
  });

  it('reports a refusal as permission, not as a missing file', async () => {
    request.mockResolvedValue({ ok: false, status: 403, data: undefined });

    await expect(getRetailerDocumentUrl('ret-1', 'doc-1')).rejects.toThrow(/permission/i);
  });
});

/**
 * WHAT THE OPERATOR ACTUALLY SAW.
 *
 * "Could not open that document — Resource not found", pressing View on a
 * document that was still being saved. "Resource not found" is the server's
 * generic phrase for every 404 it raises; the sentence written for this screen
 * lost to it, because the caller preferred the server's message.
 *
 * The server's wording is still the better one in general — it usually names
 * something to act on. It is only worse for the three statuses this screen has
 * thought about.
 */
describe('whose sentence reaches the screen', () => {
  it('ours wins for a 404, over the server’s generic phrase', async () => {
    request.mockResolvedValue({
      ok: false,
      status: 404,
      data: { error: { code: 'NOT_FOUND', message: 'Resource not found' } },
    });

    await expect(getRetailerDocumentUrl('ret-1', 'doc-1')).rejects.toThrow(/not on file/i);
    await expect(getRetailerDocumentUrl('ret-1', 'doc-1')).rejects.not.toThrow(/resource not found/i);
  });

  it('ours wins for 403 and 401 too', async () => {
    request.mockResolvedValue({
      ok: false,
      status: 403,
      data: { error: { message: 'Forbidden' } },
    });
    await expect(getRetailerDocumentUrl('r', 'd')).rejects.toThrow(/permission/i);

    request.mockResolvedValue({ ok: false, status: 401, data: { error: { message: 'Unauthorized' } } });
    await expect(getRetailerDocumentUrl('r', 'd')).rejects.toThrow(/sign in/i);
  });

  it('the server’s wins for a status we have not thought about', async () => {
    // A 409 or a 500 usually names the actionable thing. Overriding it with a
    // number would throw away the only useful part of the response.
    request.mockResolvedValue({
      ok: false,
      status: 500,
      data: { error: { message: 'The storage backend is unavailable' } },
    });

    await expect(getRetailerDocumentUrl('r', 'd')).rejects.toThrow(/storage backend/i);
  });

  it('falls back to the status when neither side has anything to say', async () => {
    request.mockResolvedValue({ ok: false, status: 502, data: undefined });

    await expect(getRetailerDocumentUrl('r', 'd')).rejects.toThrow(/502/);
  });

  it('carries the status, so a mid-save 404 can be told from a refusal', async () => {
    // The whole reason this throws RetailerRequestError: the vault waits through
    // a 404 and does not wait through a 403.
    request.mockResolvedValue({ ok: false, status: 404, data: undefined });

    await expect(getRetailerDocumentUrl('r', 'd')).rejects.toSatisfy(isNotFound);

    request.mockResolvedValue({ ok: false, status: 403, data: undefined });
    await expect(getRetailerDocumentUrl('r', 'd')).rejects.not.toSatisfy(isNotFound);
  });
});
