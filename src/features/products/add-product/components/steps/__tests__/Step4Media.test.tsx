// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { Step4Media } from '../Step4Media';
import { useAddProductStore } from '../../../store/useAddProductStore';
import { validateWizardStep } from '../../../utils/validateWizardStep';
import { ALLOWED_IMAGE_TYPES } from '@/src/services/upload/useUpload';
import type { VariationMediaState } from '../../../../types/registration';

/**
 * Media for a VARIANT product, which could not be supplied at all.
 *
 * `validateStep4` requires `media.front` AND `media.back` on every variation.
 * The store carried `setVariationMediaSlot`, `addVariationMoreSlots`,
 * `setVariationMoreSlot`, `removeVariationMoreSlot` and `setVariationVideoSlot`
 * with ZERO callers, and this step showed only a poster plus a caption saying
 * the per-variation images were "managed in the variation manager on Step 3" —
 * where no such control exists either. So the step reported N variations
 * missing mandatory images and offered nothing on screen that could supply
 * them: every variant product was unsaveable.
 *
 * The assertions are therefore on the VALIDATOR, not on the markup. A test that
 * only counted inputs would pass against a grid of controls wired to nothing.
 */

// The uploader talks to GCS. What matters here is that a pick reaches the slot
// the component pointed it at, so the transport is replaced by something that
// reports a finished upload immediately.
const uploadSlot = vi.fn(
  async ({ onSlotUpdate }: { onSlotUpdate: (s: object) => void; purpose: string }) => {
  onSlotUpdate({
      localUri: 'blob:picked',
      uploadedUrl: 'gs://bucket/picked.jpg',
      uploadStatus: 'done',
    });
  },
);

/* Emptying a slot revokes its object URL. The mock was missing this until a
   test finally used Remove — which is its own small evidence that nothing here
   had ever exercised a filled tile's controls. */
const releasePreviewUrl = vi.fn();

vi.mock('@/src/services/upload/useUpload', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/src/services/upload/useUpload')>()),
  useUpload: () => ({ uploadSlot, releasePreviewUrl }),
}));

const store = () => useAddProductStore.getState();
const pngFile = () => new File(['x'], 'x.png', { type: 'image/png' });

beforeEach(() => {
  store().reset();
  uploadSlot.mockClear();
});
afterEach(cleanup);

function twoVariations() {
  useAddProductStore.setState({
    hasVariant: true,
    variations: [
      { id: 'v1', subName: 'Red', color: 'Red', subSku: 'SKU-RD' },
      { id: 'v2', subName: 'Blue', color: 'Blue', subSku: 'SKU-BL' },
    ],
  });
}

/**
 * The hidden file input belonging to a labelled slot.
 *
 * Addressed through the slot's GROUP rather than its button. A tile's buttons
 * change with its state — an empty one offers "Front", a filled one offers
 * "Replace Front" and "Remove Front" — so indexing a list of buttons named
 * /^front/ meant the list got shorter as the test filled slots, and picking the
 * second variation's front after filling the first read past the end of it. The
 * group is what stays put.
 */
function fileInputFor(label: string, nth = 0): HTMLInputElement {
  const groups = screen.getAllByRole('group', { name: new RegExp(`^${label}`, 'i') });
  const input = groups[nth]?.querySelector('input[type="file"]');
  if (!input) throw new Error(`no file input inside the ${label} slot #${nth}`);
  return input as HTMLInputElement;
}

/**
 * A FILLED TILE'S ACTIONS, WHICH NOTHING HERE USED TO TOUCH.
 *
 * This is why the bug shipped. Every test above works an EMPTY slot — pick a
 * file, check the validator — so the controls that appear once a slot is filled
 * had no coverage at all, and four 28px buttons in a row inside a 75px tile
 * went out without anything noticing.
 *
 * Measured on dev before the fix: the row needs 124px, so on a variant tile
 * "View full screen" sat 56px off the tile's left edge and "Beautify" 24px off
 * it. Both were clipped by the tile's `overflow-hidden`, and
 * `elementFromPoint` at their centres returned the sidebar. A variant image
 * could not be opened, and a failed beautify could not be corrected.
 *
 * A jsdom test cannot measure that — it has no layout. What it CAN pin down is
 * the shape that made it impossible: the actions are in a portalled menu opened
 * by clicking the picture, not in a row that has to fit inside the tile.
 */
