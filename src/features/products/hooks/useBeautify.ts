import { useCallback, useRef, useState } from 'react';
import {
  runBeautify,
  commitBeautify,
  discardBeautify,
  type BeautifyJob,
  type BeautifyMode,
  type BeautifySide,
} from '@/src/api/beautify';

/**
 * Running a beautify pass over a whole product, one tile at a time.
 *
 * # Why this fans out instead of making one call
 *
 * A non-variant product is two images; a five-colour product is twelve, at
 * roughly ten to thirty seconds each. As a single request that is minutes of
 * silence, past any sane timeout, and — the part that decides the design — the
 * console would learn every result at the very end, so tiles could not appear
 * one by one and the operator would be watching a spinner with nothing to look
 * at.
 *
 * One request per image instead. Each response updates its own tile the moment
 * it lands, so thirty seconds in there is already something on screen. Three in
 * flight at a time, because twelve simultaneous sockets against an endpoint
 * that holds each one open for half a minute is not politeness, it is a
 * self-inflicted queue.
 *
 * # A redo is the same call
 *
 * The server keys on what changes the picture, so redoing one tile with a new
 * description is `run` again for that slot. Nothing here needs a second code
 * path for it.
 */

/** One tile's slot in a run. */
export interface BeautifySlot {
  /** Empty for the product's own pair. */
  variationId: string;
  side: BeautifySide;
  /** Shown while the tile works: "Front", "Red · back". */
  label: string;
  /**
   * The current photograph, so the run can be watched without scrolling to
   * the tile it belongs to. See BeautifyStrip — the button sits above the
   * fold and the tiles below it, which made pressing it look like nothing
   * happened.
   */
  thumbUrl?: string;
}

export type SlotState =
  | { status: 'idle' }
  | { status: 'queued' }
  | { status: 'working' }
  | { status: 'ready'; job: BeautifyJob }
  | { status: 'failed'; message: string };

/** Tiles are addressed by variation and side; the product is the empty one. */
export function slotKey(variationId: string, side: BeautifySide): string {
  return `${variationId}:${side}`;
}

/**
 * Split a media tile's `purpose` into the slot it beautifies, or null.
 *
 * Only fronts and backs are beautified — a poster, a detail shot and a video
 * are left alone, because the feature's whole rule is about the front/back
 * pair. The purpose string already encodes which variation and which side a
 * tile is, so deriving the slot from it avoids inventing a second identity
 * that has to be kept in step with the first.
 *
 * Here rather than in Step4Media so that file exports only components, which
 * is what keeps fast refresh working.
 */
export function beautifySlotFromPurpose(
  purpose: string,
): { variationId: string; side: BeautifySide } | null {
  if (purpose === 'product:front') return { variationId: '', side: 'front' };
  if (purpose === 'product:back') return { variationId: '', side: 'back' };
  const m = /^variation:(.+):(front|back)$/.exec(purpose);
  if (m) return { variationId: m[1], side: m[2] as BeautifySide };
  return null;
}

/** Concurrency cap. See the note above about twelve open sockets. */
const MAX_IN_FLIGHT = 3;

interface RunOptions {
  productId: string;
  mode: BeautifyMode;
  /** Required for With Model, ignored otherwise. */
  modelDescription: string;
  slots: BeautifySlot[];
}

