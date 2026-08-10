// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { ProductImage } from '../components/ProductImage';

/**
 * A MEDIA LINK DIES WHILE THE PAGE IS STILL LOOKING AT IT.
 *
 * `/api/v1/file/<token>` lives fifteen minutes. Every product image is
 * `loading="lazy"`, so on a long list an image scrolled into view sixteen
 * minutes after the page loaded fetches an already-dead token — and a tab left
 * open over lunch loses all of them. Nothing re-minted, so a perfectly healthy
 * product rendered as a broken image.
 *
 * The row is fine; only the display URL expired. An expiry is routine and must
 * self-heal. A genuinely broken reference must be reported. Telling those two
 * apart is the whole job.
 */

const TOKEN = '/api/v1/file/expired-token';

let client: QueryClient;
let invalidate: ReturnType<typeof vi.fn>;

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  invalidate = vi.fn(async () => {});
  client.invalidateQueries = invalidate as never;
});
afterEach(cleanup);

const show = (src = TOKEN) =>
  render(<ProductImage src={src} alt="ggg" className="h-10 w-10" />, { wrapper });

const img = () => document.querySelector('img') as HTMLImageElement;
const errorShown = () => screen.queryByText(/did not load/i);

describe('an expired token is refetched, not reported', () => {
  it('asks for fresh product data instead of failing outright', async () => {
    show();
    fireEvent.error(img());
    await waitFor(() => expect(invalidate).toHaveBeenCalled());
  });

  it('says nothing to the operator WHILE it recovers', async () => {
    /*
     * Flashing "did not load" on the way to succeeding teaches people to
     * distrust a message that is usually wrong.
     *
     * The refetch is held open deliberately. With an instantly-resolving stub
     * the retry window closes inside the same tick and this asserts nothing —
     * which is exactly how the first version of this test passed while proving
     * the opposite of its name.
     */
    let release!: () => void;
    invalidate.mockImplementation(() => new Promise<void>((r) => { release = r; }));

    show();
    fireEvent.error(img());

    await waitFor(() => expect(invalidate).toHaveBeenCalled());
    expect(errorShown()).toBeNull();
    // And no broken <img> left on screen either — a placeholder stands in.
    expect(document.querySelector('img')).toBeNull();

    release();
  });

  it('renders the image again once a new token arrives', async () => {
    const { rerender } = show();
    fireEvent.error(img());
    await waitFor(() => expect(invalidate).toHaveBeenCalled());

    rerender(<ProductImage src="/api/v1/file/fresh-token" alt="ggg" className="h-10 w-10" />);

    await waitFor(() => expect(img()).toBeTruthy());
    expect(errorShown()).toBeNull();
  });
});

describe('a reference that is genuinely broken', () => {
  it('is reported once the fresh token fails too', async () => {
    show();
    fireEvent.error(img()); // expiry — refetch
    await waitFor(() => expect(invalidate).toHaveBeenCalled());
    // The refetch returned the same URL, so the row itself is broken.
    await waitFor(() => expect(errorShown()).not.toBeNull());
  });

  it('cannot loop, because a failed image stops being an image', async () => {
    /*
     * The feared failure is invalidate → refetch → same src → error →
     * invalidate, hammering the API for as long as the page is open.
     *
     * What prevents it is that neither `retrying` nor `failed` renders an
     * `<img>`: with no element there is no second error. This asserts that
     * directly rather than counting calls, because a call count cannot
     * distinguish "the guard worked" from "nothing tried again anyway" — a
     * `retriedFor` ref was removed from this hook after three mutation runs
     * showed deleting it changed nothing observable.
     */
    show();
    fireEvent.error(img());

    await waitFor(() => expect(errorShown()).not.toBeNull());
    expect(invalidate).toHaveBeenCalledTimes(1);
    // The thing that closes the loop: nothing is left that can fire `error`.
    expect(document.querySelector('img')).toBeNull();
  });

  it('points at the fix, not just the symptom', async () => {
    show();
    fireEvent.error(img());
    await waitFor(() => expect(errorShown()).not.toBeNull());
    const el = screen.getByRole('img', { name: /ggg/i });
    expect(el.getAttribute('title')).toMatch(/re-upload/i);
  });
});

describe('a url that is not a proxy token', () => {
  it('fails immediately rather than refetching for nothing', async () => {
    // A blob: preview or a gs:// cannot be fixed by minting a new token, so
    // spending a full product refetch on one is pure waste.
    show('blob:https://www.dev.bepari-bd.com/abc');
    fireEvent.error(img());
    await waitFor(() => expect(errorShown()).not.toBeNull());
    expect(invalidate).not.toHaveBeenCalled();
  });
});

describe('an image that simply works', () => {
  /*
   * Folded in from a-broken-image-says-so.test.tsx, which was written before
   * the retry existed and asserted that a failure was reported immediately.
   * That is no longer true and should not be: an expired token recovers. Two
   * files testing one component to two different contracts is how a stale
   * expectation survives.
   */
  it('renders the image and says nothing', () => {
    show();
    expect(img()).toBeTruthy();
    expect(errorShown()).toBeNull();
  });

  it('is lazy by default, because lists of them are long', () => {
    show();
    expect(img().getAttribute('loading')).toBe('lazy');
  });

  it('clears a failure when the source changes', async () => {
    // Rows are reused. Without the reset a product whose photograph was just
    // repaired inherits the previous row's verdict.
    const { rerender } = show();
    fireEvent.error(img());
    await waitFor(() => expect(errorShown()).not.toBeNull());

    rerender(<ProductImage src="/api/v1/file/fresh" alt="ggg" className="h-10 w-10" />);

    expect(errorShown()).toBeNull();
    expect(img()).toBeTruthy();
  });
});
