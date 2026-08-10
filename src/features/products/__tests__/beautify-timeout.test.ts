import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * THE FIFTEEN-SECOND DEADLINE THAT LOOKED LIKE A FAILING FEATURE.
 *
 * `REQUEST_TIMEOUT` is 15s and it aborts every request. Image generation takes
 * 10-30s — a measured live run came back at 14.9s, a tenth of a second inside
 * the limit — so the request aborted, the tile said the image had failed, and
 * the server carried on and finished it anyway.
 *
 * What the operator then pressed as "Try again" was not a retry. It was
 * collecting a finished image through the idempotency key, which is why it
 * appeared to work every time.
 *
 * These pin the fix at the only place it belongs: generation gets a long
 * deadline, and NOTHING else does. Raising REQUEST_TIMEOUT globally would have
 * bought the same result by making every other endpoint slower to admit it is
 * broken.
 */

const request = vi.hoisted(() => vi.fn());
vi.mock('@/src/api/client', () => ({ request }));

import {
  runBeautify,
  commitBeautify,
  listBeautifyJobs,
  discardBeautify,
} from '@/src/api/beautify';

beforeEach(() => {
  request.mockReset();
  request.mockResolvedValue({ ok: true, status: 200, data: { data: {} } });
});

/** The options object handed to `request` by the call under test. */
const optionsOfLastCall = () => request.mock.calls.at(-1)?.[2] as { timeoutMs?: number };

describe('how long each call is allowed to take', () => {
  it('gives generation minutes, not seconds', async () => {
    await runBeautify({ productId: 'p1', side: 'front', mode: 'with_model' });

    const timeout = optionsOfLastCall()?.timeoutMs;
    expect(timeout).toBeDefined();
    // Comfortably past the 30s ceiling on a slow generation, and inside Cloud
    // Run's own 300s request limit.
    expect(timeout!).toBeGreaterThanOrEqual(60_000);
    expect(timeout!).toBeLessThanOrEqual(300_000);
  });

  it('leaves every other beautify call on the default', async () => {
    /*
     * None of these waits on a model. Commit is a pointer swap, list is a
     * SELECT, discard is an UPDATE — if any of them takes 15 seconds, the right
     * response is to fail, not to wait three minutes for it.
     */
    await commitBeautify('p1', ['job-1']);
    expect(optionsOfLastCall()?.timeoutMs).toBeUndefined();

    await listBeautifyJobs('p1');
    expect(optionsOfLastCall()?.timeoutMs).toBeUndefined();

    await discardBeautify('p1');
    expect(optionsOfLastCall()?.timeoutMs).toBeUndefined();
  });
});
