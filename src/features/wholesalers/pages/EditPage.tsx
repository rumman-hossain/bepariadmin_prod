import React from 'react';
import { useParams } from 'react-router-dom';
import { PageHeader } from '@/src/components/shared/PageHeader';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import { Select } from '@/src/components/ui/Select';
import { Textarea } from '@/src/components/ui/Textarea';
import { FormSection } from '@/src/components/forms/FormSection';
import { FormField } from '@/src/components/forms/FormField';
import { useWholesalerForm } from '../hooks/useWholesalerForm';
import { useWholesalerDetail } from '../hooks/useWholesalerDetail';
import { getWholesaler } from '../api/wholesalerApi';
import { useWholesalerStore } from '../store';
import { getCategories } from '@/src/api/products';
import {
  User, ShieldAlert, FileText, Plus, Trash2,
  Check, CheckCircle2, Upload, MapPin, Building, Image, Loader2
} from 'lucide-react';

export interface EditPageProps {
  onNavigate: (path: string) => void;
}

const DISTRICT_OPTIONS = [
  'Dhaka', 'Chittagong', 'Sylhet', 'Rajshahi', 'Khulna', 'Barisal', 'Rangpur', 'Mymensingh',
  'Comilla', 'Narayanganj', 'Gazipur', 'Bogra', 'Jessore', 'Cox\'s Bazar', 'Feni', 'Noakhali'
];