function fillFront() {
  fireEvent.change(fileInputFor('Front'), { target: { files: [pngFile()] } });
}

/** The whole-picture button. The tile's only affordance once it has an image. */
function openTileMenu(label = 'Front') {
  const trigger = screen.getByRole('button', { name: new RegExp(`^Options for ${label}`, 'i') });
  fireEvent.click(trigger);
  return trigger;
}

describe('everything a filled tile can do is one click on the picture', () => {
  it('offers no options on an EMPTY tile — a click there picks a file', () => {
    render(<Step4Media />);
    expect(screen.queryByRole('button', { name: /^Options for Front/i })).toBeNull();
    // The empty tile's own button is the picker, exactly as before.
    expect(screen.getByRole('button', { name: /^Front$/i })).toBeTruthy();
  });

  it('opens a menu of every action once the tile has an image', async () => {
    render(<Step4Media />);
    fillFront();
    openTileMenu();

    for (const name of [/view full screen/i, /replace image/i, /^remove$/i]) {
      expect(screen.getByRole('button', { name })).toBeTruthy();
    }
  });

  /*
   * The point of the whole change. The menu is portalled to document.body, so
   * it is not inside — and cannot be clipped by — the tile that opened it.
   * Rendering it in place is what the old corner row did, and a 124px row does
   * not fit in a 75px `overflow-hidden` box.
   */
  it('renders the menu outside the tile, where the tile cannot clip it', () => {
    render(<Step4Media />);
    fillFront();
    const group = screen.getAllByRole('group', { name: /^Front/i })[0];
    openTileMenu();

    const item = screen.getByRole('button', { name: /view full screen/i });
    expect(group.contains(item)).toBe(false);
    expect(document.body.contains(item)).toBe(true);
  });

  /*
   * The picture is drawn OVER the button that opens the menu, so if it takes
   * pointer events the tile stops being clickable and the whole change is
   * undone — silently, because it still looks identical.
   */
  it('lets the click through the picture to the button beneath it', () => {
    render(<Step4Media />);
    fillFront();
    const group = screen.getAllByRole('group', { name: /^Front/i })[0];
    const img = group.querySelector('img')!;
    expect(img.classList.contains('pointer-events-none')).toBe(true);
  });

  it('replaces the image through the menu, against that slot', () => {
    render(<Step4Media />);
    fillFront();
    uploadSlot.mockClear();
    openTileMenu();

    fireEvent.click(screen.getByRole('button', { name: /replace image/i }));
    // The menu closes rather than standing open behind the file dialog.
    expect(screen.queryByRole('button', { name: /replace image/i })).toBeNull();

    fireEvent.change(fileInputFor('Front'), { target: { files: [pngFile()] } });
    expect(uploadSlot).toHaveBeenCalledTimes(1);
    expect(uploadSlot.mock.calls[0][0].purpose).toBe('product:front');
  });

  it('empties the slot through the menu', () => {
    render(<Step4Media />);
    fillFront();
    expect(store().productMedia.front?.uploadedUrl).toBe('gs://bucket/picked.jpg');

    openTileMenu();
    fireEvent.click(screen.getByRole('button', { name: /^remove$/i }));
    expect(store().productMedia.front?.uploadedUrl).toBe('');
  });

  /*
   * `MediaTile` guards Remove behind its optional `onClear`, and all eight
   * call sites on this step supply one — so every filled tile offers it.
   *
   * Written as "each of them" rather than "only where it is given" because the
   * second is not testable from here: a mutant that dropped the guard entirely
   * SURVIVED a test that asserted only the true side, since nothing on the step
   * exercises the false one.
   */
  it('offers Remove on every filled tile', () => {
    render(<Step4Media />);
    for (const label of ['Poster', 'Front', 'Back']) {
      fireEvent.change(fileInputFor(label), { target: { files: [pngFile()] } });
      openTileMenu(label);
      expect(screen.getByRole('button', { name: /^remove$/i })).toBeTruthy();
      fireEvent.keyDown(document, { key: 'Escape' });
    }
  });
});

