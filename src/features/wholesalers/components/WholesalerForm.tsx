import React from 'react';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import { Select } from '@/src/components/ui/Select';
import { Textarea } from '@/src/components/ui/Textarea';
import { FormSection } from '@/src/components/forms/FormSection';
import { FormField } from '@/src/components/forms/FormField';
import { getCategories } from '@/src/api/products';
import type { WholesalerFormData } from '../schemas/wholesalerSchema';
import {
  User, ShieldAlert, FileText, Plus, Trash2,
  Check, Upload, MapPin, Building, Image, RefreshCw,
} from 'lucide-react';

export interface WholesalerFormProps {
  mode: 'create' | 'edit';
  values: WholesalerFormData;
  errors: Record<string, string>;
  isSubmitting: boolean;
  setField: <K extends keyof WholesalerFormData>(field: K, value: WholesalerFormData[K]) => void;
  validate: () => boolean;
  showValidationBanner: boolean;
  onDismissValidationBanner: () => void;
  onCancel: () => void;
  submitLabel: string;
  onPrimaryAction: () => void;
  /** Rendered beside Login Credentials on edit (e.g. admin password reset) */
  credentialsAside?: React.ReactNode;
}

const DISTRICT_OPTIONS = [
  'Dhaka', 'Chittagong', 'Sylhet', 'Rajshahi', 'Khulna', 'Barisal', 'Rangpur', 'Mymensingh',
  'Comilla', 'Narayanganj', 'Gazipur', 'Bogra', 'Jessore', 'Cox\'s Bazar', 'Feni', 'Noakhali',
];

function fieldError(errors: Record<string, string>, path: string): string | undefined {
  return errors[path] ?? errors[path.split('.')[0]];
}

