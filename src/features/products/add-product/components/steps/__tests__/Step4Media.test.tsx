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
const uploadSlot = vi.fn(async ({ onSlotUpdate }: { onSlotUpdate: (s: object) => void }) => {
  onSlotUpdate({
    localUri: 'blob:picked',
    uploadedUrl: 'gs://bucket/picked.jpg',
    uploadStatus: 'done',
  });
});

vi.mock('@/src/services/upload/useUpload', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/src/services/upload/useUpload')>()),
  useUpload: () => ({ uploadSlot }),
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

/** The hidden file input belonging to a labelled slot. */
function fileInputFor(label: string, nth = 0): HTMLInputElement {
  const buttons = screen.getAllByRole('button', { name: new RegExp(`^${label}`, 'i') });
  const input = buttons[nth].parentElement?.querySelector('input[type="file"]');
  if (!input) throw new Error(`no file input beside the ${label} slot #${nth}`);
  return input as HTMLInputElement;
}

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
