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
    setField,
    reset,
  } = store;

  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [platformMargin, setPlatformMargin] = useState(9.5);
  const [showVariantPrompt, setShowVariantPrompt] = useState(false);
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
        if (isEditMode) setCurrentStep(3);
        else setShowVariantPrompt(true);
        return;
      }
      if (currentStep === 3 && nextStep === 2) {
        if (isEditMode) setCurrentStep(2);
        else setShowDiscardPricingPrompt(true);
        return;
      }
      setCurrentStep(nextStep as WizardStep);
    },
    [currentStep, isEditMode],
  );

  const handleVariantChoice = useCallback(
    (value: boolean) => {
      setShowVariantPrompt(false);
      setField('hasVariant', value);
      setCurrentStep(3);
    },
    [setField],
  );

  const handleDiscardPricingConfirm = useCallback(() => {
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
    setShowDiscardPricingPrompt(false);
    setCurrentStep(2);
  }, [setField, platformMargin]);

  return {
    currentStep,
    handleStepChange,
    showVariantPrompt,
    handleVariantChoice,
    showPricingReusePrompt: false,
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
