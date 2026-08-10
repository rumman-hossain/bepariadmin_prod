import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAddProductStore } from '../store/useAddProductStore';
import { useProductFormLifecycle } from './useProductFormLifecycle';
import { useProductRegistration } from './useProductRegistration';
import { useCatalogCascade } from './useCatalogCascade';
import { useEffectiveMargin } from './useEffectiveMargin';
import { useWizardNavigation, type WizardStep } from './useWizardNavigation';
import { syncSizeSelection } from '../utils/syncSizeSelection';
import { resolveHasVariant } from '../utils/resolveHasVariant';
import type { CatalogNode } from '../../types/registration';
import { PRODUCT_ROUTES } from '../../routes';

export type { WizardStep };
export type SelectionType =
  | 'none'
  | 'category'
  | 'subCategory'
  | 'productGroup'
  | 'unitType'
  | 'productClassification'
  | 'wholesaler';

const UNIT_TYPES = [
  { name: 'Piece', code: 'P' },
  { name: 'Dozen', code: 'D' },
  { name: 'Carton', code: 'C' },
  { name: 'KG', code: 'K' },
  { name: 'Yard', code: 'Y' },
  { name: 'Set', code: 'S' },
];

/** Store field holding the display name for each catalogue level. */
const NAME_MIRRORS = [
  { id: 'categoryId', name: 'category' },
  { id: 'subCategoryId', name: 'subCategory' },
  { id: 'productGroupId', name: 'productGroup' },
  { id: 'classificationId', name: 'productClassification' },
] as const;

/**
 * The add-product wizard's controller.
 *
 * Was 420 lines and 13 effects. It now composes four pieces, each with one job:
 *
 *   - `useProductFormLifecycle` — hydrate an existing product for editing
 *   - `useCatalogCascade`       — the five catalogue fetches, as queries
 *   - `useWizardNavigation`     — step transitions and confirmation dialogs
 *   - `useProductRegistration`  — SKU, variation generation, submit
 *
 * What remains here is the wiring between them plus the derived pricing values.
 */
