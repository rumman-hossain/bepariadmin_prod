import type { MediaSlot, ProductVariation, WizardState } from '../../types/registration';
import type { VariationMediaState } from '../store/useAddProductStore';
import { resolveHasVariant } from './resolveHasVariant';

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

/** Hard ceiling on generated variants, enforced here and nowhere else. */
export const MAX_VARIANTS = 25;

/**
 * The add-product wizard's validation rules, as pure functions.
 *
 * These were 250 lines inside a hook that read 33 separate store selectors, so
 * exercising a rule meant standing up a Zustand store and a React renderer.
 * They are the gate between a half-filled form and a bad row in the products
 * table, and they were entirely untested.
 *
 * Every function takes state and returns `{ isValid, errors }`. Nothing reads a
 * store, and nothing renders.
 */

const ok = (errors: Record<string, string>): ValidationResult => ({
  isValid: Object.keys(errors).length === 0,
  errors,
});

const blank = (value: string | undefined) => !value?.trim();

/** Identity and classification — the fields that make the product findable. */
export function validateStep1(state: WizardState): ValidationResult {
  const errors: Record<string, string> = {};
  if (blank(state.wholesalerId)) errors.wholesalerId = 'Supplier is required';
  if (blank(state.name)) errors.name = 'Product name is required';
  if (blank(state.brandName)) errors.brandName = 'Brand is required';
  if (blank(state.unitType)) errors.unitType = 'Unit type is required';
  if (!state.categoryId) errors.category = 'Category is required';
  if (!state.productGroupId) errors.productGroup = 'Product group is required';
  if (!state.classificationId) errors.classification = 'Classification is required';
  // 'SKU-XXXX' is the placeholder the payload builder falls back to; it is not
  // a real reserved SKU and must never reach the server.
  if (blank(state.sku) || state.sku === 'SKU-XXXX') errors.sku = 'SKU must be generated';
  return ok(errors);
}

/** Sizes and dispatch. */
export function validateStep2(state: WizardState): ValidationResult {
  const errors: Record<string, string> = {};
  if (!state.selectedSizes?.length) errors.sizes = 'Select at least one size';
  if (blank(state.dispatchTime)) errors.dispatchTime = 'Dispatch time is required';
  return ok(errors);
}

/**
 * Stock, MOQ and low-stock alert must be mutually consistent.
 *
 * The invariant is the same everywhere: you cannot require a minimum order
 * larger than the stock you hold, and you cannot warn at a threshold you are
 * already below. Both comparisons are strict — `moq === stock` means the first
 * order empties the shelf, which the operator should state deliberately by
 * setting stock higher, not reach by accident.
 *
 * NOTE — this unifies a rule that used to differ by branch. Products without
 * variants rejected `moq === stock`; products with variants accepted it. Same
 * concept, two answers, depending on a checkbox elsewhere in the wizard. The
 * stricter reading now applies to both.
 */
function checkStockTriple(
  stock: number,
  moq: number,
  alert: number,
): { moqTooHigh: boolean; alertTooHigh: boolean } {
  return {
    moqTooHigh: stock > 0 && moq > 0 && moq >= stock,
    alertTooHigh: stock > 0 && alert > 0 && alert >= stock,
  };
}

function validateSizedInventory(state: WizardState, errors: Record<string, string>) {
  const activeSizes = state.selectedSizes.filter((s) => !state.stockedOutSizes.includes(s));

  const missing = (set: Record<string, string>) =>
    activeSizes.filter((s) => !set[s] || Number(set[s]) <= 0);

  if (missing(state.sizeStockSet).length > 0)
    errors.sizeStockSet = 'Stock required for all active sizes';
  if (missing(state.moqSet).length > 0) errors.moqSet = 'MOQ required for all active sizes';
  if (missing(state.sizeLowStockAlertSet).length > 0)
    errors.sizeLowStockAlertSet = 'Alert required for all active sizes';

  const violations = activeSizes.map((s) =>
    checkStockTriple(
      Number(state.sizeStockSet[s]) || 0,
      Number(state.moqSet[s]) || 0,
      Number(state.sizeLowStockAlertSet[s]) || 0,
    ),
  );
  if (violations.some((v) => v.moqTooHigh)) errors.moqSetLimit = 'MOQ must be less than stock';
  if (violations.some((v) => v.alertTooHigh))
    errors.alertSetLimit = 'Alert must be less than stock';
}

