/**
 * Product Form Page — create / edit product.
 *
 * Architecture:
 * - Renders as a modal overlay
 * - Uses useProductForm hook (backed by formStore + Zod)
 * - Zero props — fully self-contained
 * - Handles: submitting, validation errors, API errors
 */
import React, { useCallback, useMemo } from 'react';
import { X, Save, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import { Select } from '@/src/components/ui/Select';
import { Textarea } from '@/src/components/ui/Textarea';
import { Modal } from '@/src/components/ui/Modal';
import { useProductForm } from '../hooks/useProductForm';
import type { ProductFormData } from '../types';

// ─── Constants ──────────────────────────────────────────────────

interface FieldSelectOption {
  label: string;
  value: string;
}

const VISIBILITY_OPTIONS: FieldSelectOption[] = [
  { value: 'Public', label: 'Public' },
  { value: 'Private', label: 'Private' },
];

const DISPATCH_OPTIONS: FieldSelectOption[] = [
  { value: 'Immediate', label: 'Immediate' },
  { value: '3-5 days', label: '3-5 days' },
  { value: '1-2 weeks', label: '1-2 weeks' },
  { value: '2-4 weeks', label: '2-4 weeks' },
];

// ─── Form-field wrapper ────────────────────────────────────────

interface FormFieldProps {
  label: string;
  htmlFor: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}

function FormField({ label, htmlFor, required, error, hint, children, className = '' }: FormFieldProps) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-text-primary">
        {label}
        {required && <span className="text-semantic-danger ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-semantic-danger">{error}</p>}
      {!error && hint && <p className="text-xs text-text-tertiary">{hint}</p>}
    </div>
  );
}

// ─── Section divider ────────────────────────────────────────────

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-4">
      <legend className="text-base font-semibold text-text-primary border-b border-border-default pb-2 w-full">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

// ═══════════════════════════════════════════════════════════════
// Product Form Page
// ═══════════════════════════════════════════════════════════════

