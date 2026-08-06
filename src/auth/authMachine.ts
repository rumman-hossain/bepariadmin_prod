import type { AuthUser } from '../types/auth';

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
   * An explanation for why the user is looking at the login form, when there is
   * one. Distinct from `error`: nothing went wrong and nobody mistyped anything
   * — a session ended. Rendering it as an error would blame the user for the
   * clock running out.
   */
  notice: string | null;
  user: AuthUser | null;
  isServerReachable: boolean;
  /** Identifier and account type carried between the login and OTP steps. */
  pendingLogin: { identifier: string; userType: string } | null;
}

export const initialAuthState: AuthState = {
  step: 'idle',
  isLoading: true,
  submitting: false,
  error: null,
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
  | { type: 'request/failed'; error: string }
  | { type: 'login/otpRequired'; identifier: string; userType: string }
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
      return { ...state, submitting: true, error: null, notice: null };

    case 'request/failed':
      return { ...state, submitting: false, error: action.error };

    case 'login/otpRequired':
      return {
        ...state,
        step: 'verifying_login',
        submitting: false,
        error: null,
        pendingLogin: { identifier: action.identifier, userType: action.userType },
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
        notice: null,
        user: action.user,
        pendingLogin: null,
      };

    case 'session/ended':
      return signedOut(state, null, action.notice ?? null);

    case 'error/cleared':
      return state.error === null ? state : { ...state, error: null };

    case 'navigate':
      return { ...state, step: action.step, error: null, notice: null };

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
