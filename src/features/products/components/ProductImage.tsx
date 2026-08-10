import { AlertTriangle } from 'lucide-react';
import { cn } from '@/src/design-system/utils/cn';
import { useMediaToken } from '../hooks/useMediaToken';

/**
 * A product photograph that recovers from an expired link, and admits defeat
 * when it cannot.
 *
 * Every product image in the console was a bare `<img>` with no `onError` —
 * only `Avatar.tsx` had one — so a broken URL rendered an empty box, which
 * reads as a styling glitch rather than a fault. That is how a live product sat
 * with
 *
 *     <img src="/api/v1/file/lscRDFAi-VrKND4ovAfDow">
 *
 * until somebody pasted the tag into a message and asked why the image was
 * missing.
 *
 * Two different problems hid behind that one empty box, and they are handled
 * differently now:
 *
 *   - the token EXPIRED, which is routine at fifteen minutes and self-heals by
 *     refetching (see useMediaToken); and
 *   - the stored reference is BROKEN, which is a fault and is reported.
 *
 * A MISSING image is a third thing and is not this component's business. "Nobody
 * photographed this" is a job for whoever lists the product, and only the caller
 * knows what an absent image means in its context — this component is given a
 * `src` and reports whether it worked.
 */
interface Props {
  src: string;
  alt: string;
  className?: string;
  /** Applied to the placeholder so it occupies the image's footprint. */
  failedClassName?: string;
  loading?: 'lazy' | 'eager';
}

export function ProductImage({ src, alt, className, failedClassName, loading = 'lazy' }: Props) {
  const { failed, retrying, onError } = useMediaToken(src);

  if (failed) {
    return (
      <div
        role="img"
        aria-label={`${alt} — image failed to load`}
        title="This image did not load, and a fresh link did not help. Its stored reference is broken — re-upload it from the edit screen."
        className={cn(
          'flex flex-col items-center justify-center gap-1.5 rounded-md border border-bad-border bg-bad-wash text-bad',
          failedClassName ?? className,
        )}
      >
        <AlertTriangle className="h-6 w-6" aria-hidden="true" />
        <span className="px-2 text-center text-xs font-medium">Image did not load</span>
      </div>
    );
  }

  /*
   * A quiet placeholder while a replacement link is fetched — NOT the error.
   * An expired token is the normal end of a fifteen-minute life, and flashing
   * "did not load" on the way to recovering teaches operators to distrust a
   * message that is usually wrong.
   */
  if (retrying) {
    return (
      <div
        aria-hidden="true"
        className={cn('animate-pulse rounded-md bg-sheet-2', failedClassName ?? className)}
      />
    );
  }

  return (
    <img src={src} alt={alt} loading={loading} onError={onError} className={className} />
  );
}
