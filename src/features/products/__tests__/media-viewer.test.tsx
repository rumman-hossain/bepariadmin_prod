// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { ProductMediaViewer, type ViewerItem } from '../components/ProductMediaViewer';

/**
 * THE MEDIA VIEWER — an overlay, and the one place a token could still die
 * unseen.
 *
 * Two separate contracts are asserted here.
 *
 * The first is ordinary: the pager shows what it was given, in the order it was
 * given, and a video is a video rather than a broken image.
 *
 * The second is the one worth the file. `yet-another-react-lightbox` draws its
 * own `<img>`, and that element's `onError` is unreachable — `carousel.
 * imageProps` omits it by type, and `Callbacks` has no error member. So the
 * viewer shipped with the exact defect `ProductImage` exists to prevent: a
 * fifteen-minute proxy token expiring behind an open tab and the overlay
 * showing a black rectangle. `render.slide` is the seam that fixes it, and the
 * tests below fail if that wiring is removed.
 */

const TOKEN = '/api/v1/file/tok-front';

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

const IMAGES: ViewerItem[] = [
  { url: TOKEN, kind: 'image', label: 'Front' },
  { url: '/api/v1/file/tok-back', kind: 'image', label: 'Back' },
];

const show = (items: ViewerItem[], openAt: number | null = 0) =>
  render(<ProductMediaViewer items={items} openAt={openAt} onClose={() => {}} />, { wrapper });

/** Only the slide the pager has actually mounted carries a real `src`. */
const images = () => Array.from(document.querySelectorAll('img'));
const srcs = () => images().map((el) => el.getAttribute('src'));

describe('the overlay only exists when it has something to show', () => {
  it('renders nothing while closed', () => {
    show(IMAGES, null);
    expect(document.querySelector('.yarl__root')).toBeNull();
  });

  it('renders nothing when the product has no media at all', () => {
    // A product mid-registration has empty slots. Opening an empty pager would
    // be a black screen with a close button and no way to tell why.
    show([], 0);
    expect(document.querySelector('.yarl__root')).toBeNull();
  });

  it('opens when there is media and an index', () => {
    show(IMAGES);
    expect(document.querySelector('.yarl__root')).not.toBeNull();
  });
});

describe('what the pager shows', () => {
  it('opens on the slide that was clicked, not always the first', () => {
    // The tile that was pressed is the one the operator wants to look at;
    // opening at 0 every time makes the corner action feel broken on the back.
    show(IMAGES, 1);
    expect(srcs()).toContain('/api/v1/file/tok-back');
  });

  it('clamps an index that is out of range instead of showing a blank slide', () => {
    // Slots are sparse — a caller computing an index from a partly-filled media
    // array can hand over a number past the end.
    show(IMAGES, 99);
    expect(srcs()).toContain('/api/v1/file/tok-back');
  });

  it('gives a video slide a <video>, not an <img>', () => {
    show([{ url: '/api/v1/file/tok-clip', kind: 'video', label: 'Clip' }]);
    const video = document.querySelector('video');
    expect(video).not.toBeNull();
    expect(document.querySelector('img')).toBeNull();
  });

  it('does not autoplay a clip', () => {
    // Matches the detail page: an approver decides when to watch.
    show([{ url: '/api/v1/file/tok-clip', kind: 'video' }]);
    expect(document.querySelector('video')?.hasAttribute('autoplay')).toBe(false);
  });
});

describe('a token that expires while the overlay is open', () => {
  /*
   * These are the tests that pin `render.slide`. Delete the `render` prop from
   * ProductMediaViewer and the library draws its own `<img>` — one with no
   * `onError` — so nothing below fires and both fail. That is the point: the
   * wiring is invisible in a screenshot and would rot silently.
   */

  it('refetches instead of leaving a dead frame on screen', async () => {
    show(IMAGES);
    const img = images().find((el) => el.getAttribute('src') === TOKEN);
    expect(img).toBeTruthy();

    fireEvent.error(img!);

    await waitFor(() => expect(invalidate).toHaveBeenCalled());
  });

  it('says the image is broken only after a fresh link also fails', async () => {
    show(IMAGES);
    const img = images().find((el) => el.getAttribute('src') === TOKEN);

    fireEvent.error(img!);

    // The refetch returned the same URL, so the reference itself is bad and
    // the operator is told — rather than staring at an empty black slide.
    await waitFor(() => expect(screen.queryByText(/did not load/i)).not.toBeNull());
  });
});
