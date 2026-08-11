import type { AuthUser } from '../types/auth';
import type { ErrorKind } from '../utils/errors';

/**
 * Authentication as a state machine.
 *
 * The provider previously held six independent `useState` values — `step`,
 * `isLoading`, `submitting`, `error`, `user`, `isServerReachable` — and every
 * transition set three to five of them in sequence. Two problems followed from
 * that, and both were reachable:
 *
 *   - **Invalid states were representable.** `step: 'dashboard'` with
 *     `user: null` type-checked and rendered; so did `submitting: true` while
 *     `step: 'dashboard'`. Nothing prevented either, and `ProtectedRoute`
 *     branches on `step` while the shell reads `user`.
 *   - **A transition was several renders.** `setSubmitting(true)` then
 *     `setError(null)` then `setStep(...)` are batched inside an event handler
 *     but NOT across an `await` — so the async paths, which are all of them,
 *     rendered two or three times per transition with the state briefly
 *     inconsistent in between.
 *
 * Modelling it as `(state, action) => state` fixes both: one dispatch is one
 * render, and a transition either happens completely or not at all.
 *
 * It is also a pure function, so the transitions are tested directly without
 * React, a DOM, or a mocked network — see `__tests__/authMachine.test.ts`.
 */

/*
 * `forgot_password` used to be a step here. It is gone, and its absence is the
 * fix: two components dispatched into it and NO router ever read it, so
 * "Forgot password?" re-rendered the same login form and the whole reset flow
 * was unreachable from the UI.
 *
 * Navigation between auth SCREENS belongs to the router — those screens have
 * URLs, and a URL is the thing an emailed link can point at. This machine models
 * session state, which is a different question.
 */
export type AuthStep = 'idle' | 'login_form' | 'verifying_login' | 'dashboard';

export interface AuthState {
  step: AuthStep;
  /** Cold-start session restore is in flight. */
  isLoading: boolean;
  /** A user-initiated request is in flight. */
  submitting: boolean;
  error: string | null;
  /**
   * What KIND of failure `error` describes, so a screen can react to it rather
   * than only print it.
   *
   * The OTP screen had no way to tell a 503 on our side from a wrong code, so
   * it offered the same remedy to both — and the remedy for a wrong code is to
   * resend, which spends one of three paid SMS an hour. Null whenever `error`
   * is null; the two always move together.
   */
  errorKind: ErrorKind | null;
  /**
   * An explanation for why the user is looking at the login form, when there is
   * one. Distinct from `error`: nothing went wrong and nobody mistyped anything
   * — a session ended. Rendering it as an error would blame the user for the
   * clock running out.
   */
  notice: string | null;
  user: AuthUser | null;
  isServerReachable: boolean;
  /**
   * Identifier, account type and issuance nonce carried between the login and
   * OTP steps.
   *
   * `otpNonce` belongs here rather than in a ref for the same reason the other
   * two do: it is cleared by the transition that ends the flow. A nonce that
   * outlived its login would be bound to a code that no longer exists, and the
   * server reports that as a wrong code — three of those and the real code is
   * destroyed.
   */
  pendingLogin: { identifier: string; userType: string; otpNonce?: string } | null;
}

export const initialAuthState: AuthState = {
  step: 'idle',
  isLoading: true,
  submitting: false,
  error: null,
  errorKind: null,
  notice: null,
  user: null,
  isServerReachable: true,
  pendingLogin: null,
};

export type AuthAction =
  | { type: 'bootstrap/start' }
  | { type: 'bootstrap/restored'; user: AuthUser; serverUp: boolean }
  | { type: 'bootstrap/anonymous'; serverUp: boolean; notice?: string }
  | { type: 'bootstrap/failed' }
  | { type: 'request/start' }
  /**
   * `kind` is optional so that the many call sites with nothing useful to say
   * stay as they are; it defaults to `user`, which claims nothing. Only the
   * paths that ask `errorKind(res)` pass it.
   */
  | { type: 'request/failed'; error: string; kind?: ErrorKind }
  | { type: 'login/otpRequired'; identifier: string; userType: string; otpNonce?: string }
  /**
   * A replacement code was issued, superseding the one the user was sent.
   *
   * Carries `otpNonce` as REQUIRED-but-possibly-undefined rather than optional,
   * so a dispatch that forgets it cannot type-check into "leave the old one
   * alone". Undefined means the server issued a code without telling us what
   * binds it, and the only safe reading of that is that whatever we hold is
   * stale — see the reducer.
   */
  | { type: 'login/otpResent'; otpNonce: string | undefined }
  | { type: 'login/expired'; error: string }
  | { type: 'session/established'; user: AuthUser }
  | { type: 'session/ended'; notice?: string }
  | { type: 'error/cleared' }
  | { type: 'navigate'; step: Extract<AuthStep, 'login_form'> };

