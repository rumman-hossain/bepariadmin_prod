import React from 'react';
import { PageHeader } from '@/src/components/shared/PageHeader';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import { Select } from '@/src/components/ui/Select';
import { Textarea } from '@/src/components/ui/Textarea';
import { FormSection } from '@/src/components/forms/FormSection';
import { FormField } from '@/src/components/forms/FormField';
import { BankDetailsForm } from '@/src/components/shared/BankDetailsForm';
import { FileUploadBox } from '@/src/components/shared/FileUploadBox';
import { useWholesalerForm } from '../hooks/useWholesalerForm';
import { WHOLESALER_CATEGORIES, WHOLESALER_LOCATIONS } from '../constants';
import { User, CreditCard, ShieldAlert, FileText } from 'lucide-react';

export interface CreatePageProps {
  onNavigate: (path: string) => void;
}

export function CreatePage({ onNavigate }: CreatePageProps) {
  const { values, errors, isSubmitting, setField, handleSubmit } = useWholesalerForm({
    onSuccess: () => onNavigate('/wholesalers'),
  });

  // Document upload state
  const [docs, setDocs] = React.useState<Record<string, boolean>>({
    tradeLicense: false,
    tin: false,
    vat: false,
    nid: false,
  });

  const toggleDoc = (key: string) => setDocs((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Onboard New Supplier"
        subtitle="Fill in all required business and owner details"
        onBack={() => onNavigate('/wholesalers')}
      />

      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-8">
        {/* Basic Information */}
        <FormSection icon={User} title="Basic Information">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <FormField label="Company Name" htmlFor="companyName" required error={errors.companyName}>
              <Input id="companyName" placeholder="e.g. Unique Fabrics Ltd" value={values.companyName} onChange={(e) => setField('companyName', e.target.value)} />
            </FormField>
            <FormField label="Owner Name" htmlFor="ownerName" required error={errors.ownerName}>
              <Input id="ownerName" placeholder="e.g. Rafiqul Islam" value={values.ownerName} onChange={(e) => setField('ownerName', e.target.value)} />
            </FormField>
            <FormField label="Mobile Number" htmlFor="mobile" required error={errors.mobile}>
              <Input id="mobile" type="text" placeholder="e.g. 01712345678" value={values.mobile} onChange={(e) => setField('mobile', e.target.value)} />
            </FormField>
            <FormField label="Email Address" htmlFor="email" error={errors.email}>
              <Input id="email" type="email" placeholder="e.g. business@example.com" value={values.email || ''} onChange={(e) => setField('email', e.target.value)} />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Category" htmlFor="category" required error={errors.category}>
                <Select
                  id="category"
                  options={WHOLESALER_CATEGORIES.map((c) => ({ label: c, value: c }))}
                  value={values.category}
                  onChange={(e) => setField('category', e.target.value)}
                />
              </FormField>
              <FormField label="District" htmlFor="location" required error={errors.location}>
                <Select
                  id="location"
                  options={WHOLESALER_LOCATIONS.map((l) => ({ label: l, value: l }))}
                  value={values.location}
                  onChange={(e) => setField('location', e.target.value)}
                />
              </FormField>
            </div>
          </div>
          <FormField label="Full Address" htmlFor="address" error={errors.address}>
            <Textarea id="address" rows={2} placeholder="e.g. House #15, Road #4, Sector #3, Uttara, Dhaka-1230" value={values.address || ''} onChange={(e) => setField('address', e.target.value)} />
          </FormField>
        </FormSection>

        <div className="border-t border-[rgba(60,60,67,0.08)] dark:border-[rgba(255,255,255,0.06)]" />

        {/* Financial Information */}
        <FormSection icon={CreditCard} title="Financial Information">
          <BankDetailsForm
            value={{ bankName: values.bankDetails?.bankName || '', accountName: values.bankDetails?.accountName || '', accountNumber: values.bankDetails?.accountNumber || '', branch: values.bankDetails?.branch || '', routing: values.bankDetails?.routing || '' }}
            bkashNumber={values.bkash || ''}
            onChange={(bd) => setField('bankDetails', { ...values.bankDetails!, bankName: bd.bankName, accountName: bd.accountName, accountNumber: bd.accountNumber, branch: bd.branch, routing: bd.routing })}
            onBkashChange={(v) => setField('bkash', v)}
            isEditing
          />
        </FormSection>

        <div className="border-t border-[rgba(60,60,67,0.08)] dark:border-[rgba(255,255,255,0.06)]" />

        {/* Login Credentials */}
        <FormSection icon={ShieldAlert} title="Login Credentials">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <FormField label="Username" htmlFor="username" error={errors.username}>
              <Input id="username" placeholder="e.g. supplier123" value={values.username || ''} onChange={(e) => setField('username', e.target.value)} />
            </FormField>
            <FormField label="Password" htmlFor="password" error={errors.password}>
              <Input id="password" type="password" placeholder="Enter password" value={values.password || ''} onChange={(e) => setField('password', e.target.value)} />
            </FormField>
          </div>
        </FormSection>

        <div className="border-t border-[rgba(60,60,67,0.08)] dark:border-[rgba(255,255,255,0.06)]" />

        {/* Documents */}
        <FormSection icon={FileText} title="Documents (Optional)">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FileUploadBox label="Trade License" subtitle="Click to Upload" selected={docs.tradeLicense} onClick={() => toggleDoc('tradeLicense')} />
            <FileUploadBox label="TIN Certificate" subtitle="Click to Upload" selected={docs.tin} onClick={() => toggleDoc('tin')} />
            <FileUploadBox label="VAT Registration" subtitle="Click to Upload" selected={docs.vat} onClick={() => toggleDoc('vat')} />
            <FileUploadBox label="Owner NID Photo" subtitle="Front & Back Side" selected={docs.nid} onClick={() => toggleDoc('nid')} />
          </div>
        </FormSection>

        <div className="flex justify-end gap-4 pt-4">
          <Button variant="secondary" size="md" onClick={() => onNavigate('/wholesalers')} type="button">
            Cancel
          </Button>
          <Button variant="primary" size="md" loading={isSubmitting} type="submit">
            Complete Onboarding
          </Button>
        </div>
      </form>
    </div>
  );
}