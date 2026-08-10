import { useState } from 'react';
import { AlertTriangle, Eye, RotateCcw, Sparkles } from 'lucide-react';
import { Button, Textarea } from '@/src/components/controls';
import { Dialog } from '@/src/components/feedback';
import { Text } from '@/src/components/data';
import { cn } from '@/src/design-system/utils/cn';
import type { SlotState } from '../hooks/useBeautify';

/**
 * What a media tile looks like while, and after, it is being beautified.
 *
 * An overlay on the tile the operator is already looking at, rather than a
 * modal over the page. A five-colour product is twelve images at ten to thirty
 * seconds each: a blocking dialog would hold the screen for minutes and then
 * present everything at once. Here each tile changes on its own, so there is
 * something to watch from the first result onwards.
 */

interface Props {
  state: SlotState | undefined;
  /** Announced to a screen reader as part of the redo control's name. */
  label: string;
  onRedo: (note: string) => void;
}

export function BeautifyTileState({ state, label, onRedo }: Props) {
  const [redoOpen, setRedoOpen] = useState(false);
  const [peeking, setPeeking] = useState(false);

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
          <span className="text-2xs font-medium text-ink-inverse">Beautifying…</span>
        </div>
      </>
    );
  }

  if (state.status === 'failed') {
    return (
      <Overlay>
        <AlertTriangle className="h-5 w-5 text-bad" aria-hidden="true" />
        <span className="px-2 text-center text-2xs font-medium text-ink-inverse">
          {state.message}
        </span>
        <Button variant="secondary" size="sm" onClick={() => setRedoOpen(true)}>
          Try again
        </Button>
        <RedoDialog
          open={redoOpen}
          label={label}
          onClose={() => setRedoOpen(false)}
          onConfirm={(note) => {
            setRedoOpen(false);
            onRedo(note);
          }}
        />
      </Overlay>
    );
  }

  // Ready. The generated image replaces the tile's own preview; these are the
  // two things the operator can do with it.
  return (
    <>
      {state.job.previewUrl && !peeking && (
        <img
          src={state.job.previewUrl}
          alt=""
          className="absolute inset-0 h-full w-full animate-fade-in object-cover"
        />
      )}

      <div className="absolute bottom-1.5 left-1.5 flex gap-1">
        {/*
          Press and hold to see the original. Cheaper than a second control
          and it reads as "peek" — the comparison people actually want is
          "did this change what I think it changed". The full comparison is
          the tile's existing full-screen action, which pages before and
          after as adjacent slides.

          Both pointer and keyboard: a hover-only affordance does not exist on
          a touch screen, and focus/blur gives the same behaviour to somebody
          tabbing through.
        */}
        <button
          type="button"
          aria-label={`Show the original ${label}`}
          className="rounded-md bg-sheet/90 p-1.5 text-ink hover:bg-sheet"
          onPointerDown={() => setPeeking(true)}
          onPointerUp={() => setPeeking(false)}
          onPointerLeave={() => setPeeking(false)}
          onFocus={() => setPeeking(true)}
          onBlur={() => setPeeking(false)}
        >
          <Eye className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label={`Redo ${label}`}
          className="rounded-md bg-sheet/90 p-1.5 text-ink hover:bg-sheet"
          onClick={() => setRedoOpen(true)}
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>

      {peeking && (
        <span className="absolute left-1.5 top-1.5 rounded bg-sheet-inverse/70 px-1.5 py-0.5 text-2xs font-medium text-ink-inverse">
          Original
        </span>
      )}

      <RedoDialog
        open={redoOpen}
        label={label}
        onClose={() => setRedoOpen(false)}
        onConfirm={(note) => {
          setRedoOpen(false);
          onRedo(note);
        }}
      />
    </>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-sheet-inverse/70">
      {children}
    </div>
  );
}

interface RedoProps {
  open: boolean;
  label: string;
  onClose: () => void;
  onConfirm: (note: string) => void;
}

/**
 * The correction field, attached to the image being corrected.
 *
 * One global box would be ambiguous the moment there is more than one tile:
 * "the hem is cut off" is about a particular picture, and a run has twelve.
 *
 * Shaped after ReasonDialog, and using Dialog's `isDirty` guard for the same
 * reason it does — a stray click on the backdrop must not throw away a
 * correction somebody was halfway through typing.
 */
function RedoDialog({ open, label, onClose, onConfirm }: RedoProps) {
  const [note, setNote] = useState('');

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="sm"
      title={`Redo ${label}`}
      isDirty={note.trim().length > 0}
      discardMessage="The note you have written will be lost."
    >
      <div className={cn('space-y-4')}>
        <Textarea
          label="What should change?"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          maxLength={300}
          placeholder="the hem is cut off — show the whole garment"
        />
        {/* Redo is the only control here that spends money, and it is the one
            an impatient operator will press repeatedly. */}
        <Text variant="caption">This generates a new image and costs about $0.07.</Text>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" size="md" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="md" onClick={() => onConfirm(note.trim())}>
            Generate again
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
