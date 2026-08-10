import { useMemo } from 'react';
import Lightbox, { type RenderSlideProps, type Slide } from 'yet-another-react-lightbox';
import Video from 'yet-another-react-lightbox/plugins/video';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import Counter from 'yet-another-react-lightbox/plugins/counter';
import 'yet-another-react-lightbox/styles.css';
import 'yet-another-react-lightbox/plugins/counter.css';
import { useMediaToken } from '../hooks/useMediaToken';

/**
 * The product's media, full screen, over whatever screen you were on.
 *
 * An OVERLAY, not a route: opening it changes no URL and closes back to exactly
 * the same scroll position. The media screens already show thumbnails; the only
 * thing missing was a way to actually look at one.
 *
 * Images and video share ONE pager, so an operator reviewing a listing flicks
 * through the poster, the shots and the clip without leaving the overlay or
 * hunting for a separate video control. That is the point of the popup — a
 * reviewer's question is "does this product look right", and answering it meant
 * squinting at a 40px thumbnail.
 *
 * # Why a library
 *
 * Dialog.tsx could host this, and then the work would be a pager, pinch-zoom,
 * pointer-drag, keyboard paging, focus trapping and a video lifecycle — each of
 * which is where hand-rolled lightboxes go wrong. This one is self-contained
 * with no external requests, which the console's strict CSP requires: `img-src`
 * and `media-src` are `'self' data: blob:` plus the storage host, and nothing
 * here reaches past that.
 */

/** One item of product media, in the order it should be paged through. */
export interface ViewerItem {
  /** A URL a browser can load — a proxy token path, never a `gs://`. */
  url: string;
  kind: 'image' | 'video';
  /** Shown in the counter row: "Poster", "Red · front". */
  label?: string;
  /** Still frame for a video slide. Optional; the clip plays regardless. */
  poster?: string;
}

interface Props {
  items: ViewerItem[];
  /** Index to open at, or null when the viewer is closed. */
  openAt: number | null;
  onClose: () => void;
}

/**
 * One image slide, drawn by us rather than by the library, for one reason: the
 * library's `<img>` has no reachable `onError`.
 *
 * `carousel.imageProps` explicitly omits it (`ImageProps` in the library's
 * types), and `Callbacks` has no error member — the slide's error status is an
 * internal event only a plugin can hear. So a proxy token that reached its
 * fifteen minutes while the tab sat open produced a black rectangle in the
 * overlay, which is exactly the failure `ProductImage` was written to end. The
 * viewer would have been the one place in the console still showing it.
 *
 * `render.slide` is safe to take over. Video's own handler delegates any
 * non-video slide straight to it, and Zoom calls it BEFORE its default image
 * slide and then wraps whatever comes back in the zoom transform — so pan and
 * zoom survive. `yarl__slide_image` is the library's public styling hook and is
 * load-bearing, not cosmetic: it carries `--yarl__controller_touch_action`,
 * without which drag-to-pan does nothing.
 *
 * Recovery is only as good as where the caller's items come from. Query-backed
 * screens re-mint and the new token flows back in; the wizard builds items from
 * its own store, so there the honest outcome is a stated failure instead of a
 * black frame. Either way the operator is no longer looking at a blank slide
 * wondering whether the product is broken.
 */
function ViewerImageSlide({ src, alt }: { src: string; alt: string }) {
  const { failed, retrying, onError } = useMediaToken(src);

  if (failed) {
    return (
      <div role="status" className="flex flex-col items-center gap-2 px-6 text-center">
        <span className="text-sm font-medium text-ink-inverse">This image did not load</span>
        <span className="text-xs text-ink-inverse/70">
          A fresh link did not help — its stored reference is broken.
        </span>
      </div>
    );
  }

  if (retrying) {
    // Deliberately not the failure copy: an expired token is the normal end of
    // a fifteen-minute life, and announcing a fault on the way to recovering
    // teaches operators to disbelieve the message when it is real.
    return <div aria-hidden="true" className="h-24 w-24 animate-pulse rounded-md bg-sheet-2/20" />;
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={onError}
      draggable={false}
      className="yarl__slide_image"
    />
  );
}

export function ProductMediaViewer({ items, openAt, onClose }: Props) {
  const slides = useMemo<Slide[]>(
    () =>
      items.map((item) =>
        item.kind === 'video'
          ? {
              type: 'video',
              // No width/height: these are supplier phone clips of unknown
              // dimensions, and asserting a wrong aspect ratio letterboxes the
              // product rather than the background.
              poster: item.poster,
              sources: [{ src: item.url, type: 'video/mp4' }],
              description: item.label,
            }
          : { type: 'image', src: item.url, alt: item.label ?? '', description: item.label },
      ),
    [items],
  );

  /*
   * Returning nothing for a non-image slide is what hands it back to the Video
   * plugin — both plugins treat a falsy result as "not mine to draw".
   */
  const render = useMemo(
    () => ({
      slide: ({ slide }: RenderSlideProps) =>
        slide.type === 'image' && typeof slide.src === 'string' ? (
          <ViewerImageSlide src={slide.src} alt={typeof slide.alt === 'string' ? slide.alt : ''} />
        ) : undefined,
    }),
    [],
  );

  if (openAt === null || items.length === 0) return null;

  return (
    <Lightbox
      open
      close={onClose}
      index={Math.min(Math.max(openAt, 0), items.length - 1)}
      slides={slides}
      render={render}
      plugins={[Video, Zoom, Counter]}
      /*
       * `controls` and no autoplay, matching the detail page's existing rule:
       * an approver decides when to watch a clip. `playsInline` keeps iOS from
       * hijacking it into its own fullscreen player, which would escape this
       * overlay and lose the pager.
       */
      video={{ controls: true, autoPlay: false, playsInline: true, preload: 'metadata' }}
      /* Pointer-drag and wheel to zoom; the default double-tap is kept. */
      zoom={{ maxZoomPixelRatio: 4, scrollToZoom: true }}
      /*
       * Backdrop click closes. Escape and the X are the library's defaults, and
       * `closeOnBackdropClick` completes the three ways out the spec asks for.
       */
      controller={{ closeOnBackdropClick: true }}
      /* A single slide should still page-wrap silently rather than bounce. */
      carousel={{ finite: items.length <= 1 }}
      styles={{
        // Dark enough to read a product against, not pure black — a white
        // studio background on white-on-black reads as a blown-out crop.
        container: { backgroundColor: 'rgba(11, 11, 12, 0.94)' },
      }}
    />
  );
}
