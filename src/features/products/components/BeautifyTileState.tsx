import { AlertTriangle, Sparkles } from 'lucide-react';
import { Text } from '@/src/components/data';
import { useLongWait, type SlotState } from '../hooks/useBeautify';

/**
 * What a media tile looks like while, and after, it is being beautified.
 *
 * An overlay on the tile the operator is already looking at, rather than a
 * modal over the page. A five-colour product is twelve images at ten to thirty
 * seconds each: a blocking dialog would hold the screen for minutes and then
 * present everything at once. Here each tile changes on its own, so there is
 * something to watch from the first result onwards.
 *
 * # It draws, and nothing else
 *
 * The controls it used to carry — peek at the original, redo — are in the
 * tile's own menu now. They were a second pair of small round buttons in the
 * opposite corner from the first four, and on a 75px variant tile there was
 * never room for either row. Everything a tile can do is in one list, opened by
 * clicking the picture.
 *
 * Which is also why every layer here is `pointer-events-none`: they cover the
 * tile, and the tile is the button. A failed tile that swallowed clicks was a
 * failed tile with no way out of it.
 */

interface Props {
  state: SlotState | undefined;
  /** Held down from the menu, to compare against the original. */
  peeking?: boolean;
}

export function BeautifyTileState({ state, peeking = false }: Props) {
  const longWait = useLongWait(state?.status === 'working' ? state.since : undefined);

  if (!state || state.status === 'idle') return null;

  if (state.status === 'queued') {
    return (
      <Overlay>
        <Text variant="caption">
          <span className="text-ink-inverse/80">In line</span>
        </Text>
      </Overlay>
    );
  }

  if (state.status === 'working') {
    return (
      <>
        {/*
          The sheen crosses the photograph itself — the "magic" happening on
          the image rather than beside it. `.beautify-sheen` is brass, not the
          usual purple AI gradient, because this console is a ledger and the
          gradient would be the one foreign thing on the page.

          `aria-hidden`, and the caption below carries the meaning. Motion is
          flattened under prefers-reduced-motion, so a state that existed only
          as movement would vanish for the people most likely to need it
          spelled out.
        */}
        <div
          aria-hidden="true"
          className="beautify-sheen pointer-events-none absolute inset-0 rounded-xl"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center gap-1.5 bg-sheet-inverse/70 px-2 py-1.5">
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-ink-inverse" aria-hidden="true" />
          <span className="text-2xs font-medium text-ink-inverse">
            {longWait ? 'Still working — this can take a minute' : 'Beautifying…'}
          </span>
        </div>
      </>
    );
  }

  if (state.status === 'failed') {
    /*
     * NO "TRY AGAIN" BUTTON. It is gone on purpose.
     *
     * It was never recovering from a failure. The client aborted at fifteen
     * seconds while the server kept working and finished; the button then
     * fetched that finished image through the idempotency key, which is why it
     * "worked" almost every time. A control whose job is to collect something
     * that was already done is a bug wearing a UI.
     *
     * Transport failures are now retried where the operator cannot see them,
     * and the request has three minutes rather than fifteen seconds. What
     * reaches this branch is a real refusal — usually the model declining and
     * saying why — and the answer to that is not to ask again identically. It
     * is to change what was asked, which is what Redo on the ready tile does,
     * and which needs a human to decide.
     */
    return (
      <Overlay>
        <AlertTriangle className="h-5 w-5 text-bad" aria-hidden="true" />
        <span className="px-2 text-center text-2xs font-medium text-ink-inverse">
          {state.message}
        </span>
      </Overlay>
    );
  }

  // Ready. The generated image replaces the tile's own preview, and the menu's
  // "Show the original" lifts it back off again.
  return (
    <>
      {state.job.previewUrl && !peeking && (
        <img
          src={state.job.previewUrl}
          alt=""
          className="pointer-events-none absolute inset-0 h-full w-full animate-fade-in object-cover"
        />
      )}

      {peeking && (
        <span className="pointer-events-none absolute left-1.5 top-1.5 rounded bg-sheet-inverse/70 px-1.5 py-0.5 text-2xs font-medium text-ink-inverse">
          Original
        </span>
      )}
    </>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-sheet-inverse/70">
      {children}
    </div>
  );
}