function validateUnsizedInventory(state: WizardState, errors: Record<string, string>) {
  const stock = Number(state.stock) || 0;
  const moq = Number(state.moq) || 0;
  const alert = Number(state.lowStockAlert) || 0;

  if (stock <= 0) errors.stock = 'Stock must be greater than 0';
  if (moq <= 0) errors.moq = 'MOQ must be greater than 0';
  if (alert <= 0) errors.lowStockAlert = 'Alert must be greater than 0';

  const { moqTooHigh, alertTooHigh } = checkStockTriple(stock, moq, alert);
  if (moqTooHigh) errors.moqLimit = 'MOQ must be less than stock';
  if (alertTooHigh) errors.alertLimit = 'Alert must be less than stock';
}

/** True when one variation's stock figures are complete and self-consistent. */
function isVariationPriced(variation: ProductVariation, basePrice: number): boolean {
  const price = variation.price ?? basePrice;
  // A variation may cost more than the base product but never less — the base
  // price is the floor the margin was calculated against.
  return price > 0 && price >= basePrice;
}

function isVariationStocked(variation: ProductVariation, selectedSizes: string[]): boolean {
  if (selectedSizes.length === 0) {
    const { moqTooHigh, alertTooHigh } = checkStockTriple(
      variation.stock || 0,
      variation.moq || 0,
      variation.lowStockAlert || 0,
    );
    return (
      (variation.stock || 0) > 0 &&
      (variation.moq || 0) >= 1 &&
      (variation.lowStockAlert || 0) > 0 &&
      !moqTooHigh &&
      !alertTooHigh
    );
  }

  return selectedSizes.every((size) => {
    if (variation.stockedOutSizes?.includes(size)) return true;

    const raw = [
      variation.sizeStock?.[size],
      variation.sizeMoq?.[size],
      variation.sizeAlert?.[size],
    ];
    // Distinguish "not filled in" from "filled in as zero": both are invalid,
    // but only the first means the operator has not looked at this size yet.
    if (raw.some((value) => value === undefined || value === '')) return false;

    const stock = Number(raw[0]) || 0;
    const moq = Number(raw[1]) || 0;
    const alert = Number(raw[2]) || 0;
    const { moqTooHigh, alertTooHigh } = checkStockTriple(stock, moq, alert);
    return stock > 0 && moq >= 1 && alert > 0 && !moqTooHigh && !alertTooHigh;
  });
}

/** Pricing and inventory. */
export function validateStep3(state: WizardState): ValidationResult {
  const errors: Record<string, string> = {};
  const basePrice = parseFloat(state.basePrice) || 0;
  const hasVariant = resolveHasVariant(state.hasVariant, state.variations);

  if (state.hasVariant === null && state.variations.length === 0) {
    errors.hasVariant = 'Variant choice required';
  }
  if (basePrice <= 0) errors.basePrice = 'Base price must be greater than 0';

  if (hasVariant) {
    if (state.variations.length === 0) {
      errors.variations = 'Please generate variations first';
    } else {
      const incomplete = state.variations.filter(
        (v) =>
          !isVariationPriced(v, basePrice) || !isVariationStocked(v, state.selectedSizes),
      );
      if (incomplete.length > 0) {
        errors.variations = `${incomplete.length} variation(s) have invalid stock/moq/alert logic`;
      }
    }
    return ok(errors);
  }

  if (state.selectedSizes.length > 0) {
    validateSizedInventory(state, errors);
  } else if (!state.generalStockedOut) {
    // A product deliberately marked out of stock has no figures to check.
    validateUnsizedInventory(state, errors);
  }

  return ok(errors);
}

const slotActive = (slot?: MediaSlot) => Boolean(slot?.localUri || slot?.uploadedUrl);

/** Reports whichever upload problem the operator must act on first. */
function describeUploadState(slots: MediaSlot[]): string | null {
  const pending = slots.filter((s) => s.uploadStatus !== 'done');
  if (pending.length === 0) return null;

  // A failure needs a retry; a queue just needs waiting. Report the failure.
  const failed = pending.filter((s) => s.uploadStatus === 'error').length;
  if (failed > 0) return `${failed} upload(s) failed. Please retry.`;

  // EXHAUSTIVE BY SUBTRACTION, not by enumerating the statuses.
  //
  // This counted `=== 'uploading' || === 'idle'`. `pending` is everything not
  // 'done', so any status added to UploadStatus later would fall through BOTH
  // buckets and this would return null — "no upload problem" — for a slot that
  // has not finished uploading. Step 4 would pass with an incomplete image.
  //
  // It is latent rather than live only because the union happens to have
  // exactly four members today. Investigating whether to add a 'paused' status
  // is what surfaced it: the status turned out to be unreachable and was not
  // added, but the trap it would have sprung is real and cheap to close.
  // Anything pending that is not a failure is something to wait for.
  const queued = pending.length - failed;
  return queued > 0 ? `${queued} image(s) in queue. Please wait.` : null;
}

