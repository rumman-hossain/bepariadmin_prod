import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/src/app/queryClient';

/**
 * A media URL expires while the page is still looking at it.
 *
 * `/api/v1/file/<token>` lives fifteen minutes (internal/media/proxy.go). Every
 * product image is `loading="lazy"`, so on a long list an image scrolled into
 * view sixteen minutes after the page loaded is fetched with a token that is
 * already dead — and a tab left open over lunch loses all of them. Nothing
 * re-minted, so a perfectly healthy row rendered as a broken image.
 *
 * The row is fine. Only the display URL died, and a fresh one is one refetch
 * away. So a 404 on a proxy URL is treated as "this token is stale", not "this
 * image is gone": invalidate the product data, let a new token arrive, and only
 * report failure if THAT one fails too.
 *
 * WHAT STOPS IT LOOPING is the state machine, not a counter.
 *
 * A refetch that returns the same broken reference — which is what a corrupt
 * row does, the `/api/v1/file/` string being what is STORED rather than a
 * `gs://` — settles into `failed`, and neither `failed` nor `retrying` renders
 * an `<img>`. With no element there is no second error, so invalidate → error →
 * invalidate cannot form.
 *
 * A `retriedFor` ref was here first, on the theory that it was the safeguard.
 * It was removed after three mutation runs proved it unreachable: deleting it
 * changed no observable behaviour, because an `<img>` fires `error` once per
 * source and by the time a second one could arrive the element is gone. Dead
 * code that reads like a safeguard is worse than none — the next person trusts
 * it and stops looking for the real one.
 */

/** Only the proxy's own URLs are worth retrying; a blob: or gs:// is not. */
function isProxyURL(src: string): boolean {
  return src.includes('/api/v1/file/');
}

type State = 'ok' | 'retrying' | 'failed';

export function useMediaToken(src: string) {
  const qc = useQueryClient();
  const [state, setState] = useState<State>('ok');

  /*
   * Reset on a new source. Rows are reused as a list re-renders, so without
   * this a replaced image inherits the previous one's verdict and a product
   * whose photograph was just repaired still shows as broken.
   */
  const lastSrc = useRef(src);
  if (lastSrc.current !== src) {
    lastSrc.current = src;
    if (state !== 'ok') setState('ok');
  }

  const onError = async () => {
    if (!isProxyURL(src)) {
      setState('failed');
      return;
    }
    setState('retrying');

    /*
     * `invalidateQueries` resolves once the refetches have settled, which is
     * what makes the check below meaningful rather than a race.
     *
     * If a new token arrived, `src` changed, the reset above already put this
     * back to 'ok', and the guard leaves it alone. If it did not change, the
     * reference itself is broken and the operator needs to be told.
     */
    await qc.invalidateQueries({ queryKey: queryKeys.products.all });
    setState((current) => (current === 'retrying' ? 'failed' : current));
  };

  return {
    /** Report a failure only once a fresh token has also failed. */
    failed: state === 'failed',
    /** True while a replacement token is being fetched — not an error yet. */
    retrying: state === 'retrying',
    onError,
  };
}
