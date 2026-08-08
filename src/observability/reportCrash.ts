/**
 * The minimum that makes a production crash leave a trace.
 *
 * There was none. `ErrorBoundary` had no `componentDidCatch`, `RoutePageError`
 * logged behind `import.meta.env.DEV`, and nothing listened for `error` or
 * `unhandledrejection` — so every crash an operator hit in production was
 * invisible, and the only way to find one was to read the code. Three real
 * route-killing crashes were found that way this week; each could have
 * announced itself.
 *
 * Deliberately not Sentry, not a dependency, not a dashboard. The requirement is
 * "a crash leaves a trace", and a console entry is a support-ticket screenshot.
 */

import { CLIENT_INSTANCE_ID } from '@/src/api/client';

export type CrashKind = 'render' | 'window' | 'rejection' | 'breadcrumb';

export interface CrashContext {
  /** Which boundary caught it: "root", "shell", "route", "wizard-step-4". */
  boundary?: string;
  componentStack?: string;
  kind: CrashKind;
}

export interface CrashRecord {
  message: string;
  stack: string[];
  componentStack: string[];
  /** The route PATTERN. Never the URL — see `routePattern`. */
  route: string;
  boundary: string;
  kind: CrashKind;
  instance: string;
  at: number;
}

/**
 * A route with its identifiers removed.
 *
 * `/products/9f3a…-…/edit` becomes `/products/:id/edit`. This is the whole
 * redaction story for the URL: a product id, a supplier id or an order id is
 * the user's data, and a crash report is the last place it should turn up. The
 * pattern is what tells you WHICH screen broke, which is all a report needs.
 */
export function routePattern(pathname: string): string {
  return pathname
    .split('/')
    .map((seg) => {
      if (!seg) return seg;
      // UUID, or any long hex/number run — ids in this app are all one of those.
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(seg)) return ':id';
      if (/^\d+$/.test(seg)) return ':id';
      if (/^[0-9a-f]{16,}$/i.test(seg)) return ':id';
      return seg;
    })
    .join('/');
}

const MAX_FRAMES = 10;
const MAX_COMPONENT_LINES = 10;
/** A crash loop must not become a self-inflicted denial of service. */
const MAX_PER_LOAD = 20;
const DEDUPE_WINDOW_MS = 60_000;

const buffer: CrashRecord[] = [];
const lastSeen = new Map<string, number>();
let dropped = 0;

/** Read by tests and by anyone debugging from the console. */
export function crashBuffer(): readonly CrashRecord[] {
  return buffer;
}

/** Tests only — the module is a singleton by design. */
export function __resetCrashBuffer() {
  buffer.length = 0;
  lastSeen.clear();
  dropped = 0;
}

function lines(text: string | undefined, max: number): string[] {
  if (!text) return [];
  return text.split('\n').slice(0, max).map((l) => l.trim()).filter(Boolean);
}

/**
 * Record a crash.
 *
 * Never throws — a reporter that can fail is a second crash on top of the first,
 * and it fires from inside `componentDidCatch` and from global handlers where
 * there is nothing left to catch it.
 */
export function reportCrash(error: unknown, ctx: CrashContext): void {
  try {
    const err = error instanceof Error ? error : new Error(String(error));
    const stack = lines(err.stack, MAX_FRAMES + 1).slice(1);

    // Dedupe on the message plus where it came from: a component that throws on
    // every render would otherwise fill the buffer within a second.
    const key = `${err.message}|${stack[0] ?? ''}`;
    const now = Date.now();
    const seen = lastSeen.get(key);
    if (seen !== undefined && now - seen < DEDUPE_WINDOW_MS) return;
    lastSeen.set(key, now);

    if (buffer.length >= MAX_PER_LOAD) {
      dropped += 1;
      if (dropped === 1) {
        console.error(`[crash] cap of ${MAX_PER_LOAD} reached; further crashes this page load are dropped`);
      }
      return;
    }

    const record: CrashRecord = {
      message: err.message,
      stack,
      componentStack: lines(ctx.componentStack, MAX_COMPONENT_LINES),
      route: routePattern(typeof location !== 'undefined' ? location.pathname : ''),
      boundary: ctx.boundary ?? 'none',
      kind: ctx.kind,
      instance: CLIENT_INSTANCE_ID,
      at: now,
    };
    buffer.push(record);

    /*
     * Logged in production too. The DEV gate on the old route logger is exactly
     * why none of this was visible; a crash the operator can screenshot is worth
     * more than a clean console.
     */
    console.error(
      `[crash:${record.kind}] ${record.boundary} @ ${record.route} — ${record.message}`,
      record,
    );

    /*
     * NO NETWORK SINK YET, ON PURPOSE.
     *
     * `POST /api/v1/client-errors` does not exist. Inventing it here would
     * repeat the failure the `versioned-api-path` guard was written for: five
     * feature clients posted to paths Firebase Hosting answered with index.html,
     * and parsed a web page as JSON for months without a single error. Confirm
     * the route server-side, then send `buffer` from one place.
     */
  } catch {
    // Reporting must never be the thing that breaks.
  }
}

/**
 * Catch what React cannot: errors outside render, and rejected promises.
 *
 * Call once, before `createRoot`. An error boundary sees render, lifecycle and
 * effects — it does not see an event handler, a `setTimeout`, or a floating
 * promise. Those were previously silent even in development.
 */
export function installGlobalHandlers(target: Window = window): void {
  target.addEventListener('error', (event: ErrorEvent) => {
    reportCrash(event.error ?? event.message, { kind: 'window' });
  });

  target.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    reportCrash(event.reason, { kind: 'rejection' });
  });
}
