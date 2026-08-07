import { describe, it, expect, beforeEach } from 'vitest';
import {
  useAddProductStore,
  emptySlot,
  pruneToSizes,
  countOrphanedSizes,
} from '../useAddProductStore';

/**
 * Two data-integrity bugs, pinned.
 *
 * Both were found by comparing this store against the mobile app's, which is
 * the same wizard over the same 54 fields. One of them is still live there.
 */

const store = () => useAddProductStore.getState();

beforeEach(() => {
  useAddProductStore.getState().reset();
});

describe('media changes are tracked so an edit cannot silently drop a required image', () => {
  /*
   * The mobile app's own note: a per-slot delete never touches `draftId`, so
   * `hasNewMedia` cannot detect one — "an edit that deletes a mandatory image
   * and submits would otherwise silently save an incomplete product." The admin
   * console had no equivalent flag at all.
   */
  it('starts clean', () => {
    expect(store().mediaDirty).toBe(false);
  });

  it('marks dirty when the user picks an image', () => {
    store().setProductMediaSlot('front', { localUri: 'file:///picked.jpg' });
    expect(store().mediaDirty).toBe(true);
  });

  it('marks dirty when the user CLEARS a slot — the case that was undetectable', () => {
    store().clearProductMediaSlot('back');
    expect(store().mediaDirty).toBe(true);
  });

  it('marks dirty when a gallery slot is removed', () => {
    store().addProductMoreSlots([emptySlot()]);
    useAddProductStore.setState({ mediaDirty: false });

    store().removeProductMoreSlot(0);
    expect(store().mediaDirty).toBe(true);
  });

  /*
   * THE OTHER HALF, and the reason this is not simply "set dirty on every
   * write". The upload engine advances `uploadStatus` and `uploadedUrl` in the
   * background through these same setters. If those counted, a product would
   * become dirty merely by watching its own uploads finish, and the flag would
   * mean nothing.
   *
   * The discriminator is `'localUri' in slot`: user actions always carry one,
   * progress updates never do.
   */
  it('does NOT mark dirty for background upload progress', () => {
    store().setProductMediaSlot('front', { uploadStatus: 'uploading' });
    store().setProductMediaSlot('front', { uploadStatus: 'done', uploadedUrl: 'https://x/y.jpg' });
    expect(store().mediaDirty).toBe(false);
  });

  it('treats an empty localUri as a user clear, not a progress update', () => {
    // This is how an in-place clear arrives: an explicit empty path.
    store().setProductMediaSlot('front', { localUri: '' });
    expect(store().mediaDirty).toBe(true);
  });

  it('can be marked explicitly, for deletes that go through setField', () => {
    // Removing a whole variation takes its media with it, but goes through the
    // generic field setter and so cannot self-detect.
    store().markMediaDirty();
    expect(store().mediaDirty).toBe(true);
  });

  it('resets on reset and on hydrate', () => {
    store().clearProductMediaSlot('front');
    expect(store().mediaDirty).toBe(true);

    store().reset();
    expect(store().mediaDirty).toBe(false);

    store().clearProductMediaSlot('front');
    store().hydrate({ name: 'Loaded product' });
    expect(store().mediaDirty).toBe(false);
  });
});

describe('per-variation media can be managed at all', () => {
  const withVariation = () => {
    useAddProductStore.setState({
      variations: [{ id: 'v1', subName: 'Red', media: undefined }],
    });
  };

  it('adds, edits and removes a variant gallery slot', () => {
    withVariation();

    store().addVariationMoreSlots('v1', [emptySlot()]);
    expect(store().variations[0].media).toBeDefined();

    store().setVariationMoreSlot('v1', 0, { localUri: 'file:///v.jpg' });
    const media = store().variations[0].media as { more: { localUri: string }[] };
    expect(media.more[0].localUri).toBe('file:///v.jpg');

    store().removeVariationMoreSlot('v1', 0);
    expect((store().variations[0].media as { more: unknown[] }).more).toHaveLength(0);
  });

  it('ignores an out-of-range index instead of removing from the end', () => {
    withVariation();
    store().addVariationMoreSlots('v1', [emptySlot(), emptySlot()]);

    store().removeVariationMoreSlot('v1', -1);
    expect((store().variations[0].media as { more: unknown[] }).more).toHaveLength(2);
  });

  it('leaves other variations untouched', () => {
    useAddProductStore.setState({
      variations: [
        { id: 'v1', subName: 'Red' },
        { id: 'v2', subName: 'Blue' },
      ],
    });

    store().addVariationMoreSlots('v1', [emptySlot()]);
    expect(store().variations[1].media).toBeUndefined();
  });
});

