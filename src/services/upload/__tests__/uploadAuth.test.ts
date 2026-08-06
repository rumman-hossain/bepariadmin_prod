import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/*
 * The seam is `api/client`, because what is under test is whether the upload
 * path uses the shared token machinery at all — it previously did not.
 */
const getFreshAccessToken = vi.fn();
const forceRefreshAccessToken = vi.fn();
vi.mock('@/src/api/client', () => ({
  getFreshAccessToken: (...a: unknown[]) => getFreshAccessToken(...a),
  forceRefreshAccessToken: () => forceRefreshAccessToken(),
  getAccessToken: () => 'should-not-be-used',
}));

const { UploadAPIClient } = await import('../api');
const { UploadError } = await import('../errors');

const jsonResponse = (status: number, body: unknown = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  getFreshAccessToken.mockReset().mockResolvedValue('fresh-token');
  forceRefreshAccessToken.mockReset();
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const client = () => new UploadAPIClient();

const authOf = (call: number) =>
  (fetchMock.mock.calls[call]![1] as RequestInit).headers as Record<string, string>;

describe('upload auth — freshness', () => {
  it('asks for a token with headroom rather than whatever is lying around', async () => {
    /*
     * The bug this pins. The old code read `getAccessToken()` and sent it
     * unchecked; access tokens last 15 minutes and createDraft alone allows 120
     * seconds, so an operator returning to a stale add-product tab got
     * "Upload failed (401)" and lost the draft.
     */
    fetchMock.mockResolvedValue(jsonResponse(200, { draftId: 'd1' }));
    await client().getDraftStatus('d1');

    expect(getFreshAccessToken).toHaveBeenCalled();
    const headroom = getFreshAccessToken.mock.calls[0]![0] as number;
    // Must outlast the longest request timeout (120s), or a call can start
    // valid and finish expired.
    expect(headroom).toBeGreaterThan(120);
    expect(authOf(0).Authorization).toBe('Bearer fresh-token');
  });

  it('sends no Authorization header when there is no session', async () => {
    // Better than `Bearer null`, which the server reads as a malformed token.
    getFreshAccessToken.mockResolvedValue(null);
    fetchMock.mockResolvedValue(jsonResponse(200));
    await client().getDraftStatus('d1');

    expect(authOf(0).Authorization).toBeUndefined();
  });
});

describe('upload auth — 401 recovery', () => {
  it('refreshes once and replays the request', async () => {
    /*
     * A session revoked elsewhere — a password change on another device now
     * evicts this one immediately — leaves a token that looks valid locally and
     * is already dead. The expiry check cannot see that; only the 401 can.
     */
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { message: 'expired' }))
      .mockResolvedValueOnce(jsonResponse(200, { draftId: 'd1' }));
    forceRefreshAccessToken.mockResolvedValue('rotated-token');

    const result = await client().getDraftStatus('d1');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(authOf(1).Authorization).toBe('Bearer rotated-token');
    expect(result).toEqual({ draftId: 'd1' });
  });

  it('gives up after one retry rather than looping', async () => {
    fetchMock.mockResolvedValue(jsonResponse(401, { message: 'nope' }));
    forceRefreshAccessToken.mockResolvedValue('rotated-token');

    await expect(client().getDraftStatus('d1')).rejects.toBeInstanceOf(UploadError);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not replay when the refresh itself fails', async () => {
    // The session is genuinely gone; a second attempt would only be a second 401.
    fetchMock.mockResolvedValue(jsonResponse(401));
    forceRefreshAccessToken.mockResolvedValue(null);

    await expect(client().getDraftStatus('d1')).rejects.toBeInstanceOf(UploadError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('leaves non-401 failures alone', async () => {
    // A 500 is not an auth problem, and refreshing on it would hide a real fault.
    fetchMock.mockResolvedValue(jsonResponse(500, { message: 'boom' }));

    await expect(client().getDraftStatus('d1')).rejects.toBeInstanceOf(UploadError);
    expect(forceRefreshAccessToken).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