describe('a variant product can supply per-variation media', () => {
  it('renders a front and a back slot for every variation', () => {
    twoVariations();
    render(<Step4Media />);
    expect(screen.getAllByRole('button', { name: /^front/i })).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: /^back/i })).toHaveLength(2);
  });

  it('labels each block by its colour and SKU, not by internal id', () => {
    twoVariations();
    render(<Step4Media />);
    expect(screen.getByText('Red')).toBeTruthy();
    expect(screen.getByText('SKU-BL')).toBeTruthy();
  });

  /*
   * The blocker itself. Picking front and back for both variations must take
   * step 4 from "2 variation(s) missing mandatory images" to passing.
   */
  it('fills a variant product to the point where step 4 accepts it', () => {
    twoVariations();
    // The poster is what step 4 wants at product level for a variant product.
    store().setProductMediaSlot('poster', {
      localUri: 'blob:poster',
      uploadedUrl: 'gs://bucket/poster.jpg',
      uploadStatus: 'done',
    });

    const { rerender } = render(<Step4Media />);
    expect(validateWizardStep(4, store()).errors.variations).toMatch(/2 variation/);

    for (const nth of [0, 1]) {
      for (const label of ['Front', 'Back']) {
        fireEvent.change(fileInputFor(label, nth), { target: { files: [pngFile()] } });
      }
    }
    rerender(<Step4Media />);

    const result = validateWizardStep(4, store());
    expect(result.errors).toEqual({});
    expect(result.isValid).toBe(true);
  });

  it('points each slot at its OWN variation, not all at the first', () => {
    twoVariations();
    render(<Step4Media />);
    fireEvent.change(fileInputFor('Front', 1), { target: { files: [pngFile()] } });

    // The second variation got it; the first is untouched. Deriving the target
    // from `purpose` instead of a prop is what welded every slot to the product.
    //
    // The cast is the type carrying real ambiguity, not the test being loose:
    // `ProductVariation.media` is `VariationMediaState | ProductMediaItem[]`
    // because the SERVER sends the array and the WIZARD holds the slot object.
    // Step4Media narrows it the same way. Round 2 splits the two.
    const mediaOf = (i: number) => store().variations[i].media as VariationMediaState | undefined;
    expect(mediaOf(1)?.front?.uploadedUrl).toBeTruthy();
    expect(mediaOf(0)?.front?.uploadedUrl).toBeFalsy();
  });

  it('offers a gallery slot and a video per variation', () => {
    twoVariations();
    render(<Step4Media />);
    expect(screen.getAllByRole('button', { name: /add image/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /^video/i })).toHaveLength(2);
  });

  it('says so plainly when there are no variations to attach media to', () => {
    useAddProductStore.setState({ hasVariant: true, variations: [] });
    render(<Step4Media />);
    expect(screen.getByText(/no variations yet/i)).toBeTruthy();
  });
});

describe('a plain product', () => {
  it('offers the extra gallery, not only the five named slots', () => {
    useAddProductStore.setState({ hasVariant: false, variations: [] });
    render(<Step4Media />);

    // The gallery had no UI at all, capping a new product at six images where
    // the model, the payload and the summary all allow eleven.
    fireEvent.click(screen.getByRole('button', { name: /add image/i }));
    expect(store().productMedia.more).toHaveLength(1);
  });
});

describe('the picker offers exactly what the validator accepts', () => {
  it('does not advertise image/* , which is wider than the allowed list', () => {
    useAddProductStore.setState({ hasVariant: false, variations: [] });
    render(<Step4Media />);

    // `image/*` offers HEIC, GIF, TIFF, BMP and SVG — all refused by
    // rejectionReason the instant the dialog closes, by a rule the operator
    // has no way to see.
    const accept = fileInputFor('Poster').accept;
    expect(accept).not.toContain('image/*');
    expect(accept).toBe(ALLOWED_IMAGE_TYPES.join(','));
  });
});

/**
 * THE STEP SAYS WHAT IT WANTS, BEFORE THE FOOTER REFUSES.
 *
 * The requirement used to exist in exactly one place the operator could read
 * it: a validation error under the Continue button, after they had pressed it.
 * The banner states it up front — which is only an improvement while the two
 * agree. A screen reading "1 image ready" above a footer refusing to continue
 * is worse than no banner, so these assert BOTH.
 */
