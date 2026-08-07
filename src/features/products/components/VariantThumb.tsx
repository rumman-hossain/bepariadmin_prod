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
import { ImageOff } from 'lucide-react';
import { mediaDisplayUrl } from '@/src/utils/mediaUrl';
import { cn } from '@/src/design-system/utils/cn';

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