export function useBeautify() {
  const [states, setStates] = useState<Record<string, SlotState>>({});
  const [running, setRunning] = useState(false);

  /*
   * A run is cancelled by incrementing this rather than by an AbortController.
   * The requests themselves are worth letting finish — the server has already
   * been paid for whatever they produce, and the audit row exists either way —
   * but their results must not land on a screen the operator has moved on
   * from. Comparing the generation on arrival does that without throwing away
   * work already bought.
   */
  const generation = useRef(0);

  const setSlot = useCallback((key: string, state: SlotState) => {
    setStates((prev) => ({ ...prev, [key]: state }));
  }, []);

  const runOne = useCallback(
    async (opts: RunOptions, slot: BeautifySlot, gen: number) => {
      const key = slotKey(slot.variationId, slot.side);
      if (gen !== generation.current) return;
      setSlot(key, { status: 'working' });

      const res = await runBeautify({
        productId: opts.productId,
        variationId: slot.variationId || undefined,
        side: slot.side,
        mode: opts.mode,
        // Only a front in with_model uses it. Sent unconditionally would put it
        // in the request for backs too, which the server drops — but sending it
        // where it has no meaning invites the next reader to think it does.
        modelDescription:
          slot.side === 'front' && opts.mode === 'with_model'
            ? opts.modelDescription
            : undefined,
      }).catch((err: unknown) => ({
        ok: false as const,
        status: 0,
        data: { message: err instanceof Error ? err.message : 'Request failed' },
      }));

      if (gen !== generation.current) return;

      if (res.ok && 'data' in res.data && res.data.data) {
        setSlot(key, { status: 'ready', job: res.data.data });
        return;
      }
      const message =
        (res.data as { message?: string })?.message ?? 'This image could not be generated.';
      setSlot(key, { status: 'failed', message });
    },
    [setSlot],
  );

  /**
   * Start a run over every slot, at most MAX_IN_FLIGHT at once.
   *
   * A hand-rolled worker pool rather than chunked Promise.all: chunking waits
   * for the slowest image in each group of three before starting the next
   * three, which on a twelve-image product wastes most of the parallelism it
   * appears to buy. Workers pull from a shared index, so a fast tile
   * immediately frees its slot.
   */
  const run = useCallback(
    async (opts: RunOptions) => {
      generation.current += 1;
      const gen = generation.current;

      setStates(
        Object.fromEntries(
          opts.slots.map((s) => [slotKey(s.variationId, s.side), { status: 'queued' } as SlotState]),
        ),
      );
      setRunning(true);

      let next = 0;
      const worker = async () => {
        for (;;) {
          const i = next++;
          if (i >= opts.slots.length || gen !== generation.current) return;
          await runOne(opts, opts.slots[i], gen);
        }
      };
      await Promise.all(
        Array.from({ length: Math.min(MAX_IN_FLIGHT, opts.slots.length) }, worker),
      );

      if (gen === generation.current) setRunning(false);
    },
    [runOne],
  );

  /** Redo one tile, typically with a correction the operator typed. */
  const redo = useCallback(
    async (opts: RunOptions, slot: BeautifySlot) => {
      setRunning(true);
      await runOne(opts, slot, generation.current);
      setRunning(false);
    },
    [runOne],
  );

  /** Everything the operator can currently accept. */
  const readyJobs = useCallback(
    () =>
      Object.values(states)
        .filter((s): s is Extract<SlotState, { status: 'ready' }> => s.status === 'ready')
        .map((s) => s.job),
    [states],
  );

  const commit = useCallback(
    async (productId: string) => {
      const ids = readyJobs().map((j) => j.id);
      if (ids.length === 0) return { ok: false as const, applied: 0 };
      const res = await commitBeautify(productId, ids);
      if (res.ok) {
        // The previews are the product's images now, so the review state has
        // nothing left to show. Clearing it here rather than leaving stale
        // "ready" tiles that invite a second Apply.
        generation.current += 1;
        setStates({});
      }
      return { ok: res.ok, applied: ids.length };
    },
    [readyJobs],
  );

  const discard = useCallback(async (productId: string) => {
    generation.current += 1;
    setStates({});
    setRunning(false);
    await discardBeautify(productId);
  }, []);

  const total = Object.keys(states).length;
  const done = Object.values(states).filter(
    (s) => s.status === 'ready' || s.status === 'failed',
  ).length;

  return {
    states,
    running,
    /** For the live region: "6 of 12 ready". */
    progress: { done, total },
    run,
    redo,
    commit,
    discard,
    readyJobs,
  };
}