describe('the readiness banner and the validator tell the same story', () => {
  const plain = () => useAddProductStore.setState({ hasVariant: false, variations: [] });

  it('asks for one image while the validator has nothing to accept', () => {
    plain();
    render(<Step4Media />);
    expect(screen.getByRole('status').textContent).toMatch(/at least one image is required/i);
    expect(validateWizardStep(4, store()).isValid).toBe(false);
  });

  it('turns over on the same picture that makes the step valid', () => {
    plain();
    const { rerender } = render(<Step4Media />);
    fireEvent.change(fileInputFor('Poster'), { target: { files: [pngFile()] } });
    rerender(<Step4Media />);

    expect(screen.getByRole('status').textContent).toMatch(/1 image ready/i);
    expect(validateWizardStep(4, store()).isValid).toBe(true);
  });

  it('counts the variants still missing a mandatory shot, as the validator does', () => {
    twoVariations();
    render(<Step4Media />);

    expect(screen.getByRole('status').textContent).toMatch(/2 of 2 variants/i);
    expect(validateWizardStep(4, store()).errors.variations).toMatch(/2 variation/);
  });
});

/**
 * A photo screen that cannot accept a photo you drag onto it.
 *
 * The drop target is not a second, laxer way in: it hands the file to the same
 * `uploadSlot`, which runs the same `rejectionReason` gate as the picker.
 */
describe('dropping a file on a slot', () => {
  it('uploads it against that slot, not some other one', () => {
    useAddProductStore.setState({ hasVariant: false, variations: [] });
    render(<Step4Media />);

    const tile = screen.getAllByRole('group', { name: /^poster/i })[0];
    fireEvent.drop(tile, { dataTransfer: { files: [pngFile()] } });

    expect(uploadSlot).toHaveBeenCalledTimes(1);
    expect(uploadSlot.mock.calls[0][0].purpose).toBe('product:poster');
  });
});

describe('the video slot', () => {
  it('is named once, not once by its heading and again by itself', () => {
    useAddProductStore.setState({ hasVariant: false, variations: [] });
    render(<Step4Media />);
    expect(screen.getAllByText('Video')).toHaveLength(1);
  });
});

describe('a clip that uploaded but cannot be played', () => {
  /*
   * `uploadStatus` only ever describes the TRANSFER. Measured on dev with a
   * structurally valid MP4 the browser could not decode: draft 201, PUT 200,
   * complete 200, the step reported "All variants have their front and back"
   * — and the preview sat black with `video.error.code === 4`, with nothing
   * anywhere saying so. The file is stored and the listing ships broken.
   *
   * The <video> element is the only thing that knows, and nothing listened.
   */
  const videoEl = () => document.querySelector('video') as HTMLVideoElement;

  function withUploadedVideo() {
    useAddProductStore.setState({
      hasVariant: false,
      productMedia: {
        ...store().productMedia,
        video: {
          localUri: 'blob:clip',
          uploadedUrl: 'gs://bucket/clip.mp4',
          uploadStatus: 'done',
          thumbnail: '',
        },
      },
    });
  }

  it('says nothing while the clip decodes normally', () => {
    withUploadedVideo();
    render(<Step4Media />);
    expect(screen.queryByText(/will not play/i)).toBeNull();
  });

  it('says so when the element reports it cannot decode the source', () => {
    withUploadedVideo();
    render(<Step4Media />);
    fireEvent.error(videoEl());
    expect(/will not play/i.test(screen.getByRole('alert').textContent ?? '')).toBe(true);
  });

  it('explains that the upload itself was fine, so the operator looks at the file', () => {
    withUploadedVideo();
    render(<Step4Media />);
    fireEvent.error(videoEl());
    expect(/uploaded/i.test(screen.getByRole('alert').textContent ?? '')).toBe(true);
  });

  it('clears the warning when the clip is replaced', () => {
    // The slot is reused, so a stale warning would condemn a good file.
    withUploadedVideo();
    const { rerender } = render(<Step4Media />);
    fireEvent.error(videoEl());
    expect(screen.queryByText(/will not play/i)).not.toBeNull();

    useAddProductStore.setState({
      productMedia: {
        ...store().productMedia,
        video: {
          localUri: 'blob:another',
          uploadedUrl: 'gs://bucket/ok.mp4',
          uploadStatus: 'done',
          thumbnail: '',
        },
      },
    });
    rerender(<Step4Media />);

    expect(screen.queryByText(/will not play/i)).toBeNull();
  });
});
