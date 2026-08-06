// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useRetailerAssets, RETAILER_DOC_SLOTS } from './useRetailerAssets';

/**
 * One draft, however fast the operator picks files.
 *
 * The hook holds `draftId` in state, so every handler closes over the value it
 * had when it was created. Picking the NID and then the trade licence before the
 * first upload answers means BOTH see `null` — and without a gate, each creates
 * its own draft. `setDraftId` runs twice, the last write wins, and the create
 * call claims a draft holding ONE document. The server then refuses with
 * "Upload the National ID" over a file the operator watched upload.
 *
 * These tests drive the real hook against a fake `uploadSlot` whose draft
 * creation is held open, which is the only way to reproduce the overlap.
 */

const createdDrafts: string[] = [];
let releaseDraftCreation: (() => void) | null = null;
let failNext = false;

const uploadSlot = vi.fn(async (opts: Record<string, unknown>) => {
  if (failNext) {
    failNext = false;
    // A rejected file type fails BEFORE any draft is created — the case that
    // would strand every other slot if the gate were not released on failure.
    throw new Error('That file is not supported here.');
  }

  if (opts.draftId == null) {
    // Hold here so a second pick can overlap this one.
    if (releaseDraftCreation) {
      await new Promise<void>((resolve) => {
        const prior = releaseDraftCreation!;
        releaseDraftCreation = () => {
          prior();
          resolve();
        };
      });
    }
    const id = `draft-${createdDrafts.length + 1}`;
    createdDrafts.push(id);
    (opts.onDraftId as (id: string) => void)(id);
  }
  (opts.onSlotUpdate as (s: Record<string, unknown>) => void)({ uploadStatus: 'done' });
});

vi.mock('@/src/services/upload/useUpload', () => ({
  useUpload: () => ({ uploadSlot }),
}));

function pick(name: string) {
  return {
    target: { files: [new File(['x'], name, { type: 'image/png' })] },
  } as unknown as React.ChangeEvent<HTMLInputElement>;
}

beforeEach(() => {
  createdDrafts.length = 0;
  releaseDraftCreation = null;
  failNext = false;
  uploadSlot.mockClear();
});

describe('two files picked before the first draft exists', () => {
  it('creates exactly one draft', async () => {
    let open: (() => void) | null = null;
    releaseDraftCreation = () => {
      open?.();
    };
    const held = new Promise<void>((resolve) => {
      open = resolve;
    });
    void held;

    const { result } = renderHook(() => useRetailerAssets());

    const [nid, trade] = RETAILER_DOC_SLOTS;
    let both: Promise<unknown>;
    act(() => {
      both = Promise.all([
        result.current.onFileSelected(nid.key, nid.purpose, 0)(pick('nid.png')),
        // Picked while the first is still waiting for its draft id — the exact
        // overlap that produced two drafts.
        result.current.onFileSelected(trade.key, trade.purpose, 1)(pick('trade.png')),
      ]);
    });

    // Let the held draft creation through.
    await act(async () => {
      releaseDraftCreation?.();
      await both!;
    });

    expect(createdDrafts).toEqual(['draft-1']);
    // The second upload must have been told which draft to join.
    expect(uploadSlot.mock.calls[1][0].draftId).toBe('draft-1');
  });

  it('both files end up in the same draft the form will submit', async () => {
    const { result } = renderHook(() => useRetailerAssets());
    const [nid, trade] = RETAILER_DOC_SLOTS;

    await act(async () => {
      await Promise.all([
        result.current.onFileSelected(nid.key, nid.purpose, 0)(pick('nid.png')),
        result.current.onFileSelected(trade.key, trade.purpose, 1)(pick('trade.png')),
      ]);
    });

    await waitFor(() => expect(result.current.draftId).toBe('draft-1'));
    expect(createdDrafts).toHaveLength(1);
    // With both landed, nothing is outstanding — the form can submit.
    expect(result.current.missingRequired).toEqual([]);
  });
});

describe('when the first pick fails before a draft exists', () => {
  it('the next file is not stranded waiting for a draft that will never come', async () => {
    // The gate is released in a `finally`, not in the draft callback. Without
    // that, a rejected file type shuts the gate forever and every later slot
    // spins on a promise nothing resolves.
    const { result } = renderHook(() => useRetailerAssets());
    const [nid, trade] = RETAILER_DOC_SLOTS;

    failNext = true;
    await act(async () => {
      await result.current.onFileSelected(nid.key, nid.purpose, 0)(pick('nid.exe'));
    });

    await act(async () => {
      await result.current.onFileSelected(trade.key, trade.purpose, 1)(pick('trade.png'));
    });

    expect(createdDrafts).toEqual(['draft-1']);
    await waitFor(() => expect(result.current.draftId).toBe('draft-1'));
  });
});
