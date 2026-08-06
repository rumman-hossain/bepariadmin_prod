import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { saveRetailerChildren } from './useSaveRetailerChildren';
import type { RetailerFormValues } from '../components/RetailerForm';

vi.mock('../api/retailersApi', () => ({
  updateRetailerFinancials: vi.fn(),
  updateRetailerAddresses: vi.fn(),
  attachRetailerDocuments: vi.fn(),
}));

import {
  updateRetailerFinancials,
  updateRetailerAddresses,
  attachRetailerDocuments,
} from '../api/retailersApi';

const EMPTY = {} as RetailerFormValues;

beforeEach(() => {
  vi.mocked(updateRetailerFinancials).mockReset().mockResolvedValue(undefined);
  vi.mocked(updateRetailerAddresses).mockReset().mockResolvedValue(undefined);
  vi.mocked(attachRetailerDocuments).mockReset().mockResolvedValue(undefined);
});

describe('documents uploaded on the edit screen', () => {
  it('binds the draft to the shop', async () => {
    // The bug this exists for: EditPage discarded draftId, so a file uploaded
    // from that screen went into a draft nobody claimed. The slot reported
    // success and no document row was ever written.
    const failed = await saveRetailerChildren('ret-1', EMPTY, 'draft-9');

    expect(attachRetailerDocuments).toHaveBeenCalledWith('ret-1', 'draft-9');
    expect(failed).toEqual([]);
  });

  it('sends nothing when no file was picked', async () => {
    // A save that only corrects a district must not post an empty attach.
    await saveRetailerChildren('ret-1', EMPTY, null);
    expect(attachRetailerDocuments).not.toHaveBeenCalled();

    await saveRetailerChildren('ret-1', EMPTY);
    expect(attachRetailerDocuments).not.toHaveBeenCalled();
  });

  it('names documents among the failures instead of throwing', async () => {
    // Consistent with the addresses and financials: the shop already exists, so
    // throwing would report "could not save" over a save that partly worked.
    vi.mocked(attachRetailerDocuments).mockRejectedValue(new Error('nope'));

    const failed = await saveRetailerChildren('ret-1', EMPTY, 'draft-9');
    expect(failed).toEqual(['documents']);
  });

  it('a failed attach does not stop the addresses saving', async () => {
    vi.mocked(attachRetailerDocuments).mockRejectedValue(new Error('nope'));
    const values = { addresses: [{ district: 'Dhaka', addressLine: 'Shop 12' }] } as RetailerFormValues;

    const failed = await saveRetailerChildren('ret-1', values, 'draft-9');

    expect(updateRetailerAddresses).toHaveBeenCalled();
    expect(failed).toEqual(['documents']);
  });
});

/**
 * WHEN THE SCREEN RE-READS THE SHOP.
 *
 * The live bug: press View straight after adding a document and get "Could not
 * open that document — Resource not found", then find the same button works a
 * minute later.
 *
 * `useUpdateRetailer.onSuccess` invalidates the detail the moment the PATCH
 * returns, which is before any of this runs. The attach then REPLACES the
 * document rows — the server deletes by `doc_type` and re-inserts, so a
 * corrected licence replaces the wrong one instead of sitting beside it — and
 * every replaced document comes back with a NEW id. The screen was left holding
 * ids that had just been deleted.
 *
 * These assert the ORDER, not merely that a refresh happened. A refresh in the
 * wrong place is the bug.
 */
