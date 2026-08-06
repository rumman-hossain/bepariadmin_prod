// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, cleanup, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Link } from 'react-router-dom';
import { RouteErrorBoundary } from '../RouteErrorBoundary';

/**
 * A BROKEN SCREEN MUST NOT COST YOU THE CONSOLE.
 *
 * MEASURED ON DEV: one bad `<option>` on the Products screen replaced the whole
 * app with "Application Error / Reload Application" — the navigation rail and
 * sign-out went with it, and the boundary was unkeyed so `hasError` never
 * cleared. Navigating did nothing; only a document reload recovered.
 *
 * These assert the two structural properties, both of which the old boundary
 * lacked: the shell outlives the page, and leaving a broken screen actually
 * leaves it.
 */

function Boom(): React.ReactElement {
  throw new Error('render exploded');
}

function Fine({ label }: { label: string }) {
  return <p>{label}</p>;
}

/** The shell, with the boundary where the router now puts it. */
function Shell({ initial = '/broken' }: { initial?: string }) {
  return (
    <MemoryRouter initialEntries={[initial]}>
      <nav aria-label="Main navigation">
        <Link to="/broken">Broken</Link>
        <Link to="/safe">Safe</Link>
      </nav>
      <RouteErrorBoundary>
        <Routes>
          <Route path="/broken" element={<Boom />} />
          <Route path="/safe" element={<Fine label="Safe screen" />} />
        </Routes>
      </RouteErrorBoundary>
    </MemoryRouter>
  );
}

beforeEach(() => {
  // React logs the caught error; the test is about behaviour, not the noise.
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
  cleanup();
});

describe('when a page throws', () => {
  it('the navigation survives', () => {
    /*
     * The whole point. The old boundary wrapped `AppLayout`, so this rail was
     * unmounted too and the operator had nothing to click but Reload.
     */
    render(<Shell />);
    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Safe' })).toBeTruthy();
  });

  it('says the SECTION failed, not the application', () => {
    // "Application Error" over a working nav is simply untrue, and it tells an
    // operator to reload when they could just go somewhere else.
    render(<Shell />);
    expect(screen.getByRole('alert').textContent).toMatch(/section could not be displayed/i);
    expect(screen.getByRole('alert').textContent).not.toMatch(/Application Error/i);
  });

  it('offers no document reload', () => {
    // Reloading throws away every other screen already loaded. The affordances
    // are Try again and Back to dashboard.
    render(<Shell />);
    expect(screen.queryByRole('button', { name: /reload/i })).toBeNull();
    expect(screen.getByRole('button', { name: /try again/i })).toBeTruthy();
  });
});

describe('recovering', () => {
  it('navigating to another screen clears the failure', () => {
    /*
     * The old boundary had no key, so `hasError` stayed true forever: React
     * Router changed the URL underneath it and it kept rendering the fallback.
     * This is what made a reload the only way out.
     */
    render(<Shell />);
    expect(screen.getByRole('alert')).toBeTruthy();

    fireEvent.click(screen.getByRole('link', { name: 'Safe' }));

    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByText('Safe screen')).toBeTruthy();
  });

  it('Try again remounts the page rather than doing nothing', () => {
    /*
     * Keying on the pathname ALONE is not enough, and this is the case that
     * proves it: Try again stays on the same path, so the key would be
     * identical and the boundary would never remount. The button would be
     * decorative.
     *
     * The component here fails once and then succeeds, so a real remount is
     * observable.
     */
    // An explicit flag, not a render counter: React re-renders a throwing
    // component in development to rebuild the stack, so counting renders is
    // not deterministic and the test would pass or fail by luck.
    let broken = true;
    function Flaky() {
      if (broken) throw new Error('still broken');
      return <p>Recovered</p>;
    }

    render(
      <MemoryRouter initialEntries={['/flaky']}>
        <RouteErrorBoundary>
          <Routes>
            <Route path="/flaky" element={<Flaky />} />
          </Routes>
        </RouteErrorBoundary>
      </MemoryRouter>,
    );

    expect(screen.getByRole('alert')).toBeTruthy();

    // Whatever was wrong has been put right; Try again must give the page a
    // genuinely fresh mount rather than re-showing the cached failure.
    broken = false;
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));

    expect(screen.getByText('Recovered')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

describe('when nothing is wrong', () => {
  it('renders the page untouched', () => {
    // The other direction, so "always shows the fallback" cannot pass.
    render(<Shell initial="/safe" />);
    expect(screen.getByText('Safe screen')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
