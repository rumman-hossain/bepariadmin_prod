/**
 * A variant's photograph.
 *
 * WHY THIS DID NOT EXIST UNTIL NOW
 *
 * The server has always sent per-variation media — `products.product_media`
 * scoped by `variation_id`, 60 such rows on dev — and two things stopped any of
 * it reaching a screen. First `productVariationSchema` did not declare `media`,
 * so Zod stripped it on arrival. That is fixed. Second, and separately, nothing
 * in the console ever rendered it: there was no component to draw a variant's
 * picture. This is that component.
 *
 * THE FALLBACK IS LABELLED, NOT SILENT
 *
 * A variant with no photograph of its own borrows the product's, and says so.
 * Showing the parent image unmarked would tell an operator this colour has been
 * photographed when it has not — and the whole point of looking is to find the
 * ones that have not been. An unlabelled fallback is a confident lie; a blank
 * box is indistinguishable from a failed load.
 */
import { AlertTriangle, ImageOff } from 'lucide-react';
import { mediaDisplayUrl } from '@/src/utils/mediaUrl';
import { cn } from '@/src/design-system/utils/cn';
import { useMediaToken } from '../hooks/useMediaToken';

interface VariantLike {
  subName?: string | null;
  color?: string | null;
  design?: string | null;
  photoUrl?: string | null;
  media?: Array<{ url: string; mediaType?: string | null }> | null;
}

interface Props {
  variant: VariantLike;
  /** The product's own image, borrowed when the variant has none. */
  fallback?: string | null;
  size?: 'sm' | 'md';
}

/**
 * The variant's own image, if it has one.
 *
 * `media[]` first — it is the real per-variation table and carries ordering.
 * `photoUrl` is the older single-image column and still populated on rows
 * created before the media table, so it is the second look rather than dead.
 * Videos are skipped: this is a thumbnail, and a `<video>` poster frame is not
 * what a scanning eye needs.
 */
function ownImage(v: VariantLike): string | null {
  const fromMedia = v.media?.find((m) => (m.mediaType ?? 'image') === 'image')?.url;
  return mediaDisplayUrl(fromMedia ?? v.photoUrl);
}

export function VariantThumb({ variant, fallback, size = 'sm' }: Props) {
  const own = ownImage(variant);
  const borrowed = own ? null : mediaDisplayUrl(fallback);
  const src = own ?? borrowed;

  const label = [variant.color, variant.design].filter(Boolean).join(' · ') || variant.subName || '';
  const box = size === 'md' ? 'h-12 w-12' : 'h-9 w-9';

  /*
   * A URL THAT WAS SUPPOSED TO WORK AND DID NOT.
   *
   * The note at the top of this file already says it — "a blank box is
   * indistinguishable from a failed load" — and then nothing listened for the
   * failure, so that is exactly what shipped. A product carrying an expired
   * media token rendered an empty square that reads like a styling glitch, and
   * it took someone pasting the <img> tag into a message for anyone to find
   * out.
   *
   * Distinct from the no-image state below: "nobody photographed this" and
   * "the photograph will not load" are different problems with different
   * owners, and a shared empty box hides which one you have.
   */
  const { failed, retrying, onError } = useMediaToken(src ?? '');

  // Recovering from an expired link, not an error. See useMediaToken.
  if (src && retrying) {
    return <span className={cn(box, 'shrink-0 animate-pulse rounded-sm bg-sheet-2')} />;
  }

  if (src && failed) {
    return (
      <span
        className={cn(
          box,
          'flex shrink-0 items-center justify-center rounded-sm border border-bad-border bg-bad-wash text-bad',
        )}
        title="This image did not load. Its stored reference is broken — re-upload it from the edit screen."
      >
        <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="sr-only">Image failed to load</span>
      </span>
    );
  }

  if (!src) {
    return (
      <span
        className={cn(
          box,
          'flex shrink-0 items-center justify-center rounded-sm border border-dashed border-rule-strong bg-sheet-2 text-ink-4',
        )}
        title="No photograph for this variant, and the product has none either"
      >
        <ImageOff className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="sr-only">No image</span>
      </span>
    );
  }

  return (
    <span className={cn('relative shrink-0', box)}>
      <img
        src={src}
        alt={label ? `${label} variant` : ''}
        onError={onError}
        loading="lazy"
        className={cn(
          box,
          'rounded-sm border object-cover',
          // A borrowed image is drawn differently from an owned one, so the
          // difference survives being glanced at rather than read.
          borrowed ? 'border-dashed border-warn-border opacity-70' : 'border-rule',
        )}
      />
      {borrowed && (
        <>
          <span
            aria-hidden="true"
            className="absolute -bottom-0.5 -right-0.5 rounded-full border border-sheet bg-warn px-1 text-2xs font-bold leading-tight text-sheet"
            title="Using the product image — this variant has no photograph of its own"
          >
            P
          </span>
          <span className="sr-only">Using the product image; this variant has none of its own</span>
        </>
      )}
    </span>
  );
}