export function useAddProductLogic() {
  const navigate = useNavigate();
  const { productId: routeProductId } = useParams<{ productId?: string }>();
  const store = useAddProductStore();
  const { setField, reset } = store;

  const [selectionType, setSelectionType] = useState<SelectionType>('none');
  const [listSearch, setListSearch] = useState('');

  const { editingProductId, isHydrating, isEditMode, hydrateError, refetch } =
    useProductFormLifecycle();

  const catalog = useCatalogCascade({
    categoryId: store.categoryId,
    subCategoryId: store.subCategoryId,
    productGroupId: store.productGroupId,
  });

  /*
   * The rate this product will actually sell at. `catalog.platformMargin` is the
   * global default and is only the fallback — see useEffectiveMargin for the
   * ৳547.50-shown / ৳575-stored discrepancy that came of confusing the two.
   */
  const effectiveMargin = useEffectiveMargin(store.wholesalerId, catalog.platformMargin);

  const {
    registrationState,
    sku: activeSku,
    handleGenerateSku,
    handleGenerateVariations,
    handleSubmitProduct,
    isGeneratingSku,
    error: registrationError,
  } = useProductRegistration(editingProductId);

  const resetPricingState = useCallback(() => {
    setField('basePrice', '');
    setField('margin', String(effectiveMargin));
    setField('stock', '');
    setField('moq', '');
    setField('lowStockAlert', '');
    setField('dispatchTime', '');
    setField('moqSet', {});
    setField('sizeStockSet', {});
    setField('sizeLowStockAlertSet', {});
    setField('variationColors', []);
    setField('variationDesigns', []);
    setField('variations', []);
  }, [setField, effectiveMargin]);

  /*
   * RESET MEANS "UNDO MY CHANGES", NOT "EMPTY THIS PRODUCT".
   *
   * On a NEW product those are the same thing. On an EDIT they are opposites,
   * and this did the second: `reset()` drops the store to INITIAL_STATE while
   * `editingProductId` stays set, and the hydrate effect keys on the route id —
   * which has not changed — so nothing reloads. The operator is left holding an
   * empty form that still points at a live product, and edit mode marks every
   * step done, so Update is two clicks away.
   *
   * `refetch` already existed on the lifecycle hook and had no caller. It does
   * reset-then-hydrate, which is exactly what "discard my changes" means here.
   */
  const handleResetForm = useCallback(() => {
    if (isEditMode) void refetch();
    else reset();
    setSelectionType('none');
    setListSearch('');
  }, [isEditMode, refetch, reset]);

  const nav = useWizardNavigation({
    isEditMode,
    state: store,
    setField,
    resetPricing: resetPricingState,
    resetForm: handleResetForm,
  });
  const { setCurrentStep } = nav;

  // Navigating from one product's edit form to another reuses this component,
  // so the wizard has to be sent back to step 1 explicitly.
  useEffect(() => {
    setCurrentStep(1);
  }, [routeProductId, setCurrentStep]);

  /*
   * Keep `margin` on the supplier's rate — INCLUDING when the supplier changes.
   *
   * This used to read `if (!store.margin)`, seeding once and never again. That
   * guard was written to protect a figure the operator had typed, but there is
   * no margin input anywhere in the wizard: the only writes to this field are
   * this effect and `resetPricingState`. So the guard protected nothing and cost
   * everything — the seed ran on mount with the platform default, before a
   * supplier existed, and then declined to move when one was picked.
   *
   * Switching supplier must re-price. Writing unconditionally is safe precisely
   * because nothing else authors this value, and the equality check keeps it
   * from looping.
   */
  useEffect(() => {
    const next = String(effectiveMargin);
    if (store.margin !== next) setField('margin', next);
  }, [effectiveMargin, store.margin, setField]);

  // AUTO follows whatever the product group declares; anything else is an
  // explicit override by the operator.
  const resolvedSizeType =
    store.sizeMode === 'AUTO' ? catalog.sizeConfig?.type || 'UNIQUE' : store.sizeMode;
  useEffect(() => {
    if (store.sizeType !== resolvedSizeType) setField('sizeType', resolvedSizeType);
  }, [resolvedSizeType, store.sizeType, setField]);

  /*
   * The fallback, now that the stored answer actually arrives.
   *
   * This comment used to say "an existing product has no stored answer to 'does
   * this have variants?'". It does — `products.has_variant` — and the reason
   * the wizard never saw it was that `normalizeBackendProduct` dropped the
   * field, so `hasVariant` was always null here and this inference ran every
   * time. It is carried now, and hydrate sets a real boolean, so this fires
   * only where there genuinely is no answer: a product predating the column, or
   * a fetch that returned it null.
   *
   * Worth keeping rather than deleting — inferring from the variation count is
   * right when nothing else is known, and wrong only when it contradicts a
   * stored value, which it can no longer do.
   */
  useEffect(() => {
    if (isEditMode && store.hasVariant === null) {
      setField('hasVariant', resolveHasVariant(null, store.variations));
    }
  }, [isEditMode, store.hasVariant, store.variations, setField]);

  /**
   * Mirror catalogue display names into the store.
   *
   * The store holds both the id and the name because the summary step renders
   * names while the payload sends ids. On a hydrated product only the ids come
   * back, so the names have to be looked up once the catalogue arrives — four
   * near-identical effects, now one loop.
   */
  const catalogLevels = useMemo(
    () =>
      [
        catalog.categories,
        catalog.subCategories,
        catalog.productGroups,
        catalog.classifications,
      ] as CatalogNode[][],
    [catalog.categories, catalog.subCategories, catalog.productGroups, catalog.classifications],
  );

  /*
   * Reads the current values through `getState()` rather than closing over
   * `store`, which is what the effect below already does.
   *
   * `store` was in this dependency array alongside the eight specific fields —
   * and `store` is a new object on every mutation, so the eight were doing
   * nothing and this ran after every keystroke anywhere in the wizard, four
   * `find`s over the catalogue each time. Naming the fields it should actually
   * react to makes the array mean what it says.
   */
  useEffect(() => {
    const current = useAddProductStore.getState();
    NAME_MIRRORS.forEach(({ id, name }, level) => {
      const selectedId = current[id];
      const nodes = catalogLevels[level];
      if (!selectedId || !nodes?.length) return;
      const match = nodes.find((node) => node.id === selectedId);
      if (match && current[name] !== match.name) setField(name, match.name);
    });
  }, [
    catalogLevels,
    store.categoryId,
    store.subCategoryId,
    store.productGroupId,
    store.classificationId,
    setField,
  ]);

  // Reconcile per-size data whenever the size selection changes. The transform
  // is pure and returns only what differs, so a no-op change writes nothing.
  useEffect(() => {
    const patch = syncSizeSelection(useAddProductStore.getState());
    (Object.keys(patch) as Array<keyof typeof patch>).forEach((key) => {
      setField(key, patch[key] as never);
    });
  }, [store.selectedSizes, store.hasVariant, setField]);

  const pricing = useMemo(() => {
    const base = parseFloat(store.basePrice) || 0;
    const marginVal =
      store.margin === '' ? effectiveMargin : parseFloat(store.margin) || 0;
    const sell = base > 0 ? base * (1 + marginVal / 100) : 0;
    return { base, margin: marginVal, sell: Math.round(sell * 100) / 100 };
  }, [store.basePrice, store.margin, effectiveMargin]);

  const totalMoq = useMemo(() => {
    const perSizeTotal = Object.values(store.moqSet).reduce(
      (sum, value) => sum + (Number(value) || 0),
      0,
    );
    return perSizeTotal > 0 ? perSizeTotal : Number(store.moq) || 0;
  }, [store.moqSet, store.moq]);

  // The top-level MOQ is the sum of the per-size minimums, so it is derived,
  // not entered — keep the stored value in step with it.
  useEffect(() => {
    const next = totalMoq > 0 ? String(totalMoq) : '';
    if (store.moq !== next) setField('moq', next);
  }, [totalMoq, store.moq, setField]);

  const handleBack = useCallback(() => {
    navigate(PRODUCT_ROUTES.LIST);
  }, [navigate]);

  return {
    currentStep: nav.currentStep,
    handleStepChange: nav.goToStep,

    // The six dialogs are one state internally; the boolean surface is kept so
    // the step components stay unchanged.
    showVariantPrompt: nav.prompt === 'variant',
    handleVariantChoice: nav.chooseVariant,
    /** The step-2 toggle: same decision, without moving off the step. */
    handleVariantModeChange: nav.setVariantMode,
    showPricingReusePrompt: nav.prompt === 'pricing-reuse',
    handlePricingReuseChoice: nav.choosePricingReuse,
    /** Dismissal for both prompts above — see cancelPrompt. */
    cancelPrompt: nav.cancelPrompt,
    showDiscardPricingPrompt: nav.prompt === 'discard-pricing',
    setShowDiscardPricingPrompt: (open: boolean) =>
      nav.setPrompt(open ? 'discard-pricing' : 'none'),
    handleDiscardPricingConfirm: nav.confirmDiscardPricing,
    /*
     * Which product this wizard is currently showing.
     *
     * Exposed so AddProductFlow can drop per-instance UI state when it changes.
     * The component is REUSED across products — the effect above sends it back
     * to step 1 rather than remounting — so anything held in useState survives
     * a navigation that the operator experiences as opening a different form.
     */
    routeProductId,
    showResetPrompt: nav.prompt === 'reset',
    setShowResetPrompt: (open: boolean) => nav.setPrompt(open ? 'reset' : 'none'),
    handleResetForm: nav.confirmReset,
    showSubmitPrompt: nav.prompt === 'submit',
    setShowSubmitPrompt: (open: boolean) => nav.setPrompt(open ? 'submit' : 'none'),

    handleSubmitProduct,
    registrationState,
    registrationError,
    activeSku,
    pricing,
    totalMoq,
    handleGenerateVariations,
    hasVariant: store.hasVariant,
    selectionType,
    setSelectionType,
    listSearch,
    setListSearch,
    handleBack,
    isEditMode,
    isHydrating,
    hydrateError,
    refetch,
    categories: catalog.categories,
    subCategories: catalog.subCategories,
    productGroups: catalog.productGroups,
    classifications: catalog.classifications,
    catalogLoading: catalog.catalogLoading,
    handleGenerateSku,
    isGeneratingSku,
    sizeConfig: catalog.sizeConfig,
    /*
     * The SUPPLIER's rate, not the platform default. Named for what the screens
     * do with it — they print it next to a price and call it "% margin", so a
     * value that was merely the global default was a false statement.
     */
    effectiveMargin,
    unitTypes: UNIT_TYPES,
  };
}
