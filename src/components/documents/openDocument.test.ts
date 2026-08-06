import { describe, it, expect, vi } from 'vitest';
import {
  openDocumentUrl,
  type FetchDocumentUrl,
  isDocumentOpenFailure,
  STILL_SAVING_MESSAGE,
  STILL_SAVING_RETRY_MS,
  type OpenDocumentDeps,
} from './openDocument';
import { RetailerRequestError } from '@/src/features/retailers/api/retailersApi';

/**
 * "Could not open that document — Resource not found", pressed straight after
 * adding a file, on a document that WAS being saved and worked a minute later.
 *
 * The 404 that made it certain is fixed elsewhere (the vault no longer holds
 * document ids the attach deleted). What is left is the plain race, and the
 * point of these tests is that a race must not be reported as a loss: telling
 * an operator their file is missing sends them to re-upload something that is
 * already on its way in.
 */

const NOT_FOUND = () => new RetailerRequestError(404, 'That document is not on file for this shop.');
const FORBIDDEN = () => new RetailerRequestError(403, 'You do not have permission to open this document.');

/**
 * The fetcher is now a PARAMETER, not a dep.
 *
 * `openDocumentUrl` serves two vaults with different endpoints, so which one to
 * call is the caller's business and only the sleep is injected — a test should
 * not spend a real second and a half waiting.
 */
function harness(fetchUrl: FetchDocumentUrl) {
  const waited: number[] = [];
  const deps: OpenDocumentDeps = { wait: async (ms) => void waited.push(ms) };
  return {
    waited,
    fetchUrl,
    open: () => openDocumentUrl(fetchUrl, 'subject-1', 'doc-1', deps),
  };
}

describe('a document that opens', () => {
  it('returns the url without waiting for anything', async () => {
    const d = harness(vi.fn().mockResolvedValue({ url: '/api/v1/doc/tok' }));

    await expect(d.open()).resolves.toBe('/api/v1/doc/tok');
    expect(d.waited).toEqual([]);
    expect(d.fetchUrl).toHaveBeenCalledTimes(1);
  });
});

describe('a document that is still being saved', () => {
  it('is retried once and opened when the save lands', async () => {
    // The case the operator hit. Second attempt succeeds; nothing is shown.
    const fetchUrl = vi
      .fn()
      .mockRejectedValueOnce(NOT_FOUND())
      .mockResolvedValueOnce({ url: '/api/v1/doc/tok' });
    const d = harness(fetchUrl);

    await expect(d.open()).resolves.toBe('/api/v1/doc/tok');
    expect(fetchUrl).toHaveBeenCalledTimes(2);
    expect(d.waited).toEqual([STILL_SAVING_RETRY_MS]);
  });

  it('reads as a wait, not as a missing file, when it is still not there', async () => {
    const d = harness(vi.fn().mockRejectedValue(NOT_FOUND()));

    await expect(d.open()).rejects.toThrow(STILL_SAVING_MESSAGE);
    await expect(d.open()).rejects.not.toThrow(/not on file/i);
  });

  it('says so in a way the screen can colour differently', async () => {
    // The vault renders a warning rather than an error for this. Without the
    // flag it would have to match on the sentence, which is how wording changes
    // silently turn a wait back into an alarm.
    const d = harness(vi.fn().mockRejectedValue(NOT_FOUND()));

    await d.open().catch((err) => {
      expect(isDocumentOpenFailure(err)).toBe(true);
      expect(err.stillSaving).toBe(true);
    });
    expect.assertions(2);
  });

  it('gives up after ONE retry rather than hanging', async () => {
    /*
     * Retrying until it works would turn a document that genuinely is not there
     * into a spinner nobody can escape. Two attempts, then an answer.
     *
     * # Why the cap throws instead of the test just counting calls
     *
     * `toHaveBeenCalledTimes(2)` was the first version, and a mutant that
     * retried forever SURVIVED it: the recursion never returns, so the assertion
     * is never reached and the run reports the test as neither passed nor
     * failed. A guard that a runaway loop can outlast is not a guard.
     *
     * The third call throws something the function does not special-case, so
     * unbounded retry surfaces as the WRONG message rather than as a hang.
     */
    let calls = 0;
    const fetchUrl = vi.fn(async () => {
      calls += 1;
      if (calls > 2) throw new Error('retried more than once');
      throw NOT_FOUND();
    });
    const d = harness(fetchUrl);

    await expect(d.open()).rejects.toThrow(STILL_SAVING_MESSAGE);
    expect(calls).toBe(2);
    expect(d.waited).toHaveLength(1);
  });
});

describe('a document the operator may not read', () => {
  it('is refused immediately, with no wait', async () => {
    // A 403 is a decision, not a delay. Waiting on it would make a refusal feel
    // like a slow system and invite the operator to keep trying.
    const fetchUrl = vi.fn().mockRejectedValue(FORBIDDEN());
    const d = harness(fetchUrl);

    await expect(d.open()).rejects.toThrow(/permission/i);
    expect(fetchUrl).toHaveBeenCalledTimes(1);
    expect(d.waited).toEqual([]);
  });

  it('is not flagged as still saving', async () => {
    const d = harness(vi.fn().mockRejectedValue(FORBIDDEN()));

    await d.open().catch((err) => {
      expect(err.stillSaving).toBe(false);
    });
    expect.assertions(1);
  });

  it('a refusal on the SECOND attempt is not called a wait either', async () => {
    // Access can be revoked between the two attempts. The answer is the refusal,
    // not "try again in a moment".
    const d = harness(vi.fn().mockRejectedValueOnce(NOT_FOUND()).mockRejectedValueOnce(FORBIDDEN()));

    await expect(d.open()).rejects.toThrow(/permission/i);
  });
});

describe('anything else', () => {
  it('keeps its own message and is not retried', async () => {
    const fetchUrl = vi.fn().mockRejectedValue(new Error('The network is down'));
    const d = harness(fetchUrl);

    await expect(d.open()).rejects.toThrow(/network is down/i);
    expect(fetchUrl).toHaveBeenCalledTimes(1);
  });

  it('falls back to a sentence when the error carries none', async () => {
    const d = harness(vi.fn().mockRejectedValue(new Error('')));

    await expect(d.open()).rejects.toThrow(/could not be opened/i);
  });
});
