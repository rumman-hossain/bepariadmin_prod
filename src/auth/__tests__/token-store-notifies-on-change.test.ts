import { describe, it, expect, beforeEach } from 'vitest';
import {
  setAccessToken,
  clearAccessToken,
  subscribe,
  getAccessToken,
} from '../memoryTokenStore';

/**
 * A CHANGE EVENT MUST DESCRIBE A CHANGE.
 *
 * `clearAccessToken` used to notify every subscriber unconditionally, including
 * when the token was already null. That is not a detail: the subscriber in
 * AuthContext ends the session, and ending a session clears the token — so a
 * notification that fires on a non-change closes the loop:
 *
 *   clearAccessToken() → notify(null) → subscriber ends session
 *                      → clearAccessToken() → notify(null) → …
 *
 * It ran until the stack ran out. Worse, it surfaced as an unhandled
 * `RangeError` beside a green-looking summary rather than as a failed
 * assertion — the failure mode that hides.
 *
 * The guard here is the one that bounds it. The re-entrancy ref in AuthContext
 * is the other half; both are tested, because either alone leaves a hole.
 */

beforeEach(() => {
  setAccessToken('seed.token.value');
  clearAccessToken();
});

describe('memoryTokenStore only announces real transitions', () => {
  it('says nothing when clearing a token that is already null', () => {
    const seen: (string | null)[] = [];
    const unsubscribe = subscribe((t) => seen.push(t));

    clearAccessToken(); // already null from beforeEach

    expect(seen).toEqual([]);
    unsubscribe();
  });

  it('still announces the transition that matters', () => {
    const seen: (string | null)[] = [];
    const unsubscribe = subscribe((t) => seen.push(t));

    setAccessToken('a.b.c');
    clearAccessToken();

    expect(seen).toEqual(['a.b.c', null]);
    expect(getAccessToken()).toBeNull();
    unsubscribe();
  });

  it('survives a subscriber that clears the token from inside the callback', () => {
    /*
     * The shape of the production bug, reduced: a listener that reacts to "the
     * token went null" by clearing the token. Before the guard this never
     * returned.
     */
    let depth = 0;
    const unsubscribe = subscribe((t) => {
      if (t !== null) return;
      depth += 1;
      clearAccessToken();
    });

    setAccessToken('a.b.c');
    clearAccessToken();

    expect(depth).toBe(1);
    unsubscribe();
  });
});
