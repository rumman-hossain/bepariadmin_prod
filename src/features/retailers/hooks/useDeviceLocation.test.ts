// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useDeviceLocation } from './useDeviceLocation';

/**
 * Capturing the device's position, and — the part that matters — admitting when
 * it could not.
 *
 * The prototype ticks a checkbox, calls getCurrentPosition, and on failure does
 * `console.error(...)` and submits the form anyway. So a denied permission
 * produces a retailer with no coordinates and a form that looked like it worked.
 * Nobody finds out until someone opens the record months later and wonders why
 * the shop has no location.
 */

function mockGeolocation(impl: Partial<Geolocation>) {
  Object.defineProperty(navigator, 'geolocation', {
    value: impl as Geolocation,
    configurable: true,
    writable: true,
  });
}

beforeEach(() => vi.clearAllMocks());
afterEach(() => {
  Object.defineProperty(navigator, 'geolocation', { value: undefined, configurable: true, writable: true });
});

describe('useDeviceLocation', () => {
  it('starts idle, with nothing captured', () => {
    mockGeolocation({ getCurrentPosition: vi.fn() });
    const { result } = renderHook(() => useDeviceLocation());
    expect(result.current.status).toBe('idle');
    expect(result.current.position).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('captures coordinates and their accuracy', async () => {
    mockGeolocation({
      getCurrentPosition: (ok) =>
        ok({ coords: { latitude: 23.8103, longitude: 90.4125, accuracy: 12 } } as GeolocationPosition),
    });
    const { result } = renderHook(() => useDeviceLocation());
    act(() => result.current.capture());

    await waitFor(() => expect(result.current.status).toBe('captured'));
    expect(result.current.position).toEqual({ latitude: 23.8103, longitude: 90.4125, accuracy: 12 });
    expect(result.current.error).toBeNull();
  });

  it('SURFACES a denied permission instead of swallowing it', async () => {
    // The whole reason this hook exists rather than an inline call.
    mockGeolocation({
      getCurrentPosition: (_ok, fail) =>
        fail?.({ code: 1, message: 'User denied Geolocation' } as GeolocationPositionError),
    });
    const { result } = renderHook(() => useDeviceLocation());
    act(() => result.current.capture());

    await waitFor(() => expect(result.current.status).toBe('failed'));
    expect(result.current.position).toBeNull();
    expect(result.current.error).toMatch(/permission/i);
    // And it must not read like a bug in the app — the operator refused, which
    // is a legitimate thing to have done.
    expect(result.current.error).not.toMatch(/error|failed|unexpected/i);
  });

  it('distinguishes a timeout from a refusal', async () => {
    // Indoors, in a concrete market building, a fix simply does not arrive.
    // "Permission denied" would send the operator to their browser settings for
    // no reason.
    mockGeolocation({
      getCurrentPosition: (_ok, fail) =>
        fail?.({ code: 3, message: 'Timeout expired' } as GeolocationPositionError),
    });
    const { result } = renderHook(() => useDeviceLocation());
    act(() => result.current.capture());

    await waitFor(() => expect(result.current.status).toBe('failed'));
    expect(result.current.error).toMatch(/could not get a fix|try again/i);
    expect(result.current.error).not.toMatch(/permission/i);
  });

  it('says so when the browser has no geolocation at all', async () => {
    Object.defineProperty(navigator, 'geolocation', { value: undefined, configurable: true, writable: true });
    const { result } = renderHook(() => useDeviceLocation());
    act(() => result.current.capture());
    await waitFor(() => expect(result.current.status).toBe('failed'));
    expect(result.current.error).toMatch(/does not support/i);
  });

  it('clears a captured position, so a wrong one can be removed', async () => {
    /*
     * An operator who captures at the office and then realises must be able to
     * take it back. Without this the only way to remove a wrong location is to
     * abandon the form.
     */
    mockGeolocation({
      getCurrentPosition: (ok) =>
        ok({ coords: { latitude: 23.8, longitude: 90.4, accuracy: 9 } } as GeolocationPosition),
    });
    const { result } = renderHook(() => useDeviceLocation());
    act(() => result.current.capture());
    await waitFor(() => expect(result.current.status).toBe('captured'));

    act(() => result.current.clear());
    expect(result.current.status).toBe('idle');
    expect(result.current.position).toBeNull();
  });

  it('never accepts a cached fix', async () => {
    /*
     * `maximumAge: 0`. The default lets the browser hand back a position from
     * earlier in the session — which, for a field agent walking between shops,
     * means tagging the shop they just left. A stale coordinate is worse than no
     * coordinate, because it is indistinguishable from a real one.
     *
     * Asserted on the options passed to the browser, because there is no way to
     * observe the difference from the outside: a cached fix and a fresh one
     * arrive identically.
     */
    // Typed with all three parameters so the options argument is reachable —
    // it is the only thing this test is actually about.
    const getCurrentPosition = vi.fn(
      (ok: PositionCallback, _fail?: PositionErrorCallback | null, _opts?: PositionOptions) =>
        ok({ coords: { latitude: 1, longitude: 2, accuracy: 5 } } as GeolocationPosition),
    );
    mockGeolocation({ getCurrentPosition });
    const { result } = renderHook(() => useDeviceLocation());
    act(() => result.current.capture());
    await waitFor(() => expect(result.current.status).toBe('captured'));

    const opts = getCurrentPosition.mock.calls[0]![2]!;
    expect(opts.maximumAge, 'a cached position tags the previous shop').toBe(0);
    expect(opts.enableHighAccuracy).toBe(true);
    expect(opts.timeout, 'an unbounded wait leaves the form stuck on "locating"').toBeGreaterThan(0);
  });

  it('reports while a fix is being taken', async () => {
    let release: ((p: GeolocationPosition) => void) | null = null;
    mockGeolocation({ getCurrentPosition: (ok) => { release = ok; } });
    const { result } = renderHook(() => useDeviceLocation());

    act(() => result.current.capture());
    expect(result.current.status).toBe('locating');

    act(() => release!({ coords: { latitude: 1, longitude: 2, accuracy: 5 } } as GeolocationPosition));
    await waitFor(() => expect(result.current.status).toBe('captured'));
  });
});
