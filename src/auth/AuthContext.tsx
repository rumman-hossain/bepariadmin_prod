/**
 * AuthContext — React Context + Provider
 *
 * Central auth state: user, loading, errors.
 * Exposes login, verifyOtp, logout, bootstrap actions.
 *
 * Access tokens are stored ONLY in module-scope closure (memoryTokenStore),
 * NEVER in localStorage/sessionStorage. Cross-tab sync handled via
 * BroadcastChannel in tokenManager.ts.
 *
 * Matches the mobile app's auth flow behavior.
 */

import React, { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { AuthContext, type AuthContextValue } from './context';
import { mapUser } from './mapUser';
import { authReducer, initialAuthState, isAuthenticated } from './authMachine';
import { hashForLogin, hashErrorMessage } from './passwordHasher';
import {
  getAccessToken,
  setAccessToken,
  clearAccessToken,
  subscribe as subscribeToToken,
} from './memoryTokenStore';
import { broadcastLogout, onAuthBroadcast } from './tokenManager';
import {
  apiLogin,
  apiVerifyLoginOtp,
  apiGetMe,
  apiLogout,
  apiLogoutSession,
  apiResendLoginOtp,
} from '../api/auth';
import { readOtpNonce } from 'nextgen-password';
import { restoreSession, checkServerHealth } from './sessionRestore';
import { shouldAttemptRestore } from './sessionHint';
// `errorKind` is aliased because the state field destructured below carries the
// same name; unaliased, the field would shadow the function inside this
// component and `errorKind(res)` would be a call on a string.
import { friendlyError, errorCode, errorKind as classifyError } from '../utils/errors';
import type { AuthUser } from '../types/auth';

// ═══════════════════════════════════════════════════════════════
// Provider
// ═══════════════════════════════════════════════════════════════

const SESSION_ENDED_NOTICE = 'Your session ended. Please sign in again.';

/*
 * Shown when we could not confirm the session was ended ON THE SERVER.
 *
 * Deliberately actionable rather than reassuring: on a shared machine the right
 * response is to close the browser, and the operator can only choose that if we
 * admit what we do not know.
 */
const REVOKE_FAILED_NOTICE =
  'Signed out on this device, but we could not reach the server to end the session. ' +
  'If this is a shared computer, close the browser.';

/*
 * Both notices live at MODULE scope. They were written flush-left inside the
 * component, which reads as module scope but is not — so every render built a
 * fresh binding and the hook linter, correctly, wanted one of them declared as a
 * dependency of `logout`. Constants that never change should not be able to
 * invalidate a callback.
 */

export function AuthProvider({ children }: { children: React.ReactNode }) {
  /*
   * One reducer, not six `useState`s.
   *
   * Every transition here used to set three to five values in sequence. Inside
   * an event handler React batches those, but NOT across an `await` — and all
   * of these flows are async, so each rendered two or three times with the
   * state briefly inconsistent in between. It also made `step: 'dashboard'`
   * with `user: null` a representable state.
   *
   * See authMachine.ts. The transitions are pure and tested without React.
   */
  const [state, dispatch] = useReducer(authReducer, initialAuthState);
  const { step, isLoading, submitting, error, errorKind, notice, user, isServerReachable } = state;

  // Bumped whenever the token changes, so consumers reading `accessToken`
  // through context re-render. The token itself lives in memoryTokenStore, not
  // in React state — see the note on `accessToken` below.
  const [, setTokenVersion] = useState(0);

  /*
   * A mirror of `state.pendingLogin` for the async callbacks.
   *
   * `verifyOtp` and `resendOtp` are `useCallback(..., [])` so they stay stable
   * across renders — which means they close over the state as it was on mount.
   * The ref is how they read the current value without the whole callback
   * being recreated on every keystroke. Written in an effect, never during
   * render.
   */
  const isAuthenticatedRef = useRef(false);
  useEffect(() => {
    isAuthenticatedRef.current = isAuthenticated(state);
  }, [state]);

  // True only while a session end is in flight. Set and read within one tick —
  // see endSessionLocally, which is where it earns its keep.
  const endingSessionRef = useRef(false);

  const pendingLoginRef = useRef(initialAuthState.pendingLogin);
  useEffect(() => {
    pendingLoginRef.current = state.pendingLogin;
  }, [state.pendingLogin]);

  // ── Derived value: read from memoryTokenStore, not React state ───
  const accessToken = getAccessToken();

  // Clear error
  const clearError = useCallback(() => dispatch({ type: 'error/cleared' }), []);

  // Map API user to AuthUser

  /**
   * Fetch the profile once a token is in hand.
   *
   * `useCallback` rather than a bare function declaration because `login` and
   * `verifyOtp` below list `[]` as their dependencies — so without a stable
   * identity here they capture whichever `fetchProfile` existed on the first
   * render and hold it forever. That is harmless today only because this
   * closes over nothing that changes; it is not a property worth relying on
   * silently on the auth path.
   */
  const fetchProfile = useCallback(async function fetchProfile(
    token: string,
  ): Promise<AuthUser | null> {
    setAccessToken(token);
    setTokenVersion((v) => v + 1);

    const meRes = await apiGetMe();

    if (!meRes.ok) {
      // Retry once
      await new Promise((r) => setTimeout(r, 800));
      const retryRes = await apiGetMe();
      if (!retryRes.ok) {
        clearAccessToken();
        setTokenVersion((v) => v + 1);
        return null;
      }
      const me = (retryRes.data as unknown as Record<string, unknown>).data as Record<string, unknown>;
      return mapUser(me);
    }

    const me = (meRes.data as unknown as Record<string, unknown>).data as Record<string, unknown>;
    return mapUser(me);
  }, []);

  // ═══════════════════════════════════════════════════════════
  // LOGIN
  // ═══════════════════════════════════════════════════════════

  const login = useCallback(
    async (identifier: string, password: string, userType = 'staff') => {
      dispatch({ type: 'request/start' });

      try {
        const { primary } = await hashForLogin(password, identifier);
        const res = await apiLogin({
          identifier: identifier.trim().toLowerCase(),
          password_hash: primary,
          user_type: userType as 'staff' | 'wholesaler' | 'retailer',
        });

        if (!res.ok) {
          dispatch({ type: 'request/failed', error: friendlyError(res), kind: classifyError(res) });
          return;
        }

        const inner = (res.data as unknown as Record<string, unknown>).data as Record<string, unknown>;

        if (inner.requiresOTP) {
          dispatch({
            type: 'login/otpRequired',
            identifier: identifier.trim().toLowerCase(),
            userType,
            // Minted with the code, and returned ONLY on this response. There is
            // no endpoint to fetch it from later — one would hand anybody who
            // read the SMS the other half of the proof — so it is captured here
            // or the rest of the flow runs unbound.
            otpNonce: readOtpNonce(res.data),
          });
          return;
        }

        // Staff accounts skip OTP (email_verified is already true), so tokens
        // come back directly and the session is live.
        const token = inner.accessToken as string | undefined;
        const profile = token ? await fetchProfile(token) : null;
        if (profile) dispatch({ type: 'session/established', user: profile });
        else dispatch({ type: 'request/failed', error: 'Signed in, but the profile did not load.' });
      } catch (err) {
        dispatch({
          type: 'request/failed',
          error:
            hashErrorMessage(err) ??
            (err instanceof Error ? err.message : 'Could not reach the server.'),
        });
      }
    },
    [fetchProfile]
  );

  // ═══════════════════════════════════════════════════════════
  // VERIFY OTP
  // ═══════════════════════════════════════════════════════════

  const verifyOtp = useCallback(async (code: string) => {
    dispatch({ type: 'request/start' });

    try {
      // Carried by the machine rather than a ref, so it is cleared as part of
      // the transition that ends the flow instead of lingering after it.
      const { identifier, userType, otpNonce } =
        pendingLoginRef.current ?? { identifier: '', userType: 'staff', otpNonce: undefined };

      const res = await apiVerifyLoginOtp({
        identifier,
        code,
        user_type: userType as 'staff' | 'wholesaler' | 'retailer',
        otpNonce,
      });

      if (!res.ok) {
        /*
         * The message is the SERVER'S, in both branches.
         *
         * This branch used to dispatch a hardcoded "That code has expired.
         * Please sign in again." — so fixing the EXPIRED_CODE copy in
         * utils/errors.ts alone would have left this screen, the login OTP
         * step, still saying something the server did not say. The server's
         * sentence names both remedies and is true of all four states the code
         * covers, including "you were locked out a moment ago", which "expired"
         * is not.
         *
         * The transition is unchanged: an expired code still returns the
         * operator to the login form, which on this console is how another code
         * is requested.
         */
        if (errorCode(res) === 'EXPIRED_CODE') {
          dispatch({ type: 'login/expired', error: friendlyError(res) });
        } else {
          dispatch({ type: 'request/failed', error: friendlyError(res), kind: classifyError(res) });
        }
        return;
      }

      const inner = (res.data as unknown as Record<string, unknown>).data as Record<string, unknown>;
      const token = inner.accessToken as string;

      const profile = token ? await fetchProfile(token) : null;
      if (profile) {
        dispatch({ type: 'session/established', user: profile });
      } else {
        dispatch({ type: 'login/expired', error: 'Signed in, but the profile did not load.' });
      }
    } catch (err) {
      dispatch({
        type: 'request/failed',
        // `hashErrorMessage` first, as `login` already does: verifying a code
        // now derives a digest before it reaches the network, so this catch can
        // see a crypto failure and must not report it as an unreachable server.
        error:
          hashErrorMessage(err) ??
          (err instanceof Error ? err.message : 'Could not reach the server.'),
      });
    }
  }, [fetchProfile]);

  // ═══════════════════════════════════════════════════════════
  // RESEND OTP
  // ═══════════════════════════════════════════════════════════

  const resendOtp = useCallback(async () => {
    dispatch({ type: 'error/cleared' });
    const pending = pendingLoginRef.current;
    try {
      const res = await apiResendLoginOtp(pending?.identifier ?? '', pending?.userType ?? 'staff');

      /*
       * The new code's nonce supersedes the one we are holding.
       *
       * Only on success: a refused resend — inside the cooldown, out of budget —
       * did not issue anything, so the code in the user's inbox and the nonce
       * bound to it are both still the live pair. Overwriting on a failure would
       * break a flow that was working.
       *
       * On success we take whatever came back INCLUDING nothing, because a
       * server that issued a code without naming its nonce has retired ours
       * either way. See the `login/otpResent` case in authMachine.
       */
      if (res.ok) {
        dispatch({ type: 'login/otpResent', otpNonce: readOtpNonce(res.data) });
      } else {
        /*
         * A REFUSED RESEND WAS SILENT, which is the same lie as "a new one has
         * been sent" told by omission.
         *
         * This dispatched only on success, so a 429 — the hourly send budget
         * spent, or the 60-second cooldown — changed nothing on screen. The
         * caller then started its cooldown and incremented its counter exactly
         * as it does for a real send, so a refusal was indistinguishable from a
         * delivery: the operator waited for an SMS the server had already
         * declined to send.
         *
         * The nonce is deliberately NOT touched here, for the reason above: a
         * refused resend issued nothing, so the code in their inbox and the
         * nonce bound to it are still the live pair.
         */
        dispatch({ type: 'request/failed', error: friendlyError(res), kind: classifyError(res) });
      }
    } catch (err) {
      // Was `catch { // Silent }`. A user clicking "Resend code" on a failed
      // network got no toast, no error, no state change — indistinguishable
      // from success, so they would sit waiting for an OTP that was never sent.
      dispatch({
        type: 'request/failed',
        error:
          err instanceof Error && err.message
            ? err.message
            : 'Could not resend the code. Check your connection and try again.',
      });
      throw err;
    }
  }, []);

  // ═══════════════════════════════════════════════════════════
  // LOGOUT
  // ═══════════════════════════════════════════════════════════

  /*
   * END THE SESSION HERE, IN THIS TAB ONLY. Says nothing to the server.
   *
   * THE ONE EXIT. `logout`, `forceLogout` and the cross-tab broadcast all land
   * here rather than each repeating the clear-and-dispatch, so there is a single
   * place where a session ends and a single place to raise the in-flight flag.
   * Defined above its callers because `logout` names it in a dependency array.
   *
   * The broadcast lands here rather than on `forceLogout` deliberately: the tab
   * that ended the session has already revoked it, and three other tabs revoking
   * the same dead cookie is noise, not safety.
   */
  const endSessionLocally = useCallback((notice?: string) => {
    /*
     * RAISE THE FLAG BEFORE TOUCHING THE TOKEN.
     *
     * `clearAccessToken()` below notifies the token subscriber, which ends the
     * session too — so without this, a single logout revokes TWICE, and the
     * subscriber's `session/ended` overwrites this one's notice with "your
     * session ended", hiding a failed revoke behind a routine message.
     *
     * `forceLogout` is where the flag is read; this is the only place that
     * raises it. Deliberately NOT `isAuthenticatedRef`: that one is written in
     * a `useEffect`, so during a synchronous re-entry React has not rendered
     * and it still reads the pre-logout value. This is set and read in the same
     * tick, which is the only thing that works here.
     *
     * No early-return of its own: nothing can re-enter this function once
     * `forceLogout` is gated, and mutation testing confirmed a guard here
     * changed no outcome. Unprovable code is code nobody can maintain.
     */
    endingSessionRef.current = true;
    try {
      clearAccessToken();
      setTokenVersion((v) => v + 1);
      dispatch({ type: 'session/ended', notice });
    } finally {
      endingSessionRef.current = false;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } catch {
      // Bearer logout may fail when access token is expired — fall through to
      // the cookie route, which does not need it.
    }

    /*
     * THE REVOKE THAT COUNTS, and its result is no longer thrown away.
     *
     * This was wrapped in a `try/catch` whose comment said "best-effort; local
     * state is cleared regardless" — and `request` does not throw on a non-2xx,
     * so the catch never even ran for a 500. A failed revocation was
     * indistinguishable from a successful one, and the user was shown a login
     * screen over a session that was still alive.
     *
     * Local state is STILL cleared either way: trapping somebody in a signed-in
     * UI because the network is down would be its own bug. What changes is that
     * we stop claiming something we did not verify.
     */
    const revoked = await revokeServerSession();

    /*
     * Through `endSessionLocally` rather than repeating its three lines, so the
     * re-entrancy guard covers this path too. Without it the `clearAccessToken`
     * inside would wake the token subscriber, which would revoke a SECOND time
     * and overwrite this notice with "your session ended" — hiding the very
     * failure the line below exists to report.
     */
    endSessionLocally(revoked ? undefined : REVOKE_FAILED_NOTICE);

    // `broadcastLogout` existed but had exactly one reference in the codebase:
    // its own definition. Logging out in one tab left every other tab fully
    // authenticated on the admin shell.
    broadcastLogout();
  }, [endSessionLocally]);

  // ═══════════════════════════════════════════════════════════
  // BOOTSTRAP (cold start recovery)
  // ═══════════════════════════════════════════════════════════

/**
 * Shown on the login screen when a session ended by itself.
 *
 * Deliberately says nothing about why beyond "ended" — it covers a session that
 * hit its 12-hour lifetime and one that was revoked by a password change on
 * another device, and the operator's next action is identical either way.
 */

/**
 * END THE SESSION ON THE SERVER, and report honestly whether it worked.
 *
 * `POST /auth/logout-session` authenticates by the httpOnly refresh COOKIE
 * rather than by the access token, which is what makes it usable at the one
 * moment it is most needed: when the access token has already gone null and
 * `apiLogout` can no longer authenticate anything.
 *
 * Returns whether the credential is actually gone. `request` resolves
 * `{ ok }` rather than throwing on a non-2xx, so a 500 here used to sail past a
 * `try/catch` and be treated as success — which is how "you are signed out"
 * could be displayed over a session that was still live.
 */
async function revokeServerSession(): Promise<boolean> {
  try {
    const res = await apiLogoutSession();
    return res.ok;
  } catch {
    // A network failure is not a revocation. Reported as such.
    return false;
  }
}

  const bootstrap = useCallback(async () => {
    dispatch({ type: 'bootstrap/start' });

    try {
      /*
       * Ask the server only when it could plausibly say yes.
       *
       * The refresh token is httpOnly, so JavaScript cannot read it — which
       * meant every anonymous visitor to the login page fired POST
       * /auth/refresh solely to be told "no". `bd_session` is a non-secret
       * marker the server sets beside it; its absence on a public route is
       * enough to know the answer.
       *
       * Its absence is NOT trusted anywhere else: a deep link to a protected
       * route still asks. So a hint that goes missing while the session lives
       * costs an anonymous visitor nothing and a real user nothing — see
       * sessionHint.ts.
       *
       * Honest scope: the health check still runs, and it ran in parallel, so
       * this removes a pointless authenticated request rather than the whole
       * quarter second.
       */
      const attemptRestore = shouldAttemptRestore(window.location.pathname);

      const [serverUp, session] = await Promise.all([
        checkServerHealth(),
        attemptRestore
          ? restoreSession()
          : Promise.resolve({ ok: false as const, reason: 'refresh_failed' as const }),
      ]);

      if (!session.ok) {
        clearAccessToken();
        setTokenVersion((v) => v + 1);
        dispatch({
          type: 'bootstrap/anonymous',
          serverUp,
          // Only when the server said a session ENDED. Telling a first-time
          // visitor that their session expired is nonsense; saying nothing to
          // someone who was working five minutes ago is worse.
          notice: session.reason === 'session_expired' ? SESSION_ENDED_NOTICE : undefined,
        });
        return;
      }

      setTokenVersion((v) => v + 1);
      dispatch({ type: 'bootstrap/restored', user: session.user, serverUp });
    } catch {
      dispatch({ type: 'bootstrap/failed' });
    }
  }, []);

  /*
   * BACK-BUTTON RESTORE MUST BE RE-CHECKED.
   *
   * The other half of "go back to any route and the screen shows". Browsers keep
   * a back-forward cache: pressing Back can restore the whole page — DOM, React
   * state, the signed-in shell — WITHOUT re-running the app. Neither
   * ProtectedRoute nor bootstrap gets a say, because neither runs.
   *
   * `pageshow` with `event.persisted` is the only signal that this happened.
   * Treated as a fresh mount: ask the server again, and let the answer decide
   * what is on screen. If the session has ended, bootstrap dispatches anonymous
   * and the guard redirects — which is exactly what failed to happen before.
   */
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return; // an ordinary load already ran bootstrap
      void bootstrap();
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, [bootstrap]);

  // Bootstrap on mount
  useEffect(() => {
    void bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /*
   * REVOKE THE CREDENTIAL, not just the copy of it in this tab.
   *
   * This is the fix for a reported vulnerability. The old version of this
   * function cleared memory, dispatched `session/ended`, and told the server
   * NOTHING — so the httpOnly refresh cookie stayed valid. The operator read
   * "Your session ended. Please sign in again." and walked away; anyone at that
   * keyboard pressed Back, refreshed, and bootstrap's `/auth/refresh` correctly
   * answered YES. Live rows, full access, on a console that approves suppliers
   * and moves payout accounts.
   *
   * `apiLogoutSession` is the right call and the only one that works here: it
   * authenticates by COOKIE, so it still succeeds at the exact moment the access
   * token has gone null and `apiLogout` cannot.
   *
   * Not awaited. The user must reach the login form immediately whatever the
   * network does — but it is genuinely fired, which is the whole difference.
   *
   * Worth being explicit about the three ways the refresh could have failed:
   *
   *   the cookie really expired  → this is a no-op, it is already dead
   *   a transient network blip   → this fails too; no worse off than before
   *   anything else, cookie live → this kills it. That is the bug being closed.
   */
  const forceLogout = useCallback((notice?: string) => {
    // Checked BEFORE the revoke, not just inside endSessionLocally: a session
    // already on its way out has been revoked by whoever started it, and a
    // second POST would be a duplicate on every single logout.
    if (endingSessionRef.current) return;
    void revokeServerSession();
    endSessionLocally(notice);
  }, [endSessionLocally]);

  // Cross-tab sync — logout broadcast only (no localStorage token sync)
  // Local-only: the tab that ended the session already revoked it server-side.
  useEffect(() => onAuthBroadcast(endSessionLocally), [endSessionLocally]);

  // Honour server-side session revocation.
  //
  // When a refresh fails, api/client.ts clears the access token — but nothing
  // moved `step` back to the login form, so every request from then on returned
  // a synthetic 401 while the UI stayed sitting on the admin shell looking
  // signed in. Revoking sessions server-side did not log anybody out.
  //
  // `memoryTokenStore.subscribe` was written for exactly this and had zero
  // subscribers. A token going null is the single signal that the session is
  // over, whoever ended it.
  useEffect(() => {
    return subscribeToToken((token) => {
      if (token !== null) return;
      // Only meaningful while signed in; the reducer ignores it otherwise.
      if (!isAuthenticatedRef.current) return;
      /*
       * THE PATH THE REPORTED BUG CAME THROUGH.
       *
       * A token going null means a refresh attempt failed. That is NOT proof the
       * cookie behind it is dead — a blip or the 401-storm path in
       * api/client.ts:119 gets here with a perfectly live credential. Telling
       * the user their session ended while leaving it usable is the vulnerability;
       * `forceLogout` now revokes before saying so.
       */
      forceLogout(SESSION_ENDED_NOTICE);
      broadcastLogout();
    });
    // Genuinely depended on, and safe to depend on: `forceLogout` is a
    // useCallback over `endSessionLocally`, which has an empty dependency list —
    // so this subscribes once and is not torn down and rebuilt on every render.
  }, [forceLogout]);

  // ═══════════════════════════════════════════════════════════
  // NAVIGATION HELPERS
  // ═══════════════════════════════════════════════════════════


  /**
   * Re-read the signed-in user after they have changed their own details.
   *
   * The header shows the name and the role badge from this same object, so
   * without it a profile save leaves the old name in the corner of every screen
   * until the next reload — the change appearing not to have taken.
   *
   * Re-fetches rather than merging the PATCH response into state: /auth/me is
   * the one shape the rest of the app already trusts, and a second mapping of
   * the same payload is a second place for the two to disagree.
   */
  const refreshUser = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;
    const profile = await fetchProfile(token);
    if (profile) dispatch({ type: 'session/established', user: profile });
  }, [fetchProfile]);

  // ═══════════════════════════════════════════════════════════
  // VALUE
  // ═══════════════════════════════════════════════════════════

  const value: AuthContextValue = {
    step,
    isLoading,
    error,
    errorKind,
    notice,
    user,
    accessToken,
    isServerReachable,
    submitting,
    login,
    verifyOtp,
    resendOtp,
    logout,
    bootstrap,
    clearError,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}