export function EditPage({ onNavigate }: EditPageProps) {
  const { id } = useParams<{ id: string }>();
  const { selectedWholesaler, goBack } = useWholesalerDetail();

  // Fetch wholesaler from API if not in store (direct URL navigation)
  const addWholesaler = useWholesalerStore((s) => s.addWholesaler);
  const selectWholesaler = useWholesalerStore((s) => s.selectWholesaler);
  const [isLoadingWholesaler, setIsLoadingWholesaler] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!id) return;
    if (selectedWholesaler) return; // already in store
    setIsLoadingWholesaler(true);
    setLoadError(null);
    getWholesaler(id)
      .then((ws) => {
        addWholesaler(ws);
        selectWholesaler(id);
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Failed to load wholesaler';
        setLoadError(msg);
      })
      .finally(() => setIsLoadingWholesaler(false));
  }, [id, selectedWholesaler, addWholesaler, selectWholesaler]);

  const [validationFailed, setValidationFailed] = React.useState(false);

  const { values, errors, isSubmitting, setField, handleSubmit } = useWholesalerForm({
    initialData: selectedWholesaler ? {
      id: selectedWholesaler.id,
      companyName: selectedWholesaler.companyName,
      categories: selectedWholesaler.category ? selectedWholesaler.category.split(',').map((c: string) => c.trim()) : [],
      status: selectedWholesaler.status,
      acceptanceRate: selectedWholesaler.acceptanceRate,
      dispatchSpeed: selectedWholesaler.dispatchSpeed,
      riskScore: selectedWholesaler.riskScore,
      createdAt: selectedWholesaler.createdAt,
      ownerName: selectedWholesaler.ownerName || '',
      mobile: selectedWholesaler.mobile || '',
      email: selectedWholesaler.email || '',
      logoUrl: selectedWholesaler.logoUrl || '',
      commissionRate: selectedWholesaler.commissionRate ?? 9.5,
      addresses: selectedWholesaler.addresses && selectedWholesaler.addresses.length > 0 ? selectedWholesaler.addresses.map(a => ({
        id: a.id,
        addressType: a.addressType,
        division: a.division || '',
        district: a.district,
        postalCode: a.postalCode,
        addressLine: a.addressLine,
        isDefault: a.isDefault,
      })) : [
        {
          addressType: 'primary',
          division: '',
          district: selectedWholesaler.location || 'Dhaka',
          postalCode: '',
          addressLine: selectedWholesaler.address || '',
          isDefault: true,
        }
      ],
      bankDetailsList: selectedWholesaler.bankDetailsList && selectedWholesaler.bankDetailsList.length > 0 ? selectedWholesaler.bankDetailsList.map(b => ({
        id: b.id,
        bankName: b.bankName,
        accountName: b.accountName,
        accountNumber: b.accountNumber,
        branch: b.branch || '',
        routing: b.routing || '',
        isDefault: b.isDefault,
      })) : (selectedWholesaler.bankDetails?.bankName ? [
        {
          bankName: selectedWholesaler.bankDetails.bankName,
          accountName: selectedWholesaler.bankDetails.accountName,
          accountNumber: selectedWholesaler.bankDetails.accountNumber,
          branch: selectedWholesaler.bankDetails.branch || '',
          routing: selectedWholesaler.bankDetails.routing || '',
          isDefault: true,
        }
      ] : []),
      digitalWallets: selectedWholesaler.digitalWallets && selectedWholesaler.digitalWallets.length > 0 ? selectedWholesaler.digitalWallets.map(w => ({
        id: w.id,
        walletType: w.walletType,
        accountNumber: w.accountNumber,
        isDefault: w.isDefault,
      })) : (selectedWholesaler.digitalWallet?.accountNumber ? [
        {
          walletType: selectedWholesaler.digitalWallet.walletType as 'bkash' | 'nagad' | 'rocket' | 'upay',
          accountNumber: selectedWholesaler.digitalWallet.accountNumber,
          isDefault: true,
        }
      ] : []),
      documents: selectedWholesaler.documents || [],
    } : undefined,
    onSuccess: () => onNavigate('/wholesalers'),
  });

  // Dynamic categories state
  const [availableCategories, setAvailableCategories] = React.useState<{ id: string; name: string }[]>([]);
  const [loadingCategories, setLoadingCategories] = React.useState(true);

  React.useEffect(() => {
    setLoadingCategories(true);
    getCategories()
      .then((res) => {
        let catsList: { id: string; name: string }[] = [];
        if (res.ok && Array.isArray(res.data)) {
          catsList = res.data;
        } else if (res.ok && res.data && typeof res.data === 'object') {
          type CategoriesApiResponse = { data?: { id: string; name: string }[]; categories?: { id: string; name: string }[] };
          const nodes = (res.data as CategoriesApiResponse).data || (res.data as CategoriesApiResponse).categories || [];
          if (Array.isArray(nodes)) catsList = nodes;
        }

        // If API succeeded but returned empty array, use standard categories as fallback
        if (catsList.length === 0) {
          catsList = [
            { id: '1', name: 'Apparel' },
            { id: '2', name: 'Electronics' },
            { id: '3', name: 'FMCG' },
            { id: '4', name: 'Footwear' },
            { id: '5', name: 'Bags' }
          ];
        }
        setAvailableCategories(catsList);
      })
      .catch((err) => {
        console.error('Error loading categories:', err);
        // On request failure, fall back to standard category list
        setAvailableCategories([
          { id: '1', name: 'Apparel' },
          { id: '2', name: 'Electronics' },
          { id: '3', name: 'FMCG' },
          { id: '4', name: 'Footwear' },
          { id: '5', name: 'Bags' }
        ]);
      })
      .finally(() => setLoadingCategories(false));
  }, []);

  // Category selection handler
  const toggleCategory = (catName: string) => {
    const current = values.categories || [];
    const next = current.includes(catName)
      ? current.filter((c) => c !== catName)
      : [...current, catName];
    setField('categories', next);
  };

  // Logo upload simulation
  const [logoUploading, setLogoUploading] = React.useState(false);
  const [logoUploadProgress, setLogoUploadProgress] = React.useState(0);
  const logoInputRef = React.useRef<HTMLInputElement>(null);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLogoUploading(true);
    setLogoUploadProgress(10);

    const interval = setInterval(() => {
      setLogoUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setLogoUploading(false);
          return 100;
        }
        return prev + 30;
      });
    }, 120);

    const reader = new FileReader();
    reader.onloadend = () => {
      setField('logoUrl', reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Documents upload simulation
  const [docStates, setDocStates] = React.useState<Record<string, { fileName: string; fileSize: string; uploading: boolean; progress: number }>>({});

  const handleDocChange = (key: string, label: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const sizeStr = (file.size / 1024 / 1024).toFixed(2) + ' MB';
    setDocStates((prev) => ({
      ...prev,
      [key]: { fileName: file.name, fileSize: sizeStr, uploading: true, progress: 10 }
    }));

    const interval = setInterval(() => {
      setDocStates((prev) => {
        const current = prev[key];
        if (!current) {
          clearInterval(interval);
          return prev;
        }
        if (current.progress >= 100) {
          clearInterval(interval);
          return {
            ...prev,
            [key]: { ...current, uploading: false, progress: 100 }
          };
        }
        return {
          ...prev,
          [key]: { ...current, progress: current.progress + 30 }
        };
      });
    }, 120);

    // Save document details
    const currentDocs = [...(values.documents || [])];
    const existingIdx = currentDocs.findIndex((d) => d.name === label);
    const newDoc = {
      name: label,
      status: 'Verified',
      date: new Date().toISOString().split('T')[0],
      fileUrl: `mock-gcs://${file.name}`
    };

    if (existingIdx >= 0) {
      currentDocs[existingIdx] = newDoc;
    } else {
      currentDocs.push(newDoc);
    }
    setField('documents', currentDocs);
  };

  // Addresses handlers
  const addAddress = () => {
    const nextAddresses = [
      ...(values.addresses || []),
      { addressType: 'warehouse' as const, division: '', district: 'Dhaka', postalCode: '', addressLine: '', isDefault: false }
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

  // Mobile money handlers
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

  // Pre-load file states for documents already registered
  React.useEffect(() => {
    if (selectedWholesaler?.documents) {
      const initialStates: typeof docStates = {};
      selectedWholesaler.documents.forEach((d) => {
        const keyMap: Record<string, string> = {
          'Trade License': 'tradeLicense',
          'TIN Certificate': 'tin',
          'VAT Registration': 'vat',
          'Owner NID Photo': 'nid'
        };
        const key = keyMap[d.name];
        if (key) {
          initialStates[key] = {
            fileName: d.fileUrl ? d.fileUrl.replace('gs://', '').split('/').pop() || d.name : 'Uploaded Document',
            fileSize: 'Verified',
            uploading: false,
            progress: 100
          };
        }
      });
      setDocStates(initialStates);
    }
  }, [selectedWholesaler]);

  if (isLoadingWholesaler) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 animate-pulse">
        Loading wholesaler...
      </div>
    );
  }

  if (!selectedWholesaler) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-slate-400">
        <p>{loadError ?? 'Wholesaler not found.'}</p>
        <Button variant="ghost" onClick={goBack}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <PageHeader
        title={`Edit ${selectedWholesaler.companyName}`}
        subtitle="Modify login credentials, business details, addresses, and documentation"
        onBack={() => onNavigate(`/wholesalers/${selectedWholesaler.id}`)}
      />

      {validationFailed && Object.keys(errors).length > 0 && (
        <div className="bg-[#FF3B30]/10 border border-[#FF3B30]/30 rounded-xl p-4 animate-fade-in">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-[#FF3B30] mt-0.5 shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-[#FF3B30]">Please fix the following errors before saving:</h4>
              <ul className="mt-1.5 text-xs text-[#FF3B30]/80 space-y-0.5 list-disc list-inside">
                {Object.entries(errors).map(([field, msg]) => (
                  <li key={field}><span className="font-semibold">{field}:</span> {msg}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <form 
        onSubmit={async (e) => { 
          e.preventDefault(); 
          const ok = await handleSubmit(); 
          if (!ok) {
            setValidationFailed(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }} 
        className="space-y-8"
      >

        {/* 1. Login Email (AT THE TOP) */}
        <FormSection icon={ShieldAlert} title="Login Credentials">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <FormField label="Login Email" htmlFor="edit-email" required error={errors.email}>
              <Input
                id="edit-email"
                type="email"
                placeholder="supplier@domain.com"
                value={values.email}
                onChange={(e) => setField('email', e.target.value)}
              />
            </FormField>
            <div className="flex items-center p-4 bg-[#F2F2F7] dark:bg-[#1C1C1E] rounded-xl text-xs text-slate-500 border border-[rgba(60,60,67,0.08)]">
              Password updates are managed securely under account access control settings and cannot be changed from this profile editor.
            </div>
          </div>
        </FormSection>

        <div className="border-t border-[rgba(60,60,67,0.08)] dark:border-[rgba(255,255,255,0.06)]" />

        {/* 2. Basic Information */}
        <FormSection icon={User} title="Basic Information">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
            <FormField label="Company Name" htmlFor="edit-companyName" required error={errors.companyName}>
              <Input
                id="edit-companyName"
                placeholder="Company Name"
                value={values.companyName}
                onChange={(e) => setField('companyName', e.target.value)}
              />
            </FormField>
            <FormField label="Owner Full Name" htmlFor="edit-ownerName" required error={errors.ownerName}>
              <Input
                id="edit-ownerName"
                placeholder="Owner Name"
                value={values.ownerName}
                onChange={(e) => setField('ownerName', e.target.value)}
              />
            </FormField>
            <FormField label="Mobile Number" htmlFor="edit-mobile" required error={errors.mobile}>
              <Input
                id="edit-mobile"
                type="text"
                placeholder="Mobile"
                value={values.mobile}
                onChange={(e) => setField('mobile', e.target.value)}
              />
            </FormField>
            <FormField label="Platform Commission Rate (%)" htmlFor="edit-commissionRate" error={errors.commissionRate}>
              <Input
                id="edit-commissionRate"
                type="number"
                step="any"
                min="0"
                max="100"
                value={values.commissionRate === undefined || isNaN(values.commissionRate) ? '' : values.commissionRate}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') {
                    setField('commissionRate', undefined);
                  } else {
                    const parsed = parseFloat(val);
                    setField('commissionRate', isNaN(parsed) ? undefined : parsed);
                  }
                }}
              />
            </FormField>
          </div>

          {/* Categories Multi-Select Section */}
          <div className="mb-6">
            <label className="block text-xs font-bold text-[#8E8E93] dark:text-[#8E8E93] uppercase tracking-wider mb-2">
              Select Business Categories <span className="text-[#FF3B30]">*</span>
            </label>
            {loadingCategories ? (
              <div className="text-sm text-slate-400 animate-pulse">Loading system categories...</div>
            ) : (
              <div className="flex flex-wrap gap-2 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-[rgba(60,60,67,0.12)] dark:border-white/5">
                {availableCategories.map((cat) => {
                  const isSelected = (values.categories || []).includes(cat.name);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => toggleCategory(cat.name)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${isSelected
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
              {logoUploading ? (
                <div className="w-full max-w-xs space-y-2">
                  <div className="text-sm font-bold text-slate-500">Uploading Logo...</div>
                  <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-[#007AFF] transition-all duration-150" style={{ width: `${logoUploadProgress}%` }} />
                  </div>
                </div>
              ) : values.logoUrl ? (
                <div className="flex flex-col items-center gap-2">
                  <img src={values.logoUrl} alt="Logo preview" className="w-16 h-16 object-cover rounded-xl border border-slate-200 shadow-sm" />
                  <div className="text-xs font-bold text-[#34C759] flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Logo uploaded successfully
                  </div>
                  <span className="text-xs text-slate-400 hover:text-[#FF3B30] underline mt-1">Change Logo</span>
                </div>
              ) : (
                <>
                  <Image className="w-8 h-8 text-slate-400 mb-2" />
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Click to upload company logo</p>
                  <p className="text-xs text-slate-400 mt-1">PNG, JPG or WEBP (Max 5MB)</p>
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
                  <FormField label="Address Type" htmlFor={`edit-addr-type-${index}`}>
                    <Select
                      id={`edit-addr-type-${index}`}
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
                  <FormField label="District" htmlFor={`edit-addr-district-${index}`} required>
                    <Select
                      id={`edit-addr-district-${index}`}
                      options={DISTRICT_OPTIONS.map(d => ({ label: d, value: d }))}
                      value={addr.district}
                      onChange={(e) => handleAddressChange(index, 'district', e.target.value)}
                    />
                  </FormField>
                  <FormField label="Postal Code" htmlFor={`edit-addr-post-${index}`} required>
                    <Input
                      id={`edit-addr-post-${index}`}
                      placeholder="e.g. 1230"
                      value={addr.postalCode}
                      onChange={(e) => handleAddressChange(index, 'postalCode', e.target.value)}
                    />
                  </FormField>
                </div>
                <FormField label="Full Address Line" htmlFor={`edit-addr-line-${index}`} required>
                  <Textarea
                    id={`edit-addr-line-${index}`}
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
                        <FormField label="Bank Name" htmlFor={`edit-bank-name-${index}`} required>
                          <Input
                            id={`edit-bank-name-${index}`}
                            placeholder="Dutch-Bangla Bank"
                            value={bank.bankName}
                            onChange={(e) => handleBankChange(index, 'bankName', e.target.value)}
                          />
                        </FormField>
                        <FormField label="Account Holder Name" htmlFor={`edit-bank-acc-name-${index}`} required>
                          <Input
                            id={`edit-bank-acc-name-${index}`}
                            placeholder="Elegant Fabrics Ltd"
                            value={bank.accountName}
                            onChange={(e) => handleBankChange(index, 'accountName', e.target.value)}
                          />
                        </FormField>
                        <FormField label="Account Number" htmlFor={`edit-bank-acc-num-${index}`} required>
                          <Input
                            id={`edit-bank-acc-num-${index}`}
                            placeholder="Account Number"
                            value={bank.accountNumber}
                            onChange={(e) => handleBankChange(index, 'accountNumber', e.target.value)}
                          />
                        </FormField>
                        <div className="grid grid-cols-2 gap-2">
                          <FormField label="Branch Name" htmlFor={`edit-bank-branch-${index}`}>
                            <Input
                              id={`edit-bank-branch-${index}`}
                              placeholder="Branch"
                              value={bank.branch || ''}
                              onChange={(e) => handleBankChange(index, 'branch', e.target.value)}
                            />
                          </FormField>
                          <FormField label="Routing Number" htmlFor={`edit-bank-routing-${index}`}>
                            <Input
                              id={`edit-bank-routing-${index}`}
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
                        <FormField label="Wallet Type" htmlFor={`edit-wallet-type-${index}`}>
                          <Select
                            id={`edit-wallet-type-${index}`}
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
                        <FormField label="Mobile Account Number" htmlFor={`edit-wallet-num-${index}`} required>
                          <Input
                            id={`edit-wallet-num-${index}`}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { key: 'tradeLicense', label: 'Trade License' },
              { key: 'tin', label: 'TIN Certificate' },
              { key: 'vat', label: 'VAT Registration' },
              { key: 'nid', label: 'Owner NID Photo' }
            ].map((doc) => {
              const state = docStates[doc.key];
              const fileInputRef = React.createRef<HTMLInputElement>();
              return (
                <div key={doc.key} className="p-4 rounded-xl border border-[rgba(60,60,67,0.1)] dark:border-white/5 bg-slate-50/50 dark:bg-black/10 flex flex-col justify-between">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">{doc.label}</h4>
                      <p className="text-xs text-slate-400">PDF or high-res Image format</p>
                    </div>
                    {state?.uploading ? (
                      <span className="text-xs text-[#007AFF] font-bold animate-pulse">Uploading...</span>
                    ) : state?.progress === 100 ? (
                      <span className="text-xs text-[#34C759] font-bold flex items-center gap-0.5"><Check className="w-3.5 h-3.5" /> Ready</span>
                    ) : (
                      <span className="text-xs text-slate-400">Not Uploaded</span>
                    )}
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleDocChange(doc.key, doc.label)}
                    accept="image/*,application/pdf"
                    className="hidden"
                  />

                  {state ? (
                    <div className="p-3 bg-white dark:bg-[#1C1C1E] rounded-lg border flex flex-col gap-2 shadow-xs mb-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700 dark:text-slate-300 truncate max-w-[180px]">{state.fileName}</span>
                        <span className="text-slate-400">{state.fileSize}</span>
                      </div>
                      {state.uploading && (
                        <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-[#007AFF]" style={{ width: `${state.progress}%` }} />
                        </div>
                      )}
                    </div>
                  ) : null}

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
            })}
          </div>
        </FormSection>

        {/* Form Action buttons */}
        <div className="flex justify-end gap-4 pt-4 border-t border-[rgba(60,60,67,0.08)] dark:border-[rgba(255,255,255,0.06)]">
          <Button
            variant="secondary"
            size="md"
            onClick={() => onNavigate(`/wholesalers/${selectedWholesaler.id}`)}
            type="button"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            loading={isSubmitting}
            type="submit"
          >
            Save Changes
          </Button>
        </div>

      </form>

      {isSubmitting && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-[#1C1C1E] p-8 rounded-2xl border border-[rgba(60,60,67,0.08)] shadow-2xl flex flex-col items-center max-w-sm text-center space-y-4 animate-scale-up">
            <Loader2 className="w-12 h-12 text-[#007AFF] animate-spin" />
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Saving Changes</h3>
              <p className="text-xs text-slate-500">Updating profile details and synchronizing data systems. Please do not close or refresh this tab.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}