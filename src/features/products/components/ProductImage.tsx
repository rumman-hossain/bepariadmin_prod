import { useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/src/design-system/utils/cn';

/**
 * A product photograph that admits when it cannot be loaded.
 *
 * Every product image in the console was a bare `<img>` with no `onError` —
 * only `Avatar.tsx` had one. So a broken URL rendered an empty box, which reads
 * as a styling glitch rather than a fault, and nobody looks for a cause.
 *
 * That is how a live product sat with
 *
 *     <img src="/api/v1/file/lscRDFAi-VrKND4ovAfDow">
 *
 * — a fifteen-minute media token that had been written to the database and
 * expired — until somebody pasted the tag into a message and asked why the
 * image was missing. The stored reference is fixed now; this is what makes the
 * next one visible on the screen it happens on.
 *
 * A missing image and a broken one are DIFFERENT and are not merged here.
 * "Nobody photographed this" is a job for whoever lists the product; "the
 * photograph will not load" is a fault. Callers own the empty case, because
 * only they know what it means in their context — this component is given a
 * `src` and reports whether it worked.
 */
interface Props {
  src: string;
  alt: string;
  className?: string;
  /** Applied to the failed placeholder so it occupies the image's footprint. */
  failedClassName?: string;
  loading?: 'lazy' | 'eager';
}

export function ProductImage({ src, alt, className, failedClassName, loading = 'lazy' }: Props) {
  const [failed, setFailed] = useState(false);

  /*
   * Reset when the source changes. Without it a replaced image inherits the
   * previous one's verdict — the row is reused, so a product whose photograph
   * was just fixed would keep showing the failure.
   */
  const lastSrc = useRef(src);
  if (lastSrc.current !== src) {
    lastSrc.current = src;
    if (failed) setFailed(false);
  }

  if (failed) {
    return (
      <div
        role="img"
        aria-label={`${alt} — image failed to load`}
        title="This image did not load. Its stored reference is broken — re-upload it from the edit screen."
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

  return (
    <img
      src={src}
      alt={alt}
      loading={loading}
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
