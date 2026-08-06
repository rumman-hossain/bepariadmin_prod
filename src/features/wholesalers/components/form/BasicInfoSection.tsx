import React from 'react';
import { Image, RefreshCw, User } from 'lucide-react';
import { Button, Input } from '@/src/components/controls';
import { FormSection } from '@/src/components/forms/FormSection';
import { FormField } from '@/src/components/forms/FormField';
import { useCategoryOptions } from '@/src/hooks/useCategoryOptions';
import { useWholesalerFormContext } from './useWholesalerFormContext';
import { Text } from '@/src/components/data';

/**
 * Company identity, contact and trading categories.
 */
export function BasicInfoSection() {
  const { values, setField, fieldError, assets } = useWholesalerFormContext();
  const { logoPreviewUrl, logoUpload, onLogoSelected } = assets;
  const logoInputRef = React.useRef<HTMLInputElement>(null);
  const categoriesLabelId = React.useId();
  const {
    categories: availableCategories,
    isLoading: loadingCategories,
    error: categoryError,
    refetch: loadCategories,
  } = useCategoryOptions();

  /** Categories are a multi-select over a flat list — toggle in place. */
  const toggleCategory = (name: string) => {
    const current = values.categories || [];
    setField(
      'categories',
      current.includes(name) ? current.filter((c) => c !== name) : [...current, name],
    );
  };

  // A freshly-picked file shows its local blob URL; a saved one shows the
  // server URL. A `data:` URL is a preview that was never uploaded and must not
  // be treated as a logo.
  const displayLogo =
    logoPreviewUrl ||
    (values.logoUrl && !values.logoUrl.startsWith('data:') ? values.logoUrl : null);

  return (
    <FormSection icon={User} title="Basic Information">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
        <FormField label="Company Name" htmlFor="companyName" required error={fieldError('companyName')}>
          <Input 
            id="companyName" 
            placeholder="e.g. Elegant Apparel Ltd" 
            value={values.companyName} 
            onChange={(e) => setField('companyName', e.target.value)} 
          />
        </FormField>
        <FormField label="Owner Full Name" htmlFor="ownerName" required error={fieldError('ownerName')}>
          <Input 
            id="ownerName" 
            placeholder="e.g. Mohammad Ali" 
            value={values.ownerName} 
            onChange={(e) => setField('ownerName', e.target.value)} 
          />
        </FormField>
        {/*
          The mobile number moved to Login Credentials.
          It sat here labelled "Mobile Number", next to the owner's name, which
          made it read as a contact detail. It is how the supplier signs in — the
          same column the login query matches on — and it belongs in the section
          that says so. One field, not two bound to one value.
        */}
        <FormField
          label="Platform Commission Rate (%)"
          htmlFor="commissionRate"
          error={fieldError('commissionRate')}
        >
          <Input 
            id="commissionRate" 
            type="number" 
            step="any"
            min="0" 
            value={values.commissionRate === undefined || isNaN(values.commissionRate) ? '' : values.commissionRate} 
            onChange={(e) => {
              const val = e.target.value;
              if (val === '') {
                setField('commissionRate', undefined);
              } else {
                const parsed = parseFloat(val);
                setField('commissionRate', isNaN(parsed) ? undefined : Math.max(0, parsed));
              }
            }} 
          />
          <Text as="p" variant="caption" className="mt-1">
            Defaults to 9.5% if blank. 0 is allowed; negatives are blocked.
          </Text>
        </FormField>
      </div>

      {/* Categories Multi-Select Section */}
      <div className="mb-6">
        {/*
          Was a bare <label> with no htmlFor and no wrapped control, which
          associates with nothing — a label in appearance only. The group below
          now points at it with aria-labelledby, so it actually names something.
        */}
        <Text as="div" variant="label" id={categoriesLabelId} className="mb-2">
          Select Business Categories <span className="text-bad">*</span>
        </Text>
        {loadingCategories ? (
          <div className="text-sm text-ink-3 animate-pulse">Loading system categories...</div>
        ) : categoryError ? (
          <div className="flex flex-col gap-2 p-3 rounded-xl border border-bad-border bg-bad-wash">
            <Text as="p" variant="error">{categoryError}</Text>
            <Button type="button" variant="outline" size="sm" iconLeft={RefreshCw} onClick={loadCategories}>
              Retry
            </Button>
          </div>
        ) : (
          <div
            role="group"
            aria-labelledby={categoriesLabelId}
            className="flex flex-wrap gap-2 p-3 bg-sheet-2 rounded-xl border border-rule dark:border-white/5"
          >
            {availableCategories.map((cat) => {
              const isSelected = (values.categories || []).includes(cat.name);
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => toggleCategory(cat.name)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                    isSelected 
                      ? 'border-brass bg-brass text-brass-content' 
                      : 'bg-sheet text-ink-2 border-rule hover:border-rule-strong'
                  }`}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
        )}
        {fieldError('categories') && (
          <p className="mt-1 text-xs text-bad">{fieldError('categories')}</p>
        )}
      </div>

      {/* Premium Logo Uploader */}
      <div className="w-full">
        <Text as="div" variant="label" className="mb-2">
          Company Logo
        </Text>
        <input
          type="file"
          ref={logoInputRef}
          onChange={onLogoSelected}
          accept="image/*"
          className="hidden"
        />
        <div
          onClick={() => logoInputRef.current?.click()}
          className="border-2 border-dashed border-rule hover:border-brass rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-sheet-2 hover:bg-sheet-hover"
        >
          {displayLogo ? (
            <div className="flex flex-col items-center gap-2">
              <img src={displayLogo} alt="Logo preview" className="w-16 h-16 object-cover rounded-xl border border-rule shadow-sm" />
              <span
                className={`text-xs ${
                  logoUpload.status === 'error'
                    ? 'text-bad font-bold'
                    : logoUpload.status === 'done'
                      ? 'text-ok font-bold'
                      : 'text-ink-2'
                }`}
              >
                {logoUpload.status === 'uploading'
                  ? 'Uploading…'
                  : logoUpload.status === 'done'
                    ? 'Uploaded'
                    : logoUpload.status === 'error'
                      ? logoUpload.error || 'Upload failed'
                      : 'Current logo'}
              </span>
              <Text variant="caption" className="hover:text-bad underline mt-1">Change Logo</Text>
            </div>
          ) : (
            <>
              <Image className="w-8 h-8 text-ink-3 mb-2" />
              <p className="text-sm font-bold text-ink-2">Click to select company logo</p>
              <Text as="p" variant="caption" className="mt-1">PNG, JPG or WEBP — uploads immediately on select</Text>
            </>
          )}
        </div>
      </div>
    </FormSection>
  );
}