export function ProductFormPage() {
  const {
    values,
    mode,
    isSubmitting,
    error,
    close,
    setField,
    submit,
    clearError,
  } = useProductForm();

  const title = mode === 'create' ? 'Create Product' : 'Edit Product';
  const submitLabel = mode === 'create' ? 'Create Product' : 'Save Changes';

  // ── Derived values ───────────────────────────────────
  const sellingPrice = useMemo(() => {
    const base = values.basePrice ?? 0;
    const margin = values.margin ?? 0;
    return base * (1 + margin / 100);
  }, [values.basePrice, values.margin]);

  const estimatedProfit = useMemo(() => {
    return sellingPrice - (values.basePrice ?? 0);
  }, [sellingPrice, values.basePrice]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      void submit();
    },
    [submit],
  );

  // ── Input change helpers (explicit per field, avoids union type issues) ──

  const handleText = useCallback(
    (field: keyof ProductFormData) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setField(field, e.target.value as never);
      },
    [setField],
  );

  const handleNumber = useCallback(
    (field: keyof ProductFormData) =>
      (e: React.ChangeEvent<HTMLInputElement>) => {
        setField(field, Number(e.target.value) as never);
      },
    [setField],
  );

  const handleSelect = useCallback(
    (field: keyof ProductFormData) =>
      (e: React.ChangeEvent<HTMLSelectElement>) => {
        setField(field, e.target.value as never);
      },
    [setField],
  );

  // ── Sizes management ────────────────────────────────
  const sizesText = useMemo(
    () => (values.availableSizes ?? []).join(', '),
    [values.availableSizes],
  );

  const handleSizesBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      const raw = e.target.value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      setField('availableSizes', raw);
    },
    [setField],
  );

  // ── Shared form input props ─────────────────────────

  const disabled = isSubmitting;

  return (
    <Modal open onClose={close} size="xl">
      <form onSubmit={handleSubmit} className="flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border-default flex-shrink-0">
          <h2 className="text-xl font-bold text-text-primary">{title}</h2>
          <Button
            variant="ghost"
            size="sm"
            iconLeft={X}
            onClick={close}
            disabled={disabled}
            aria-label="Close form"
          >
            Close
          </Button>
        </div>

        {/* API error banner */}
        {error && (
          <div
            role="alert"
            className="flex items-center gap-2 mx-6 mt-4 p-3 rounded-lg bg-semantic-danger-light text-sm text-semantic-danger"
          >
            <AlertTriangle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            <span>{error}</span>
            <button
              type="button"
              onClick={clearError}
              className="ml-auto text-xs font-medium underline hover:no-underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* ── Basic Info ────────────────────────────── */}
          <FormSection title="Basic Information">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Product Name" htmlFor="name" required>
                <Input
                  id="name"
                  placeholder="e.g. Cotton T-Shirt"
                  value={values.name ?? ''}
                  onChange={handleText('name')}
                  disabled={disabled}
                  required
                />
              </FormField>
              <FormField label="Category" htmlFor="category" required>
                <Input
                  id="category"
                  placeholder="e.g. Apparel"
                  value={values.category ?? ''}
                  onChange={handleText('category')}
                  disabled={disabled}
                  required
                />
              </FormField>
              <FormField label="Sub-Category" htmlFor="subCategory">
                <Input
                  id="subCategory"
                  placeholder="e.g. Polo"
                  value={values.subCategory ?? ''}
                  onChange={handleText('subCategory')}
                  disabled={disabled}
                />
              </FormField>
              <FormField label="Product Group" htmlFor="productGroup" hint="For grouping variants">
                <Input
                  id="productGroup"
                  placeholder="e.g. Summer 2025"
                  value={values.productGroup ?? ''}
                  onChange={handleText('productGroup')}
                  disabled={disabled}
                />
              </FormField>
              <FormField label="Brand" htmlFor="brandName">
                <Input
                  id="brandName"
                  placeholder="e.g. Nike"
                  value={values.brandName ?? ''}
                  onChange={handleText('brandName')}
                  disabled={disabled}
                />
              </FormField>
              <FormField label="Visibility" htmlFor="visibility" required>
                <Select
                  id="visibility"
                  options={VISIBILITY_OPTIONS}
                  value={values.visibility ?? 'Public'}
                  onChange={handleSelect('visibility')}
                  disabled={disabled}
                />
              </FormField>
            </div>
          </FormSection>

          {/* ── Pricing ───────────────────────────────── */}
          <FormSection title="Pricing">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField label="Base Price (৳)" htmlFor="basePrice" required>
                <Input
                  id="basePrice"
                  type="number"
                  placeholder="0.00"
                  min={0}
                  value={values.basePrice ?? 0}
                  onChange={handleNumber('basePrice')}
                  disabled={disabled}
                  required
                />
              </FormField>
              <FormField label="Margin (%)" htmlFor="margin" required hint="Added to base price">
                <Input
                  id="margin"
                  type="number"
                  placeholder="15"
                  min={0}
                  step={1}
                  value={values.margin ?? 0}
                  onChange={handleNumber('margin')}
                  disabled={disabled}
                  required
                />
              </FormField>
              <div className="space-y-1.5">
                <p className="text-xs text-text-tertiary uppercase tracking-wide">
                  Selling Price
                </p>
                <p className="text-2xl font-bold text-emerald-600 tabular-nums">
                  ৳ {sellingPrice.toFixed(2)}
                </p>
                <p className="text-xs text-text-tertiary">
                  Profit per unit: ৳ {estimatedProfit.toFixed(2)}
                </p>
              </div>
            </div>
          </FormSection>

          {/* ── Inventory ─────────────────────────────── */}
          <FormSection title="Inventory">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField label="Stock" htmlFor="stock" required>
                <Input
                  id="stock"
                  type="number"
                  placeholder="0"
                  min={0}
                  value={values.stock ?? 0}
                  onChange={handleNumber('stock')}
                  disabled={disabled}
                  required
                />
              </FormField>
              <FormField label="MOQ (Min Order Qty)" htmlFor="moq" required>
                <Input
                  id="moq"
                  type="number"
                  placeholder="1"
                  min={1}
                  value={values.moq ?? 1}
                  onChange={handleNumber('moq')}
                  disabled={disabled}
                  required
                />
              </FormField>
              <FormField label="Dispatch Time" htmlFor="dispatchTime" required>
                <Select
                  id="dispatchTime"
                  options={DISPATCH_OPTIONS}
                  value={values.dispatchTime ?? ''}
                  onChange={handleSelect('dispatchTime')}
                  placeholder="Select dispatch time"
                  disabled={disabled}
                />
              </FormField>
            </div>
          </FormSection>

          {/* ── Attributes ────────────────────────────── */}
          <FormSection title="Attributes">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField label="Unit Type" htmlFor="unitType">
                <Input
                  id="unitType"
                  placeholder="e.g. Piece, Dozen, Box"
                  value={values.unitType ?? ''}
                  onChange={handleText('unitType')}
                  disabled={disabled}
                />
              </FormField>
              <FormField label="Material" htmlFor="material">
                <Input
                  id="material"
                  placeholder="e.g. Cotton, Polyester"
                  value={values.material ?? ''}
                  onChange={handleText('material')}
                  disabled={disabled}
                />
              </FormField>
              <FormField label="Color" htmlFor="color">
                <Input
                  id="color"
                  placeholder="e.g. Red, Blue"
                  value={values.color ?? ''}
                  onChange={handleText('color')}
                  disabled={disabled}
                />
              </FormField>
              <FormField label="Weight" htmlFor="weight">
                <Input
                  id="weight"
                  placeholder="e.g. 150g"
                  value={values.weight ?? ''}
                  onChange={handleText('weight')}
                  disabled={disabled}
                />
              </FormField>
              <FormField label="Volume" htmlFor="volume">
                <Input
                  id="volume"
                  placeholder="e.g. 0.5L"
                  value={values.volume ?? ''}
                  onChange={handleText('volume')}
                  disabled={disabled}
                />
              </FormField>
              <FormField label="Available Sizes" htmlFor="availableSizes" hint="Comma-separated: S, M, L, XL">
                <Input
                  id="availableSizes"
                  placeholder="S, M, L, XL"
                  defaultValue={sizesText}
                  onBlur={handleSizesBlur}
                  disabled={disabled}
                />
              </FormField>
            </div>
          </FormSection>

          {/* ── Media ─────────────────────────────────── */}
          <FormSection title="Media">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Image URL" htmlFor="imageUrl">
                <Input
                  id="imageUrl"
                  placeholder="https://..."
                  value={values.imageUrl ?? ''}
                  onChange={handleText('imageUrl')}
                  disabled={disabled}
                />
              </FormField>
              <FormField label="Video URL" htmlFor="videoUrl" hint="Demo / product video link">
                <Input
                  id="videoUrl"
                  placeholder="https://..."
                  value={values.videoUrl ?? ''}
                  onChange={handleText('videoUrl')}
                  disabled={disabled}
                />
              </FormField>
            </div>
          </FormSection>

          {/* ── Description ───────────────────────────── */}
          <FormSection title="Description">
            <FormField label="Product Description" htmlFor="description">
              <Textarea
                id="description"
                placeholder="Describe the product..."
                value={values.description ?? ''}
                onChange={handleText('description')}
                disabled={disabled}
                rows={4}
              />
            </FormField>
          </FormSection>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-border-default flex-shrink-0">
          <Button variant="outline" size="md" onClick={close} disabled={disabled}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            iconLeft={isSubmitting ? Loader2 : Save}
            disabled={disabled}
          >
            {isSubmitting ? 'Saving...' : submitLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}