describe('changing the size vocabulary does not orphan per-size stock', () => {
  /*
   * THE BUG, exactly as it happens.
   *
   * `Step2Details.tsx:354` — `setField('fwScale', v); setField('selectedSizes', [])`.
   * The scale changes, the selection clears, and the three per-size maps keep
   * their old keys. The operator re-picks in the new scale, and the payload
   * carries both vocabularies with `"8"` meaning two different shoes.
   */
  const seedUkStock = () =>
    useAddProductStore.setState({
      selectedSizes: ['6', '7', '8'],
      sizeStockSet: { '6': '10', '7': '12', '8': '8' },
      moqSet: { '6': '6', '7': '6', '8': '6' },
      sizeLowStockAlertSet: { '6': '3', '7': '3', '8': '3' },
      stockedOutSizes: ['7'],
    });

  it('drops entries for sizes that are no longer selected', () => {
    seedUkStock();

    // The operator switches to US and picks the equivalent range.
    store().setSelectedSizes(['8', '9', '10']);

    const s = store();
    // "8" survives because it is still a selected KEY — but 6 and 7 are gone
    // rather than riding along as UK leftovers.
    expect(Object.keys(s.sizeStockSet).sort()).toEqual(['8']);
    expect(Object.keys(s.moqSet).sort()).toEqual(['8']);
    expect(Object.keys(s.sizeLowStockAlertSet).sort()).toEqual(['8']);
  });

  it('drops stocked-out flags for sizes that are gone', () => {
    seedUkStock();
    store().setSelectedSizes(['8', '9', '10']);
    // "7" was stocked out in the old scale and is not selectable now.
    expect(store().stockedOutSizes).toEqual([]);
  });

  it('keeps values for sizes that survive the change', () => {
    seedUkStock();
    store().setSelectedSizes(['7', '8']);
    expect(store().sizeStockSet).toEqual({ '7': '12', '8': '8' });
  });

  it('clearing the selection clears the maps with it', () => {
    seedUkStock();
    store().setSelectedSizes([]);
    expect(store().sizeStockSet).toEqual({});
    expect(store().moqSet).toEqual({});
    expect(store().sizeLowStockAlertSet).toEqual({});
  });

  /*
   * THE ACTUAL DEFECT, in the order it happens — and it is worse than an
   * orphaned key.
   *
   * `syncSizeSelection` already prunes the three maps when the selection
   * changes, but it opens with `if (selectedSizes.length === 0) return {}`.
   * A scale change sets the selection to EMPTY, which is precisely the case it
   * declines to handle, so the maps survive with their UK keys.
   *
   * The operator then picks US sizes. Pruning finally runs and drops 6 and 7 —
   * but keeps "8", because "8" is a selected key in the new vocabulary too. So
   * the stock entered for UK 8 silently becomes the stock for US 8, which is a
   * different shoe: UK 8 is US 9 in the GENTS profile.
   *
   * Nothing is orphaned and nothing errors. One number just means something
   * else now.
   */
  it('does not carry a value across a vocabulary change on a colliding key', () => {
    seedUkStock(); // UK 6/7/8, with 8 → stock "8"

    // Step 1 — the scale changes. This is what `changeVocabulary` does.
    store().setSelectedSizes([]);
    // Step 2 — the operator picks the US equivalents.
    store().setSelectedSizes(['8', '9', '10']);

    // "8" must NOT still be holding UK 8's stock.
    expect(store().sizeStockSet['8']).toBeUndefined();
    expect(store().sizeStockSet).toEqual({});
  });

  /*
   * The same collision one level down.
   *
   * Variation inventory is keyed by size too, and `syncSizeSelection` filters
   * it with the same bail-on-empty. A row for UK 8 therefore survives the
   * scale change and is kept as US 8 — the wrong stock on a variant, which is
   * the level retailers actually order at.
   */
  it('prunes per-size inventory on every variation too', () => {
    useAddProductStore.setState({
      selectedSizes: ['6', '7', '8'],
      variations: [
        {
          id: 'v1',
          subName: 'Red',
          inventory: [
            { size: '6', stock: 4, moq: 6, lowStockAlert: 3 },
            { size: '8', stock: 9, moq: 6, lowStockAlert: 3 },
          ],
        },
      ],
    });

    store().setSelectedSizes([]);

    expect(store().variations[0].inventory).toEqual([]);
  });

  it('leaves a variation without inventory untouched', () => {
    useAddProductStore.setState({
      variations: [{ id: 'v1', subName: 'Red' }],
    });
    store().setSelectedSizes(['S']);
    expect(store().variations[0].inventory).toBeUndefined();
  });
});

describe('the orphan count, so the UI can warn before discarding', () => {
  it('counts distinct sizes across all three maps', () => {
    const state = {
      sizeStockSet: { '6': '10', '7': '12' },
      moqSet: { '7': '6', '8': '6' },
      sizeLowStockAlertSet: { '9': '3' },
    };
    // 6, 7, 8, 9 are present; keeping only 7 orphans 6, 8 and 9.
    expect(countOrphanedSizes(state, ['7'])).toBe(3);
  });

  it('is zero when nothing would be lost', () => {
    expect(
      countOrphanedSizes(
        { sizeStockSet: { S: '1' }, moqSet: {}, sizeLowStockAlertSet: {} },
        ['S', 'M'],
      ),
    ).toBe(0);
  });

  it('tolerates missing maps', () => {
    expect(
      countOrphanedSizes(
        { sizeStockSet: undefined as never, moqSet: {}, sizeLowStockAlertSet: {} },
        ['S'],
      ),
    ).toBe(0);
  });
});

describe('pruneToSizes', () => {
  it('keeps only the listed keys', () => {
    expect(pruneToSizes({ S: '1', M: '2', L: '3' }, ['S', 'L'])).toEqual({ S: '1', L: '3' });
  });

  it('does not invent keys for sizes with no value yet', () => {
    expect(pruneToSizes({ S: '1' }, ['S', 'M', 'L'])).toEqual({ S: '1' });
  });
});
