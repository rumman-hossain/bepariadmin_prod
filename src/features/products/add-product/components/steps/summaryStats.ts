import { formatMoney } from '@/src/components/data';
import type { ProductVariation, ProductMediaState } from '../../../types/registration';

/*
 * The review step's pure logic, lifted out of the component.
 *
 * `countProductMedia` walks the product's own five slots, its extra slots
 * and every variation's media to decide whether the operator is told their
 * product has images, video, or an upload still in flight. Inside a
 * 500-line component that arithmetic could not be tested at all.
 */

/**
 * Money for this screen, on the shared formatter.
 *
 * It used to call `formatCurrency`, which renders `BDT 482,150.00` — Western
 * 3-3 grouping and a currency code where a symbol belongs. So the final step of
 * the product wizard, the screen where an operator confirms prices before
 * publishing, showed money in a different format from every other screen in the
 * console.
 *
 * Paisa are shown because product prices carry them (4,821.50) and this screen
 * displays base and retail side by side with a margin between them — rounding
 * would make the two disagree with the percentage stated next to them.
 *
 * The empty dash is kept: a price of zero on a review screen means "not set",
 * and rendering it as ৳0 asserts a price nobody entered.
 */
export function summaryMoney(value: string | number): string {
  const n = typeof value === 'number' ? value : Number(value || 0);
  if (!n) return '—';
  return formatMoney(n, { decimals: true });
}

export interface ProductMediaCounts {
  mainCount: number;
  extraCount: number;
  variationImagesCount: number;
  totalImageCount: number;
  hasVideo: boolean;
  pendingCount: number;
}

export function countProductMedia(
  productMedia: ProductMediaState,
  variations: ProductVariation[],
): ProductMediaCounts {
  const mainCount = [
    productMedia.front.localUri || productMedia.front.uploadedUrl,
    productMedia.back.localUri || productMedia.back.uploadedUrl,
    productMedia.left.localUri || productMedia.left.uploadedUrl,
    productMedia.right.localUri || productMedia.right.uploadedUrl,
    productMedia.poster.localUri || productMedia.poster.uploadedUrl,
  ].filter(Boolean).length;

  const extraCount = productMedia.more.filter((m) => m.localUri || m.uploadedUrl).length;

  const variationImagesCount = variations.reduce((acc, v) => {
    const media = v.media as ProductMediaState | undefined;
    if (!media) return acc;
    const vMain = [media.front, media.back].filter((s) => s?.localUri || s?.uploadedUrl).length;
    const vExtra = media.more?.filter((m) => m.localUri || m.uploadedUrl).length ?? 0;
    return acc + vMain + vExtra;
  }, 0);

  const hasVideo =
    !!(productMedia.video.localUri || productMedia.video.uploadedUrl) ||
    variations.some((v) => {
      const media = v.media as ProductMediaState | undefined;
      return !!(media?.video?.localUri || media?.video?.uploadedUrl);
    });

  const pendingCount =
    [productMedia.front, productMedia.back, productMedia.poster, productMedia.left, productMedia.right, productMedia.video, ...productMedia.more].filter(
      (s) => s.uploadStatus === 'uploading',
    ).length +
    variations.reduce((acc, v) => {
      const media = v.media as ProductMediaState | undefined;
      if (!media) return acc;
      return acc + [media.front, media.back, media.video, ...(media.more ?? [])].filter((s) => s?.uploadStatus === 'uploading').length;
    }, 0);

  return { mainCount, extraCount, variationImagesCount, totalImageCount: mainCount + extraCount + variationImagesCount, hasVideo, pendingCount };
}
