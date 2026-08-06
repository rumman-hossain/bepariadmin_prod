import { describe, it, expect } from 'vitest';
import { documentFailureMessage } from './retailersApi';

/**
 * "It may have been removed" was said for every failure — including, for a long
 * time, an endpoint that did not exist. The route was never registered, chi
 * answered its own 404, and the screen invented a reason about a file that was
 * sitting in the bucket.
 *
 * A refusal, an absence and an expired session are three different facts.
 */
describe('documentFailureMessage', () => {
  it('a refusal says permission, not removal', () => {
    const msg = documentFailureMessage(403);
    expect(msg).toMatch(/permission/i);
    expect(msg).not.toMatch(/removed/i);
  });

  it('a genuine absence says it is not on file', () => {
    expect(documentFailureMessage(404)).toMatch(/not on file/i);
  });

  it('an expired session says to sign in', () => {
    expect(documentFailureMessage(401)).toMatch(/sign in/i);
  });

  it('says nothing at all about a status it has no explanation for', () => {
    /*
     * null, so the CALLER can fall back to the server's message.
     *
     * This used to invent a sentence for every status, which forced
     * getRetailerDocumentUrl to prefer the server's wording — and that
     * preference is what put the server's generic "Resource not found" on
     * screen instead of the sentence above, for a document that was mid-save.
     *
     * A guess that sounds plausible is worse than deferring: it sends somebody
     * looking for a deleted file that was never deleted.
     */
    expect(documentFailureMessage(500)).toBeNull();
    expect(documentFailureMessage(409)).toBeNull();
  });

  it('never claims a document was removed', () => {
    for (const status of [400, 401, 403, 404, 500, 502]) {
      expect(documentFailureMessage(status) ?? '').not.toMatch(/may have been removed/i);
    }
  });
});
