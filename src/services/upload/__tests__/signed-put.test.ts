import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { UploadAPIClient, isSignedUploadUrl } from '../api';

/**
 * The transport that actually reaches GCS.
 *
 * Every upload from this app failed, and the cause was not the bucket's CORS
 * config — that was correct. GCS evaluates CORS when a resumable session is
 * INITIATED and the session URI inherits the answer; later PUTs to
 * `?upload_id=…` are never re-checked. The backend initiates those
 * server-to-server with no `Origin` header, so no origin is ever recorded and
 * the browser is locked out from the moment the session exists. The write
 * succeeds at Google and the response is discarded: `200 (OK)` beside
 * `net::ERR_FAILED`.
 *
 * A signed PUT is checked per request, against the config. These tests pin the
 * two things that make one work: which URL is chosen, and which headers go with
 * it.
 */

const SIGNED =
  'https://storage.googleapis.com/beparibd-private-bepari-bd-dev/uploads/d/f' +
  '?X-Goog-Algorithm=GOOG4-RSA-SHA256&X-Goog-Signature=abc123';

const RESUMABLE =
  'https://storage.googleapis.com/upload/storage/v1/b/beparibd-private-bepari-bd-dev/o' +
  '?uploadType=resumable&upload_id=AKhXX7Lp';

describe('telling the two URL kinds apart', () => {
  it('recognises a V4 signed URL', () => {
    expect(isSignedUploadUrl(SIGNED)).toBe(true);
  });

  it('does not mistake a resumable session for one', () => {
    // Both are storage.googleapis.com and both take a PUT. Matching on the host
    // would send signed headers to a session that signs nothing, adding
    // preflight surface for no benefit.
    expect(isSignedUploadUrl(RESUMABLE)).toBe(false);
  });
});

describe('uploadToGCS', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const body = new Blob(['x']);
  const client = () => new UploadAPIClient();

  function headersOf(): Record<string, string> {
    return fetchMock.mock.calls[0][1].headers as Record<string, string>;
  }

  it('sends the headers the signature binds', async () => {
    // These three are INSIDE the signature. GCS recomputes it from what
    // arrives, so a missing one is a 403, not a warning.
    await client().uploadToGCS(SIGNED, body, 'application/pdf', 'deadbeef');

    const headers = headersOf();
    expect(headers['Content-Type']).toBe('application/pdf');
    expect(headers['x-goog-if-generation-match']).toBe('0');
    expect(headers['x-goog-meta-expected-sha256']).toBe('deadbeef');
  });

  it('sends the checksum exactly as given', async () => {
    // Not upper-cased, not trimmed, not re-encoded. The server signed this
    // string; anything else is a different string.
    const sha = 'AbCdEf0123456789';
    await client().uploadToGCS(SIGNED, body, 'image/png', sha);
    expect(headersOf()['x-goog-meta-expected-sha256']).toBe(sha);
  });

  it('omits the checksum header when there is no checksum', async () => {
    // The server only binds this header when it has a value. Sending an empty
    // one against a signature that does not cover it is a needless 403.
    await client().uploadToGCS(SIGNED, body, 'image/png');
    expect(headersOf()).not.toHaveProperty('x-goog-meta-expected-sha256');
    // The write-once guard is unconditional on the server side and must be sent.
    expect(headersOf()['x-goog-if-generation-match']).toBe('0');
  });

  it('sends no signed headers to a resumable session', async () => {
    // A session URI signs nothing. These headers would only widen the preflight.
    await client().uploadToGCS(RESUMABLE, body, 'image/png', 'deadbeef');

    const headers = headersOf();
    expect(headers['Content-Type']).toBe('image/png');
    expect(headers).not.toHaveProperty('x-goog-if-generation-match');
    expect(headers).not.toHaveProperty('x-goog-meta-expected-sha256');
  });

  it('never sets Content-Length', async () => {
    // A forbidden header name: the browser sets it and silently drops any
    // assignment. Setting it looked like a size guarantee and was never one.
    await client().uploadToGCS(SIGNED, body, 'image/png', 'abc');
    expect(headersOf()).not.toHaveProperty('Content-Length');
  });

  it('PUTs the file itself', async () => {
    await client().uploadToGCS(SIGNED, body, 'image/png', 'abc');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(SIGNED);
    expect(init.method).toBe('PUT');
    expect(init.body).toBe(body);
  });
});

describe('when GCS refuses', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('a 403 says the link was rejected, not that permissions are wrong', async () => {
    // 403 on an upload is almost always the signature. "GCS upload failed (403)"
    // sends somebody to check bucket permissions they have not touched.
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403 }));

    await expect(
      new UploadAPIClient().uploadToGCS(SIGNED, new Blob(['x']), 'image/png', 'abc'),
    ).rejects.toThrow(/rejected|expired/i);
  });

  it('a 412 explains that something is already there', async () => {
    // Precondition failed is the write-once guard doing its job.
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 412 }));

    await expect(
      new UploadAPIClient().uploadToGCS(SIGNED, new Blob(['x']), 'image/png', 'abc'),
    ).rejects.toThrow(/already been uploaded/i);
  });

  it('any other status still fails rather than reporting success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    await expect(
      new UploadAPIClient().uploadToGCS(SIGNED, new Blob(['x']), 'image/png', 'abc'),
    ).rejects.toThrow(/500/);
  });
});
