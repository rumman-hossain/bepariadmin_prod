// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  reportCrash,
  routePattern,
  crashBuffer,
  __resetCrashBuffer,
  installGlobalHandlers,
} from '../reportCrash';

/**
 * A CRASH MUST LEAVE A TRACE, AND THE TRACE MUST NOT LEAK THE OPERATOR'S DATA.
 *
 * Before this, nothing recorded a crash: `ErrorBoundary` had no
 * `componentDidCatch`, `RoutePageError` logged behind `import.meta.env.DEV`, and
 * no global handler existed. Three route-killing crashes were found this week by
 * reading code, because there was no log to read.
 *
 * The redaction is the constraint that makes reporting safe to turn on, so it is
 * tested first and hardest.
 */

beforeEach(() => {
  __resetCrashBuffer();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe('the route is recorded as a pattern, never as a URL', () => {
  it.each([
    ['/products/9f3a1b2c-4d5e-6f70-8901-234567890abc/edit', '/products/:id/edit'],
    ['/products/9f3a1b2c-4d5e-6f70-8901-234567890abc', '/products/:id'],
    ['/orders/12345', '/orders/:id'],
    ['/products', '/products'],
    ['/products/new', '/products/new'],
  ])('%s → %s', (input, expected) => {
    expect(routePattern(input)).toBe(expected);
  });

  it('puts no product id in the record', () => {
    history.pushState({}, '', '/products/9f3a1b2c-4d5e-6f70-8901-234567890abc/edit');
    reportCrash(new Error('boom'), { kind: 'render', boundary: 'wizard-step-4' });

    const [record] = crashBuffer();
    expect(record.route).toBe('/products/:id/edit');
    // The whole record, serialised: the id must appear nowhere in it.
    expect(JSON.stringify(record)).not.toContain('9f3a1b2c');
  });
});

describe('a crash loop cannot flood the channel', () => {
  it('records the same error once per minute, not once per render', () => {
    for (let i = 0; i < 5; i++) reportCrash(new Error('same'), { kind: 'render' });
    expect(crashBuffer()).toHaveLength(1);
  });

  it('still records a different error', () => {
    reportCrash(new Error('first'), { kind: 'render' });
    reportCrash(new Error('second'), { kind: 'render' });
    expect(crashBuffer()).toHaveLength(2);
  });

  it('caps the buffer, so reporting never becomes the denial of service', () => {
    for (let i = 0; i < 30; i++) reportCrash(new Error(`distinct ${i}`), { kind: 'render' });
    expect(crashBuffer()).toHaveLength(20);
  });
});

describe('the reporter cannot itself break the page', () => {
  it('survives a non-Error being thrown', () => {
    expect(() => reportCrash('a bare string', { kind: 'window' })).not.toThrow();
    expect(crashBuffer()[0].message).toBe('a bare string');
  });

  it('survives null', () => {
    expect(() => reportCrash(null, { kind: 'rejection' })).not.toThrow();
  });
});

describe('what React boundaries cannot see', () => {
  it('catches a floating promise rejection', () => {
    // An error boundary sees render, lifecycle and effects. It does not see
    // this, and every failed upload used to produce one silently.
    installGlobalHandlers(window);
    window.dispatchEvent(
      new PromiseRejectionEvent('unhandledrejection', {
        promise: Promise.reject(new Error('upload died')).catch(() => undefined) as Promise<never>,
        reason: new Error('upload died'),
      }),
    );

    const record = crashBuffer().find((r) => r.kind === 'rejection');
    expect(record?.message).toBe('upload died');
  });
});