describe('refreshing the cached shop', () => {
  it('happens AFTER the documents attach, never before', async () => {
    const order: string[] = [];
    vi.mocked(attachRetailerDocuments).mockImplementation(async () => {
      order.push('attach');
    });
    const refresh = vi.fn(() => {
      order.push('refresh');
    });

    await saveRetailerChildren('ret-1', EMPTY, 'draft-9', refresh);

    expect(order).toEqual(['attach', 'refresh']);
  });

  it('happens after the addresses too, or the district would be re-read stale', async () => {
    // Refreshing straight after the attach would fix the document ids and
    // reintroduce the same class of bug one step along: a refetch that lands
    // before the addresses are written shows the shop in its old district.
    const order: string[] = [];
    vi.mocked(attachRetailerDocuments).mockImplementation(async () => void order.push('attach'));
    vi.mocked(updateRetailerAddresses).mockImplementation(async () => void order.push('addresses'));
    const refresh = vi.fn(() => void order.push('refresh'));

    const values = { addresses: [{ district: 'Dhaka', addressLine: 'Shop 12' }] } as RetailerFormValues;
    await saveRetailerChildren('ret-1', values, 'draft-9', refresh);

    expect(order).toEqual(['attach', 'addresses', 'refresh']);
  });

  it('happens even when part of the save failed', async () => {
    /*
     * A partial save still changed the row. Leaving the screen on pre-save data
     * would show none of what DID land, next to a message saying some of it did.
     */
    vi.mocked(updateRetailerAddresses).mockRejectedValue(new Error('nope'));
    const refresh = vi.fn();

    const values = { addresses: [{ district: 'Dhaka', addressLine: 'Shop 12' }] } as RetailerFormValues;
    const failed = await saveRetailerChildren('ret-1', values, 'draft-9', refresh);

    expect(failed).toEqual(['addresses']);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('is AWAITED, not fired and forgotten', async () => {
    /*
     * `invalidateQueries` returns a promise and only STARTS a refetch. The first
     * fix discarded it, so the screen navigated to the detail page while the
     * refetch was in flight and the vault rendered the stale cache anyway.
     *
     * Measured live before this line existed: the message improved, the 404 did
     * not go away. Resolving late here proves the wait is real.
     */
    let settled = false;
    const refresh = vi.fn(
      () =>
        new Promise<void>((r) =>
          setTimeout(() => {
            settled = true;
            r();
          }, 5),
        ),
    );

    await saveRetailerChildren('ret-1', EMPTY, 'draft-9', refresh);

    expect(settled, 'saveRetailerChildren returned before the refetch finished').toBe(true);
  });

  it('is optional, so create is not forced to pass one', async () => {
    // Create claims its draft inside the insert transaction and its own
    // mutation invalidates afterwards; there is nothing left to follow.
    await expect(saveRetailerChildren('ret-1', EMPTY, 'draft-9')).resolves.toEqual([]);
  });
});

/**
 * AND THE CALL SITE PASSES ONE.
 *
 * The ordering above is correct and does nothing if the screen never hands the
 * callback over. This project keeps relearning that: the rule gets a test, the
 * one place that uses it does not, and the bug ships between them.
 *
 * `refresh` is optional by necessity — create genuinely has nothing to follow —
 * so the compiler cannot catch a missing argument on edit. This reads the file
 * instead.
 */
describe('EditPage hands the refresh over', () => {
  const source = readFileSync(
    resolve(__dirname, '..', 'pages', 'EditPage.tsx'),
    'utf8',
  );

  it('calls saveRetailerChildren with a fourth argument', () => {
    const call = source.match(/saveRetailerChildren\(([^)]*)\)/);
    expect(call, 'EditPage no longer calls saveRetailerChildren').not.toBeNull();

    const args = call![1].split(',').map((a) => a.trim()).filter(Boolean);
    expect(
      args.length,
      'the edit screen must pass a refresh callback, or the vault keeps document ' +
        'ids the attach deleted and View 404s',
    ).toBe(4);
  });

  it('gets that callback from the hook built for it', () => {
    expect(source).toContain('useRefreshRetailerDetail');
  });

  it('the check itself can fail', () => {
    // A guard that cannot fail reads as coverage.
    const threeArgs = 'const failed = await saveRetailerChildren(id, values, draftId);';
    const args = threeArgs.match(/saveRetailerChildren\(([^)]*)\)/)![1].split(',');
    expect(args.length).toBe(3);
  });
});
