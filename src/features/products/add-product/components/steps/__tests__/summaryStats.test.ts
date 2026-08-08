import { describe, it, expect } from 'vitest';
import { summaryMoney, countProductMedia } from '../summaryStats';
import type {
  MediaSlot,
  ProductMediaState,
  ProductVariation,
} from '@/src/features/products/types/registration';

/*
 * These counts decide what the review step tells an operator about their
 * product right before they publish it: how many images it has, whether it has
 * video, and whether anything is still uploading. Until this was lifted out of
 * a 500-line component none of it could be tested.
 */

const slot = (over: Partial<MediaSlot> = {}): MediaSlot => ({
  localUri: '',
  uploadedUrl: '',
  uploadStatus: 'idle',
  ...over,
});

/** A slot the operator has filled, but which has not reached the server yet. */
const local = () => slot({ localUri: 'blob:local', uploadStatus: 'idle' });
/** A slot that finished uploading. */
const remote = () => slot({ uploadedUrl: 'https://cdn/x.jpg', uploadStatus: 'done' });
const uploading = () => slot({ localUri: 'blob:local', uploadStatus: 'uploading' });

const media = (over: Partial<ProductMediaState> = {}): ProductMediaState => ({
  poster: slot(),
  front: slot(),
  back: slot(),
  more: [],
  video: { ...slot(), thumbnail: '' },
  ...over,
});

const variation = (over: Partial<ProductVariation> = {}): ProductVariation =>
  ({ id: 'v1', subName: '', subSku: '', ...over }) as ProductVariation;

describe('summaryMoney', () => {
  it('renders zero as an em dash, because zero means "not set" here', () => {
    /*
     * A review screen showing ৳0 asserts a price nobody entered. The dash says
     * the field is blank, which is the difference between "free" and "you have
     * not filled this in yet".
     */
    expect(summaryMoney(0)).toBe('—');
    expect(summaryMoney('')).toBe('—');
    expect(summaryMoney('0')).toBe('—');
  });

  it('keeps paisa, so base and retail agree with the margin beside them', () => {
    expect(summaryMoney(4821.5)).toBe('৳4,821.50');
  });

  it('groups in the South Asian 2-2-3, not 3-3', () => {
    // ৳4,82,150.00 — the whole reason this stopped calling formatCurrency.
    expect(summaryMoney(482150)).toBe('৳4,82,150.00');
  });

  it('accepts the string the store actually holds', () => {
    expect(summaryMoney('1200')).toBe('৳1,200.00');
  });
});

describe('countProductMedia', () => {
  it('counts nothing when nothing is filled', () => {
    const c = countProductMedia(media(), []);
    expect(c.totalImageCount).toBe(0);
    expect(c.hasVideo).toBe(false);
    expect(c.pendingCount).toBe(0);
  });

  it('counts a slot whether it is still local or already uploaded', () => {
    /*
     * The operator has picked five images; two have finished uploading. All
     * five exist as far as "does this product have images" is concerned, and
     * counting only the uploaded ones would tell them their product is empty
     * while they watch the thumbnails on screen.
     */
    const c = countProductMedia(
      media({ front: local(), back: remote(), poster: local() }),
      [],
    );
    expect(c.mainCount).toBe(3);
  });

  it('counts the extra slots separately from the five named ones', () => {
    const c = countProductMedia(media({ front: local(), more: [local(), remote()] }), []);
    expect(c.mainCount).toBe(1);
    expect(c.extraCount).toBe(2);
    expect(c.totalImageCount).toBe(3);
  });

  it('ignores an empty extra slot', () => {
    const c = countProductMedia(media({ more: [slot(), slot()] }), []);
    expect(c.extraCount).toBe(0);
  });

  it("adds every variation's images to the total", () => {
    const withMedia = variation({
      media: media({ front: local(), back: remote(), more: [local()] }),
    } as Partial<ProductVariation>);
    const c = countProductMedia(media({ front: local() }), [withMedia, withMedia]);
    // 1 main + (2 named + 1 extra) x 2 variations
    expect(c.variationImagesCount).toBe(6);
    expect(c.totalImageCount).toBe(7);
  });

  it('survives a variation carrying no media at all', () => {
    // Variations are created before their media is filled in, so this is the
    // normal case mid-wizard, not an edge case.
    const c = countProductMedia(media({ front: local() }), [variation(), variation()]);
    expect(c.variationImagesCount).toBe(0);
    expect(c.totalImageCount).toBe(1);
  });

  it('reports a video on the product itself', () => {
    const c = countProductMedia(
      media({ video: { ...local(), thumbnail: '' } }),
      [],
    );
    expect(c.hasVideo).toBe(true);
  });

  it('reports a video that only a variation carries', () => {
    const v = variation({
      media: media({ video: { ...remote(), thumbnail: '' } }),
    } as Partial<ProductVariation>);
    expect(countProductMedia(media(), [v]).hasVideo).toBe(true);
  });

  it('counts in-flight uploads across the product and its variations', () => {
    /*
     * This drives the warning tone on the summary. Publishing while uploads are
     * in flight is how a product goes live with missing images, so the count
     * has to include the variations — which is exactly the part that is easy to
     * forget and impossible to notice by looking at the screen.
     */
    const v = variation({
      media: media({ front: uploading(), more: [uploading()] }),
    } as Partial<ProductVariation>);
    const c = countProductMedia(media({ front: uploading(), video: { ...uploading(), thumbnail: '' } }), [v]);
    expect(c.pendingCount).toBe(4);
  });

  it('does not count a finished upload as pending', () => {
    const c = countProductMedia(media({ front: remote(), back: remote() }), []);
    expect(c.pendingCount).toBe(0);
    expect(c.mainCount).toBe(2);
  });
});