/**
 * Signed out, in every sense.
 *
 * Reached from four different places — explicit logout, a cross-tab broadcast,
 * a failed session restore and an expired OTP — which is exactly why it is one
 * named transition rather than four hand-written groups of setters that could
 * drift apart. `pendingLogin` is cleared here so a stale identifier cannot leak
 * into the next sign-in attempt.
 */
function signedOut(state: AuthState, error: string | null = null, notice: string | null = null): AuthState {
  return {
    ...state,
    step: 'login_form',
    isLoading: false,
    submitting: false,
    error,
    // Held to the invariant: a kind exists exactly when an error does. Nothing
    // on the login form branches on it, but leaving a stale `service` behind
    // would outlive the screen that meant it.
    errorKind: error === null ? null : 'user',
    notice,
    user: null,
    pendingLogin: null,
  };
}

export function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'bootstrap/start':
      return { ...state, isLoading: true };

    case 'bootstrap/restored':
      return {
        ...state,
        step: 'dashboard',
        isLoading: false,
        error: null,
        errorKind: null,
        user: action.user,
        isServerReachable: action.serverUp,
      };

    case 'bootstrap/anonymous':
      return {
        ...signedOut(state, null, action.notice ?? null),
        isServerReachable: action.serverUp,
      };

    case 'bootstrap/failed':
      // The server is unreachable, which is not the same as being signed out —
      // but there is no way to prove a session either, so land on the form.
      return { ...signedOut(state), isServerReachable: false };

    case 'request/start':
      // The notice goes too: once they are typing, "your session ended" has
      // served its purpose and would otherwise sit under a spinner.
      return { ...state, submitting: true, error: null, errorKind: null, notice: null };

    case 'request/failed':
      // `?? 'user'` rather than `?? null`, so the invariant holds for the call
      // sites that pass no kind: an error always has one, and `user` is the
      // reading that claims nothing about whose fault it was.
      return { ...state, submitting: false, error: action.error, errorKind: action.kind ?? 'user' };

    case 'login/otpRequired':
      return {
        ...state,
        step: 'verifying_login',
        submitting: false,
        error: null,
        pendingLogin: {
          identifier: action.identifier,
          userType: action.userType,
          otpNonce: action.otpNonce,
        },
      };

    case 'login/otpResent':
      /*
       * OVERWRITE, including with undefined.
       *
       * `{ ...pendingLogin, otpNonce: action.otpNonce }` rather than
       * `action.otpNonce ?? state.pendingLogin.otpNonce`, and the difference is
       * the whole point of this case. The resend issued a new code; the nonce we
       * were holding belongs to a code that no longer exists. Keeping it would
       * bind every subsequent attempt to a dead issuance, and the server answers
       * that identically to a wrong code — so the user would see "incorrect
       * code" for a code they typed perfectly, three times, until it was
       * destroyed.
       *
       * Dropping to undefined instead sends the digest unbound, which the server
       * still accepts while OTP_REQUIRE_BINDING is false. Weaker than binding;
       * far better than binding to the wrong thing.
       *
       * Ignored outside the OTP step: there is no pending login to amend, and
       * inventing one here would be a way into `verifying_login` that never
       * checked a password.
       */
      if (state.pendingLogin === null) return state;
      return {
        ...state,
        pendingLogin: { ...state.pendingLogin, otpNonce: action.otpNonce },
      };

    case 'login/expired':
      // Back to the form, keeping the reason on screen.
      return signedOut(state, action.error);

    case 'session/established':
      // The only transition into `dashboard`, and it requires a user — which is
      // what makes `step: 'dashboard'` with `user: null` unreachable.
      return {
        ...state,
        step: 'dashboard',
        submitting: false,
        isLoading: false,
        error: null,
        errorKind: null,
        notice: null,
        user: action.user,
        pendingLogin: null,
      };

    case 'session/ended':
      return signedOut(state, null, action.notice ?? null);

    case 'error/cleared':
      // Both halves checked, or the referential-stability guarantee would be a
      // lie for a state carrying a kind without a message.
      return state.error === null && state.errorKind === null
        ? state
        : { ...state, error: null, errorKind: null };

    case 'navigate':
      return { ...state, step: action.step, error: null, errorKind: null, notice: null };

    default: {
      // Exhaustiveness: adding an action without a case fails the build here
      // rather than silently returning the old state at runtime.
      const unreachable: never = action;
      return unreachable;
    }
  }
}

/** True when the machine is in a state that should render the app shell. */
export function isAuthenticated(state: AuthState): boolean {
  return state.step === 'dashboard' && state.user !== null;
}