/** Variant configuration and media. */
export function validateStep4(state: WizardState): ValidationResult {
  const errors: Record<string, string> = {};
  const hasVariant = resolveHasVariant(state.hasVariant, state.variations);

  if (hasVariant) {
    const colors = state.variationColors.length;
    const designs = state.variationDesigns.length;

    /*
     * The generator pairs each colour with each design, substituting a single
     * blank when one axis is empty — so 40 colours and no designs produces 40
     * variants, not zero.
     *
     * The cap used to be checked as `colors * designs`, which evaluates to 0 in
     * exactly that case and let an unbounded number of variants through. This
     * is the only place the limit is enforced, so the bypass was total.
     */
    const variantCount = Math.max(colors, 1) * Math.max(designs, 1);
    if ((colors > 0 || designs > 0) && variantCount > MAX_VARIANTS) {
      errors.variantCount =
        `Cannot exceed ${MAX_VARIANTS} variants ` +
        `(${colors} colors × ${designs} designs = ${variantCount}). Reduce colors or designs.`;
    }
    if (state.variations.length === 0 && (colors > 0 || designs > 0)) {
      errors.variations = 'Click "Generate Variations" to create variant combinations';
    }
  }

  if (!hasVariant) {
    const media = state.productMedia;
    const activeSlots = [
      media.poster,
      media.front,
      media.back,
      media.left,
      media.right,
      ...media.more,
      media.video,
    ].filter(slotActive);

    if (activeSlots.length === 0) {
      errors.productMedia = 'Upload at least one product image';
    } else {
      const uploadProblem = describeUploadState(activeSlots);
      if (uploadProblem) errors.mediaUpload = uploadProblem;
    }
  }

  if (hasVariant && state.variations.length > 0) {
    // Front and back are both mandatory, but a variation missing both is ONE
    // incomplete variation. Counting slots reported it as two.
    let variationsMissingMedia = 0;
    let queued = 0;
    let failed = 0;

    state.variations.forEach((v) => {
      const media = v.media as VariationMediaState | undefined;
      if (!media || !slotActive(media.front) || !slotActive(media.back)) {
        variationsMissingMedia++;
      }
      if (!media) return;

      const slots = [media.front, media.back, ...(media.more ?? []), media.video].filter(
        slotActive,
      );
      // Same subtraction as describeUploadState, for the same reason.
      const pending = slots.filter((s) => s.uploadStatus !== 'done');
      const pendingFailed = pending.filter((s) => s.uploadStatus === 'error').length;
      failed += pendingFailed;
      queued += pending.length - pendingFailed;
    });

    if (variationsMissingMedia > 0) {
      errors.variations = `${variationsMissingMedia} variation(s) missing mandatory images`;
    }
    // Same precedence as above: a failure outranks a queue.
    if (failed > 0) errors.mediaUpload = `${failed} variation uploads failed. Please retry.`;
    else if (queued > 0) errors.mediaUpload = `${queued} variation images in queue`;
  }

  return ok(errors);
}

/** Warranty, return and exchange policies — each optional, but complete if on. */
export function validateStep5(state: WizardState): ValidationResult {
  const errors: Record<string, string> = {};

  if (state.warrantyEnabled) {
    if (blank(state.warrantyDuration)) errors.warrantyDuration = 'Warranty duration is required';
    if (blank(state.warrantyDescription))
      errors.warrantyDescription = 'Warranty description is required';
  }
  if (state.returnPolicyEnabled) {
    if (blank(state.returnWindow)) errors.returnWindow = 'Return window is required';
    if (blank(state.returnCondition)) errors.returnCondition = 'Return conditions are required';
  }
  if (state.exchangeEnabled) {
    if (blank(state.exchangeWindow)) errors.exchangeWindow = 'Exchange window is required';
    if (blank(state.exchangeDescription))
      errors.exchangeDescription = 'Exchange description is required';
  }

  return ok(errors);
}

const VALIDATORS: Record<number, (state: WizardState) => ValidationResult> = {
  1: validateStep1,
  2: validateStep2,
  3: validateStep3,
  4: validateStep4,
  // Step 6 is the read-only summary — there is nothing on it to get wrong.
  5: validateStep5,
  6: () => ({ isValid: true, errors: {} }),
};

export function validateWizardStep(step: number, state: WizardState): ValidationResult {
  const validator = VALIDATORS[step];
  return validator ? validator(state) : { isValid: false, errors: { unknown: 'Invalid step' } };
}
