import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAddProductStore } from '../store/useAddProductStore';
import { useProductFormLifecycle } from './useProductFormLifecycle';
import { useProductRegistration } from './useProductRegistration';
import {
  getCategories,
  getSubCategories,
  getProductGroups,
  getClassifications,
  getSizeConfig,
  getPlatformMargin,
} from '@/src/api/products';
import type { CatalogNode, SizeConfig } from '../../types/registration';
import { resolveHasVariant } from '../utils/resolveHasVariant';
import { PRODUCT_ROUTES } from '../../routes';

export type WizardStep = 1 | 2 | 3 | 4 | 5 | 6;
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

export function useAddProductLogic() {
  const navigate = useNavigate();
  const { productId: routeProductId } = useParams<{ productId?: string }>();
  const store = useAddProductStore();
  const {
    basePrice,
    margin,
    moqSet,
    moq,
    hasVariant,
    selectedSizes,
    productGroupId,
    sizeMode,
    sizeStockSet,
    sizeLowStockAlertSet,
    variations,
    colors,
    setField,
    reset,
  } = store;

  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [platformMargin, setPlatformMargin] = useState(9.5);
  const [showVariantPrompt, setShowVariantPrompt] = useState(false);
  const [showPricingReusePrompt, setShowPricingReusePrompt] = useState(false);
  const [pendingVariantChoice, setPendingVariantChoice] = useState<boolean | null>(null);
  const [showResetPrompt, setShowResetPrompt] = useState(false);
  const [showSubmitPrompt, setShowSubmitPrompt] = useState(false);
  const [showDiscardPricingPrompt, setShowDiscardPricingPrompt] = useState(false);
  const [selectionType, setSelectionType] = useState<SelectionType>('none');
  const [listSearch, setListSearch] = useState('');

  const [categories, setCategories] = useState<CatalogNode[]>([]);
  const [subCategories, setSubCategories] = useState<CatalogNode[]>([]);
  const [productGroups, setProductGroups] = useState<CatalogNode[]>([]);
  const [classifications, setClassifications] = useState<CatalogNode[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [sizeConfig, setSizeConfig] = useState<SizeConfig | null>(null);

  const { editingProductId, isHydrating, isEditMode } = useProductFormLifecycle();
  const {
    registrationState,
    sku: activeSku,
    handleGenerateSku,
    handleGenerateVariations,
    handleSubmitProduct,
    isGeneratingSku,
    error: registrationError,
  } = useProductRegistration(editingProductId);

  useEffect(() => {
    void getPlatformMargin().then((res) => {
      if (res.ok && res.data.marginPercent != null) {
        setPlatformMargin(res.data.marginPercent);
        if (!store.margin) setField('margin', String(res.data.marginPercent));
      }
    });
  }, []);

  useEffect(() => {
    setCurrentStep(1);
  }, [routeProductId]);

  useEffect(() => {
    void getCategories().then((res) => {
      if (res.ok) setCategories(res.data);
    });
  }, []);

  useEffect(() => {
    if (!store.categoryId) {
      setSubCategories([]);
      return;
    }
    setCatalogLoading(true);
    void getSubCategories(store.categoryId).then((res) => {
      if (res.ok) setSubCategories(res.data);
      setCatalogLoading(false);
    });
  }, [store.categoryId]);

  useEffect(() => {
    if (!store.subCategoryId) {
      setProductGroups([]);
      return;
    }
    setCatalogLoading(true);
    void getProductGroups(store.subCategoryId).then((res) => {
      if (res.ok) setProductGroups(res.data);
      setCatalogLoading(false);
    });
  }, [store.subCategoryId]);

  useEffect(() => {
    if (!productGroupId) {
      setClassifications([]);
      return;
    }
    setCatalogLoading(true);
    void getClassifications(productGroupId).then((res) => {
      if (res.ok) setClassifications(res.data);
      setCatalogLoading(false);
    });
  }, [productGroupId]);

  useEffect(() => {
    if (!productGroupId) {
      setSizeConfig(null);
      return;
    }
    void getSizeConfig(productGroupId).then((res) => {
      if (res.ok && res.data) {
        setSizeConfig(res.data);
        setField('sizeType', res.data.type);
      }
    });
  }, [productGroupId, setField]);

  useEffect(() => {
    if (sizeMode === 'AUTO') {
      setField('sizeType', sizeConfig?.type || 'UNIQUE');
    } else {
      setField('sizeType', sizeMode);
    }
  }, [sizeMode, sizeConfig, setField]);

  useEffect(() => {
    if (isEditMode && hasVariant === null) {
      setField('hasVariant', resolveHasVariant(null, variations));
    }
  }, [isEditMode, hasVariant, variations, setField]);

  useEffect(() => {
    if (store.categoryId && categories.length > 0) {
      const match = categories.find((c) => c.id === store.categoryId);
      if (match && store.category !== match.name) setField('category', match.name);
    }
  }, [store.categoryId, categories, store.category, setField]);

  useEffect(() => {
    if (store.subCategoryId && subCategories.length > 0) {
      const match = subCategories.find((c) => c.id === store.subCategoryId);
      if (match && store.subCategory !== match.name) setField('subCategory', match.name);
    }
  }, [store.subCategoryId, subCategories, store.subCategory, setField]);

  useEffect(() => {
    if (store.productGroupId && productGroups.length > 0) {
      const match = productGroups.find((c) => c.id === store.productGroupId);
      if (match && store.productGroup !== match.name) setField('productGroup', match.name);
    }
  }, [store.productGroupId, productGroups, store.productGroup, setField]);

  useEffect(() => {
    if (store.classificationId && classifications.length > 0) {
      const match = classifications.find((c) => c.id === store.classificationId);
      if (match && store.productClassification !== match.name) setField('productClassification', match.name);
    }
  }, [store.classificationId, classifications, store.productClassification, setField]);

  useEffect(() => {
    if (selectedSizes.length === 0) return;
    const sizeSet = new Set(selectedSizes);
    const pruneSet = (current: Record<string, string>) => {
      let changed = false;
      const next = { ...current };
      Object.keys(next).forEach((k) => {
        if (!sizeSet.has(k)) {
          delete next[k];
          changed = true;
        }
      });
      return changed ? next : null;
    };
    const nextStock = pruneSet(sizeStockSet);
    if (nextStock) setField('sizeStockSet', nextStock);
    const nextMoq = pruneSet(moqSet);
    if (nextMoq) setField('moqSet', nextMoq);
    const nextAlert = pruneSet(sizeLowStockAlertSet);
    if (nextAlert) setField('sizeLowStockAlertSet', nextAlert);

    if (hasVariant && variations.length > 0) {
      let varChanged = false;
      const nextVars = variations.map((v) => {
        const currentInventory = v.inventory || [];
        const currentSizes = new Set(currentInventory.map((i) => i.size));
        let nextInventory = currentInventory.filter((item) => sizeSet.has(item.size));
        let added = false;
        selectedSizes.forEach((size) => {
          if (!currentSizes.has(size)) {
            nextInventory.push({
              size,
              stock: Number(sizeStockSet[size]) || (selectedSizes.length === 1 ? Number(store.stock) || 0 : 0),
              moq: Number(moqSet[size]) || Number(store.moq) || 1,
              lowStockAlert: Number(sizeLowStockAlertSet[size]) || Number(store.lowStockAlert) || 5,
            });
            added = true;
          }
        });
        if (nextInventory.length !== currentInventory.length || added) {
          varChanged = true;
          const sizeOrder = new Map(selectedSizes.map((s, i) => [s, i]));
          nextInventory.sort((a, b) => (sizeOrder.get(a.size) || 0) - (sizeOrder.get(b.size) || 0));
          return { ...v, inventory: nextInventory };
        }
        return v;
      });
      if (varChanged) setField('variations', nextVars);
    }
  }, [selectedSizes, hasVariant, setField]);

  const pricing = useMemo(() => {
    const base = parseFloat(basePrice) || 0;
    const marginVal = margin === '' ? platformMargin : parseFloat(margin) || 0;
    const sell = base > 0 ? base * (1 + marginVal / 100) : 0;
    return { base, margin: marginVal, sell: Math.round(sell * 100) / 100 };
  }, [basePrice, margin, platformMargin]);

  const totalMoq = useMemo(() => {
    const moqSetSum = Object.values(moqSet).reduce((sum, value) => sum + (Number(value) || 0), 0);
    if (moqSetSum > 0) return moqSetSum;
    return Number(moq) || 0;
  }, [moqSet, moq]);

  useEffect(() => {
    setField('moq', totalMoq > 0 ? String(totalMoq) : '');
  }, [totalMoq, setField]);

  const resetPricingState = useCallback(() => {
    setField('basePrice', '');
    setField('margin', String(platformMargin));
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
  }, [setField, platformMargin]);

  const hasExistingPricingData = useMemo(() => {
    const hasBase = Boolean(basePrice && basePrice !== '0');
    const hasSizedData =
      Object.values(sizeStockSet).some((v) => v && v !== '0') || Object.values(moqSet).some((v) => v && v !== '0');
    const hasSingleData = (store.stock && store.stock !== '0') || (moq && moq !== '0');
    return hasBase || hasSizedData || hasSingleData;
  }, [basePrice, store.stock, moq, sizeStockSet, moqSet]);

  const handleResetForm = useCallback(() => {
    reset();
    setCurrentStep(1);
    setShowResetPrompt(false);
    setSelectionType('none');
    setListSearch('');
  }, [reset]);

  const handleBack = useCallback(() => {
    navigate(PRODUCT_ROUTES.LIST);
  }, [navigate]);

  const handleStepChange = useCallback(
    (nextStep: number) => {
      if (currentStep === 2 && nextStep === 3) {
        if (isEditMode) {
          if (hasVariant === null) {
            setField('hasVariant', resolveHasVariant(null, variations));
          }
          setCurrentStep(3);
        } else setShowVariantPrompt(true);
        return;
      }
      if (currentStep === 3 && nextStep === 2) {
        if (isEditMode) setCurrentStep(2);
        else setShowDiscardPricingPrompt(true);
        return;
      }
      setCurrentStep(nextStep as WizardStep);
    },
    [currentStep, isEditMode, hasVariant, variations, setField],
  );

  const handleVariantChoice = useCallback(
    (value: boolean) => {
      setShowVariantPrompt(false);
      setPendingVariantChoice(value);

      if (!value) {
        const nextMoqSet = { ...moqSet };
        const nextStockSet = { ...sizeStockSet };
        const nextAlertSet = { ...sizeLowStockAlertSet };
        selectedSizes.forEach((size) => {
          if (nextMoqSet[size] === undefined) nextMoqSet[size] = '';
          if (nextStockSet[size] === undefined) nextStockSet[size] = '';
          if (nextAlertSet[size] === undefined) nextAlertSet[size] = '';
        });
        setField('moqSet', nextMoqSet);
        setField('sizeStockSet', nextStockSet);
        setField('sizeLowStockAlertSet', nextAlertSet);
      }

      if (hasExistingPricingData) {
        setShowPricingReusePrompt(true);
        return;
      }

      if (value && colors) {
        const colorsArr = colors.split(',').map((c) => c.trim()).filter(Boolean);
        setField('variationColors', colorsArr);
      }

      setField('hasVariant', value);
      setCurrentStep(3);
    },
    [hasExistingPricingData, selectedSizes, moqSet, sizeStockSet, sizeLowStockAlertSet, colors, setField],
  );

  const handlePricingReuseChoice = useCallback(
    (reusePrevious: boolean) => {
      if (!reusePrevious) resetPricingState();
      if (pendingVariantChoice !== null) {
        if (pendingVariantChoice && colors) {
          const colorsArr = colors.split(',').map((c) => c.trim()).filter(Boolean);
          setField('variationColors', colorsArr);
        }
        setField('hasVariant', pendingVariantChoice);
      }
      setPendingVariantChoice(null);
      setShowPricingReusePrompt(false);
      setCurrentStep(3);
    },
    [pendingVariantChoice, resetPricingState, colors, setField],
  );

  const handleDiscardPricingConfirm = useCallback(() => {
    resetPricingState();
    setShowDiscardPricingPrompt(false);
    setCurrentStep(2);
  }, [resetPricingState]);

  return {
    currentStep,
    handleStepChange,
    showVariantPrompt,
    handleVariantChoice,
    showPricingReusePrompt,
    handlePricingReuseChoice,
    showDiscardPricingPrompt,
    setShowDiscardPricingPrompt,
    handleDiscardPricingConfirm,
    showResetPrompt,
    setShowResetPrompt,
    handleResetForm,
    showSubmitPrompt,
    setShowSubmitPrompt,
    handleSubmitProduct,
    registrationState,
    activeSku,
    pricing,
    totalMoq,
    handleGenerateVariations,
    hasVariant,
    selectionType,
    setSelectionType,
    listSearch,
    setListSearch,
    handleBack,
    isEditMode,
    isHydrating,
    categories,
    subCategories,
    productGroups,
    classifications,
    catalogLoading,
    handleGenerateSku,
    isGeneratingSku,
    sizeConfig,
    platformMargin,
    unitTypes: UNIT_TYPES,
    registrationError,
  };
}