export function WholesalerForm({
  mode,
  values,
  errors,
  isSubmitting,
  setField,
  validate,
  showValidationBanner,
  onDismissValidationBanner,
  onCancel,
  submitLabel,
  onPrimaryAction,
  credentialsAside,
}: WholesalerFormProps) {
  const [availableCategories, setAvailableCategories] = React.useState<{ id: string; name: string }[]>([]);
  const [loadingCategories, setLoadingCategories] = React.useState(true);
  const [categoriesError, setCategoriesError] = React.useState<string | null>(null);

  const loadCategories = React.useCallback(() => {
    setLoadingCategories(true);
    setCategoriesError(null);
    getCategories()
      .then((res) => {
        let catsList: { id: string; name: string }[] = [];
        type CategoriesApiResponse = {
          data?: { id: string; name: string }[];
          categories?: { id: string; name: string }[];
        };
        if (res.ok && Array.isArray(res.data)) {
          catsList = res.data;
        } else if (res.ok && res.data && typeof res.data === 'object') {
          const dataObj = res.data as CategoriesApiResponse;
          const nodes = dataObj.data || dataObj.categories || [];
          if (Array.isArray(nodes)) catsList = nodes;
        }
        if (!res.ok) {
          setCategoriesError(`Failed to load categories (${res.status})`);
          setAvailableCategories([]);
          return;
        }
        if (catsList.length === 0) {
          setCategoriesError('No categories returned from server.');
        }
        setAvailableCategories(catsList);
      })
      .catch(() => {
        setCategoriesError('Could not load categories. Check your connection and retry.');
        setAvailableCategories([]);
      })
      .finally(() => setLoadingCategories(false));
  }, []);

  React.useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // Category selection handler (toggles items in values.categories array)
  const toggleCategory = (catName: string) => {
    const current = values.categories || [];
    const next = current.includes(catName)
      ? current.filter((c) => c !== catName)
      : [...current, catName];
    setField('categories', next);
  };

  const logoInputRef = React.useRef<HTMLInputElement>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = React.useState<string | null>(null);
  const [pendingLogoFile, setPendingLogoFile] = React.useState<File | null>(null);

  React.useEffect(() => {
    if (values.logoUrl && !values.logoUrl.startsWith('data:')) {
      if (logoPreviewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(logoPreviewUrl);
      }
      setLogoPreviewUrl(values.logoUrl);
    }
  }, [values.logoUrl, logoPreviewUrl]);

  React.useEffect(() => {
    return () => {
      if (logoPreviewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(logoPreviewUrl);
      }
    };
  }, [logoPreviewUrl]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (logoPreviewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(logoPreviewUrl);
    }
    setPendingLogoFile(file);
    setLogoPreviewUrl(URL.createObjectURL(file));
    setField('logoUrl', '');
  };

  const [pendingDocs, setPendingDocs] = React.useState<
    Record<string, { fileName: string; fileSize: string }>
  >({});

  const handleDocChange = (key: string, label: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const sizeStr = (file.size / 1024 / 1024).toFixed(2) + ' MB';
    setPendingDocs((prev) => ({
      ...prev,
      [key]: { fileName: file.name, fileSize: sizeStr },
    }));
    const currentDocs = (values.documents || []).filter((d) => d.name !== label);
    setField('documents', currentDocs);
  };

  // Addresses handlers
  const addAddress = () => {
    const nextAddresses = [
      ...(values.addresses || []),
      { addressType: 'warehouse' as const, division: '', district: '', postalCode: '', addressLine: '', isDefault: false }
    ];
    setField('addresses', nextAddresses);
  };

  const removeAddress = (index: number) => {
    const nextAddresses = (values.addresses || []).filter((_, idx) => idx !== index);
    if (values.addresses?.[index]?.isDefault && nextAddresses.length > 0) {
      nextAddresses[0].isDefault = true;
    }
    setField('addresses', nextAddresses);
  };

  const handleAddressChange = (index: number, key: string, val: string | boolean) => {
    const nextAddresses = (values.addresses || []).map((addr, idx) => {
      if (idx === index) {
        return { ...addr, [key]: val };
      }
      if (key === 'isDefault' && val === true) {
        return { ...addr, isDefault: false };
      }
      return addr;
    });
    setField('addresses', nextAddresses);
  };

  // Bank handlers
  const addBankAccount = () => {
    const nextBanks = [
      ...(values.bankDetailsList || []),
      { bankName: '', accountName: '', accountNumber: '', branch: '', routing: '', isDefault: (values.bankDetailsList || []).length === 0 }
    ];
    setField('bankDetailsList', nextBanks);
  };

  const removeBankAccount = (index: number) => {
    const nextBanks = (values.bankDetailsList || []).filter((_, idx) => idx !== index);
    if (values.bankDetailsList?.[index]?.isDefault && nextBanks.length > 0) {
      nextBanks[0].isDefault = true;
    }
    setField('bankDetailsList', nextBanks);
  };

  const handleBankChange = (index: number, key: string, val: string | boolean) => {
    const nextBanks = (values.bankDetailsList || []).map((bank, idx) => {
      if (idx === index) {
        return { ...bank, [key]: val };
      }
      if (key === 'isDefault' && val === true) {
        return { ...bank, isDefault: false };
      }
      return bank;
    });
    setField('bankDetailsList', nextBanks);
  };

  // Mobile wallet handlers
  const addWallet = () => {
    const nextWallets = [
      ...(values.digitalWallets || []),
      { walletType: 'bkash' as const, accountNumber: '', isDefault: (values.digitalWallets || []).length === 0 }
    ];
    setField('digitalWallets', nextWallets);
  };

  const removeWallet = (index: number) => {
    const nextWallets = (values.digitalWallets || []).filter((_, idx) => idx !== index);
    if (values.digitalWallets?.[index]?.isDefault && nextWallets.length > 0) {
      nextWallets[0].isDefault = true;
    }
    setField('digitalWallets', nextWallets);
  };

  const handleWalletChange = (index: number, key: string, val: string | boolean) => {
    const nextWallets = (values.digitalWallets || []).map((wallet, idx) => {
      if (idx === index) {
        return { ...wallet, [key]: val };
      }
      if (key === 'isDefault' && val === true) {
        return { ...wallet, isDefault: false };
      }
      return wallet;
    });
    setField('digitalWallets', nextWallets);
  };

  const displayLogo = logoPreviewUrl || (values.logoUrl && !values.logoUrl.startsWith('data:') ? values.logoUrl : null);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {showValidationBanner && Object.keys(errors).length > 0 && (
        <div className="bg-[#FF3B30]/10 border border-[#FF3B30]/30 rounded-xl p-4 animate-fade-in">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-[#FF3B30] mt-0.5 shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-[#FF3B30]">Please fix the following errors before submitting:</h4>
              <ul className="mt-1.5 text-xs text-[#FF3B30]/80 space-y-0.5 list-disc list-inside">
                {Object.entries(errors).map(([field, msg]) => (
                  <li key={field}><span className="font-semibold">{field}:</span> {msg}</li>
                ))}
              </ul>
            </div>
            <button
              type="button"
              onClick={onDismissValidationBanner}
              className="text-[#FF3B30]/60 hover:text-[#FF3B30] text-xs font-bold ml-auto"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onPrimaryAction();
        }}
        className="space-y-8"
      >
        {credentialsAside ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-start">
            <FormSection icon={ShieldAlert} title="Login Credentials">
              <div className="grid grid-cols-1 gap-5">
                <FormField label="Login Email" htmlFor="email" required error={fieldError(errors, 'email')}>
                  <Input
                    id="email"
                    type="email"
                    placeholder="e.g. supplier@domain.com"
                    value={values.email}
                    onChange={(e) => setField('email', e.target.value)}
                  />
                </FormField>
              </div>
            </FormSection>
            <div className="min-w-0">{credentialsAside}</div>
          </div>
        ) : (
          <FormSection icon={ShieldAlert} title="Login Credentials">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <FormField label="Login Email" htmlFor="email" required error={fieldError(errors, 'email')}>
                <Input
                  id="email"
                  type="email"
                  placeholder="e.g. supplier@domain.com"
                  value={values.email}
                  onChange={(e) => setField('email', e.target.value)}
                />
              </FormField>
              {mode === 'create' && (
                <FormField label="Password" htmlFor="password" required error={fieldError(errors, 'password')}>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Enter a secure password (min 8 characters)"
                    value={values.password || ''}
                    onChange={(e) => setField('password', e.target.value)}
                  />
                </FormField>
              )}
            </div>
          </FormSection>
        )}

        <div className="border-t border-[rgba(60,60,67,0.08)] dark:border-[rgba(255,255,255,0.06)]" />

        {/* 2. Basic Information */}
        <FormSection icon={User} title="Basic Information">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
            <FormField label="Company Name" htmlFor="companyName" required error={errors.companyName}>
              <Input 
                id="companyName" 
                placeholder="e.g. Elegant Apparel Ltd" 
                value={values.companyName} 
                onChange={(e) => setField('companyName', e.target.value)} 
              />
            </FormField>
            <FormField label="Owner Full Name" htmlFor="ownerName" required error={errors.ownerName}>
              <Input 
                id="ownerName" 
                placeholder="e.g. Mohammad Ali" 
                value={values.ownerName} 
                onChange={(e) => setField('ownerName', e.target.value)} 
              />
            </FormField>
            <FormField label="Mobile Number" htmlFor="mobile" required error={errors.mobile}>
              <Input 
                id="mobile" 
                type="text" 
                placeholder="e.g. 01712345678" 
                value={values.mobile} 
                onChange={(e) => setField('mobile', e.target.value)} 
              />
            </FormField>
            <FormField
              label="Platform Commission Rate (%)"
              htmlFor="commissionRate"
              error={errors.commissionRate}
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
              <p className="text-xs text-text-muted mt-1">
                Defaults to 9.5% if blank. 0 is allowed; negatives are blocked.
              </p>
            </FormField>
          </div>

          {/* Categories Multi-Select Section */}
          <div className="mb-6">
            <label className="block text-xs font-bold text-[#8E8E93] dark:text-[#8E8E93] uppercase tracking-wider mb-2">
              Select Business Categories <span className="text-[#FF3B30]">*</span>
            </label>
            {loadingCategories ? (
              <div className="text-sm text-slate-400 animate-pulse">Loading system categories...</div>
            ) : categoriesError ? (
              <div className="flex flex-col gap-2 p-3 rounded-xl border border-red-200 bg-red-50/50 dark:bg-red-950/20">
                <p className="text-sm text-red-600">{categoriesError}</p>
                <Button type="button" variant="outline" size="sm" iconLeft={RefreshCw} onClick={loadCategories}>
                  Retry
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-[rgba(60,60,67,0.12)] dark:border-white/5">
                {availableCategories.map((cat) => {
                  const isSelected = (values.categories || []).includes(cat.name);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => toggleCategory(cat.name)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                        isSelected 
                          ? 'bg-[#007AFF] text-white border-[#007AFF] shadow-sm' 
                          : 'bg-white dark:bg-[#1C1C1E] text-slate-600 dark:text-slate-300 border-[rgba(60,60,67,0.15)] hover:border-slate-400'
                      }`}
                    >
                      {cat.name}
                    </button>
                  );
                })}
              </div>
            )}
            {errors.categories && (
              <p className="mt-1 text-xs text-[#FF3B30]">{errors.categories}</p>
            )}
          </div>

          {/* Premium Logo Uploader */}
          <div className="w-full">
            <label className="block text-xs font-bold text-[#8E8E93] dark:text-[#8E8E93] uppercase tracking-wider mb-2">
              Company Logo
            </label>
            <input
              type="file"
              ref={logoInputRef}
              onChange={handleLogoChange}
              accept="image/*"
              className="hidden"
            />
            <div
              onClick={() => logoInputRef.current?.click()}
              className="border-2 border-dashed border-[rgba(60,60,67,0.2)] dark:border-white/10 hover:border-[#007AFF] dark:hover:border-[#007AFF] rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-white/40 dark:bg-black/10 hover:bg-slate-50/50"
            >
              {displayLogo ? (
                <div className="flex flex-col items-center gap-2">
                  <img src={displayLogo} alt="Logo preview" className="w-16 h-16 object-cover rounded-xl border border-slate-200 shadow-sm" />
                  <span className="text-xs text-slate-500">
                    {pendingLogoFile ? 'Selected — will upload when storage API is connected' : 'Current logo'}
                  </span>
                  <span className="text-xs text-slate-400 hover:text-[#FF3B30] underline mt-1">Change Logo</span>
                </div>
              ) : (
                <>
                  <Image className="w-8 h-8 text-slate-400 mb-2" />
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Click to select company logo</p>
                  <p className="text-xs text-slate-400 mt-1">PNG, JPG or WEBP (upload when storage API is connected)</p>
                </>
              )}
            </div>
          </div>
        </FormSection>

        <div className="border-t border-[rgba(60,60,67,0.08)] dark:border-[rgba(255,255,255,0.06)]" />

        {/* 3. Addresses Section */}
        <FormSection icon={MapPin} title="Addresses (Multi-Address)">
          <div className="space-y-6">
            {(values.addresses || []).map((addr, index) => (
              <div 
                key={index} 
                className="p-5 rounded-2xl bg-white/40 dark:bg-white/5 border border-[rgba(60,60,67,0.08)] dark:border-white/5 relative group animate-slide-up"
              >
                <div className="absolute top-4 right-4 flex items-center gap-2">
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={addr.isDefault}
                      onChange={(e) => handleAddressChange(index, 'isDefault', e.target.checked)}
                      className="rounded text-[#007AFF] focus:ring-[#007AFF] border-[rgba(60,60,67,0.3)] w-4 h-4"
                    />
                    <span className="text-xs font-bold text-slate-500">Default Address</span>
                  </label>
                  {values.addresses.length > 1 && (
                    <button 
                      type="button" 
                      onClick={() => removeAddress(index)}
                      className="p-1.5 rounded-lg text-slate-400 hover:bg-[#FF3B30]/10 hover:text-[#FF3B30] transition-colors"
                      title="Delete address"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="text-sm font-bold text-[#1C1C1E] dark:text-white mb-4 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#007AFF]/10 text-[#007AFF] flex items-center justify-center text-xs">
                    {index + 1}
                  </span>
                  Address Details
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <FormField label="Address Type" htmlFor={`addr-type-${index}`}>
                    <Select
                      id={`addr-type-${index}`}
                      options={[
                        { label: 'Primary Office', value: 'primary' },
                        { label: 'Warehouse / Factory', value: 'warehouse' },
                        { label: 'Return Address', value: 'return' },
                        { label: 'Billing Address', value: 'billing' }
                      ]}
                      value={addr.addressType}
                      onChange={(e) => handleAddressChange(index, 'addressType', e.target.value)}
                    />
                  </FormField>
                  <FormField label="District" htmlFor={`addr-district-${index}`} required>
                    <Select
                      id={`addr-district-${index}`}
                      placeholder="Select district"
                      options={DISTRICT_OPTIONS.map(d => ({ label: d, value: d }))}
                      value={addr.district || ''}
                      onChange={(e) => handleAddressChange(index, 'district', e.target.value)}
                    />
                  </FormField>
                  <FormField label="Postal Code" htmlFor={`addr-post-${index}`} required>
                    <Input
                      id={`addr-post-${index}`}
                      placeholder="e.g. 1230"
                      value={addr.postalCode}
                      onChange={(e) => handleAddressChange(index, 'postalCode', e.target.value)}
                    />
                  </FormField>
                </div>
                <FormField label="Full Address Line" htmlFor={`addr-line-${index}`} required>
                  <Textarea
                    id={`addr-line-${index}`}
                    rows={2}
                    placeholder="e.g. House #15, Road #4, Sector #3, Uttara"
                    value={addr.addressLine}
                    onChange={(e) => handleAddressChange(index, 'addressLine', e.target.value)}
                  />
                </FormField>
              </div>
            ))}

            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              iconLeft={Plus}
              onClick={addAddress}
              className="w-full md:w-auto"
            >
              Add Another Address
            </Button>
          </div>
        </FormSection>

        <div className="border-t border-[rgba(60,60,67,0.08)] dark:border-[rgba(255,255,255,0.06)]" />

        {/* 4. Financial Information */}
        <FormSection icon={Building} title="Financial Details (Multiple Bank/Wallets)">
          <div className="space-y-6">
            
            {/* Banks Section */}
            <div className="space-y-4">
              <div className="text-sm font-bold text-slate-500 flex items-center justify-between border-b pb-2">
                <span>Bank Accounts</span>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  iconLeft={Plus} 
                  onClick={addBankAccount}
                  className="text-[#007AFF] hover:bg-[#007AFF]/5"
                >
                  Add Bank
                </Button>
              </div>

              {(values.bankDetailsList || []).length === 0 ? (
                <div className="text-xs text-slate-400 italic p-4 bg-slate-50 dark:bg-black/5 rounded-xl border border-dashed text-center">
                  No bank accounts added yet. Click 'Add Bank' to configure.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(values.bankDetailsList || []).map((bank, index) => (
                    <div 
                      key={index}
                      className="p-4 rounded-xl border border-[rgba(60,60,67,0.08)] dark:border-white/5 bg-white/40 dark:bg-white/5 relative"
                    >
                      <div className="absolute top-3 right-3 flex items-center gap-2">
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={bank.isDefault}
                            onChange={(e) => handleBankChange(index, 'isDefault', e.target.checked)}
                            className="rounded text-[#007AFF] w-3.5 h-3.5 border-slate-300"
                          />
                          <span className="text-[10px] font-bold text-slate-400">Default</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => removeBankAccount(index)}
                          className="p-1 text-slate-400 hover:text-[#FF3B30]"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="space-y-3 pt-2">
                        <FormField label="Bank Name" htmlFor={`bank-name-${index}`} required>
                          <Input 
                            id={`bank-name-${index}`} 
                            placeholder="e.g. Dutch-Bangla Bank" 
                            value={bank.bankName} 
                            onChange={(e) => handleBankChange(index, 'bankName', e.target.value)} 
                          />
                        </FormField>
                        <FormField label="Account Holder Name" htmlFor={`bank-acc-name-${index}`} required>
                          <Input 
                            id={`bank-acc-name-${index}`} 
                            placeholder="e.g. Elegant Fabrics Ltd" 
                            value={bank.accountName} 
                            onChange={(e) => handleBankChange(index, 'accountName', e.target.value)} 
                          />
                        </FormField>
                        <FormField label="Account Number" htmlFor={`bank-acc-num-${index}`} required>
                          <Input 
                            id={`bank-acc-num-${index}`} 
                            placeholder="Account Number" 
                            value={bank.accountNumber} 
                            onChange={(e) => handleBankChange(index, 'accountNumber', e.target.value)} 
                          />
                        </FormField>
                        <div className="grid grid-cols-2 gap-2">
                          <FormField label="Branch Name" htmlFor={`bank-branch-${index}`}>
                            <Input 
                              id={`bank-branch-${index}`} 
                              placeholder="Branch" 
                              value={bank.branch || ''} 
                              onChange={(e) => handleBankChange(index, 'branch', e.target.value)} 
                            />
                          </FormField>
                          <FormField label="Routing Number" htmlFor={`bank-routing-${index}`}>
                            <Input 
                              id={`bank-routing-${index}`} 
                              placeholder="Routing" 
                              value={bank.routing || ''} 
                              onChange={(e) => handleBankChange(index, 'routing', e.target.value)} 
                            />
                          </FormField>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Mobile Wallets Section */}
            <div className="space-y-4 pt-4">
              <div className="text-sm font-bold text-slate-500 flex items-center justify-between border-b pb-2">
                <span>Mobile Wallets</span>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  iconLeft={Plus} 
                  onClick={addWallet}
                  className="text-[#007AFF] hover:bg-[#007AFF]/5"
                >
                  Add Wallet
                </Button>
              </div>

              {(values.digitalWallets || []).length === 0 ? (
                <div className="text-xs text-slate-400 italic p-4 bg-slate-50 dark:bg-black/5 rounded-xl border border-dashed text-center">
                  No mobile money wallets added. Click 'Add Wallet' to configure.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {(values.digitalWallets || []).map((wallet, index) => (
                    <div 
                      key={index}
                      className="p-4 rounded-xl border border-[rgba(60,60,67,0.08)] dark:border-white/5 bg-white/40 dark:bg-white/5 relative"
                    >
                      <div className="absolute top-3 right-3 flex items-center gap-2">
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={wallet.isDefault}
                            onChange={(e) => handleWalletChange(index, 'isDefault', e.target.checked)}
                            className="rounded text-[#007AFF] w-3.5 h-3.5 border-slate-300"
                          />
                          <span className="text-[10px] font-bold text-slate-400">Default</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => removeWallet(index)}
                          className="p-1 text-slate-400 hover:text-[#FF3B30]"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="space-y-3 pt-2">
                        <FormField label="Wallet Type" htmlFor={`wallet-type-${index}`}>
                          <Select
                            id={`wallet-type-${index}`}
                            options={[
                              { label: 'bKash', value: 'bkash' },
                              { label: 'Nagad', value: 'nagad' },
                              { label: 'Rocket', value: 'rocket' },
                              { label: 'Upay', value: 'upay' }
                            ]}
                            value={wallet.walletType}
                            onChange={(e) => handleWalletChange(index, 'walletType', e.target.value)}
                          />
                        </FormField>
                        <FormField label="Mobile Account Number" htmlFor={`wallet-num-${index}`} required>
                          <Input 
                            id={`wallet-num-${index}`} 
                            placeholder="e.g. 018XXXXXXXX" 
                            value={wallet.accountNumber} 
                            onChange={(e) => handleWalletChange(index, 'accountNumber', e.target.value)} 
                          />
                        </FormField>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </FormSection>

        <div className="border-t border-[rgba(60,60,67,0.08)] dark:border-[rgba(255,255,255,0.06)]" />

        {/* 5. Documents Uploads */}
        <FormSection icon={FileText} title="Documents Upload">
          <p className="text-xs text-slate-500 mb-4 -mt-2">
            Files are selected locally. They will upload when the document storage API is connected.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { key: 'tradeLicense', label: 'Trade License' },
              { key: 'tin', label: 'TIN Certificate' },
              { key: 'vat', label: 'VAT Registration' },
              { key: 'nid', label: 'Owner NID Photo' }
            ].map((doc) => (
              <DocumentUploadSlot
                key={doc.key}
                docKey={doc.key}
                label={doc.label}
                pending={pendingDocs[doc.key]}
                existing={values.documents?.find((d) => d.name === doc.label)}
                onFileSelect={handleDocChange(doc.key, doc.label)}
              />
            ))}
          </div>
        </FormSection>

        {/* Form Action buttons */}
        <div className="flex justify-end gap-4 pt-4 border-t border-[rgba(60,60,67,0.08)] dark:border-[rgba(255,255,255,0.06)]">
          <Button variant="secondary" size="md" onClick={onCancel} type="button">
            Cancel
          </Button>
          <Button variant="primary" size="md" loading={isSubmitting} type="submit">
            {submitLabel}
          </Button>
        </div>
      </form>
    </div>
  );
}

function DocumentUploadSlot({
  label,
  pending,
  existing,
  onFileSelect,
}: {
  docKey: string;
  label: string;
  pending?: { fileName: string; fileSize: string };
  existing?: { name: string; fileUrl?: string; status: string };
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const hasServerFile = existing?.fileUrl && !existing.fileUrl.startsWith('mock-gcs://');

  return (
    <div className="p-4 rounded-xl border border-[rgba(60,60,67,0.1)] dark:border-white/5 bg-slate-50/50 dark:bg-black/10 flex flex-col justify-between">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">{label}</h4>
          <p className="text-xs text-slate-400">PDF or high-res Image format</p>
        </div>
        {pending ? (
          <span className="text-xs text-[#007AFF] font-bold flex items-center gap-0.5">
            <Check className="w-3.5 h-3.5" /> Selected
          </span>
        ) : hasServerFile ? (
          <span className="text-xs text-[#34C759] font-bold">On file</span>
        ) : (
          <span className="text-xs text-slate-400">Not uploaded</span>
        )}
      </div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={onFileSelect}
        accept="image/*,application/pdf"
        className="hidden"
      />
      {pending && (
        <div className="p-3 bg-white dark:bg-[#1C1C1E] rounded-lg border flex flex-col gap-2 shadow-xs mb-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 dark:text-slate-300 truncate max-w-[180px]">
              {pending.fileName}
            </span>
            <span className="text-slate-400">{pending.fileSize}</span>
          </div>
        </div>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        iconLeft={Upload}
        onClick={() => fileInputRef.current?.click()}
        className="w-full"
      >
        Select File
      </Button>
    </div>
  );
}
