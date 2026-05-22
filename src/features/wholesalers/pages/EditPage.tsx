import React from 'react';
import { PageHeader } from '@/src/components/shared/PageHeader';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import { Select } from '@/src/components/ui/Select';
import { Textarea } from '@/src/components/ui/Textarea';
import { FormSection } from '@/src/components/forms/FormSection';
import { FormField } from '@/src/components/forms/FormField';
import { BankDetailsForm } from '@/src/components/shared/BankDetailsForm';
import { useWholesalerForm } from '../hooks/useWholesalerForm';
import { useWholesalerDetail } from '../hooks/useWholesalerDetail';
import { WHOLESALER_CATEGORIES, WHOLESALER_LOCATIONS } from '../constants';
import { User, CreditCard } from 'lucide-react';

export interface EditPageProps {
  onNavigate: (path: string) => void;
}

export function EditPage({ onNavigate }: EditPageProps) {
  const { selectedWholesaler, goBack } = useWholesalerDetail();

  const { values, errors, isSubmitting, setField, handleSubmit } = useWholesalerForm({
    initialData: selectedWholesaler ? {
      id: selectedWholesaler.id,
      companyName: selectedWholesaler.companyName,
      category: selectedWholesaler.category,
      location: selectedWholesaler.location,
      status: selectedWholesaler.status,
      acceptanceRate: selectedWholesaler.acceptanceRate,
      dispatchSpeed: selectedWholesaler.dispatchSpeed,
      riskScore: selectedWholesaler.riskScore,
      createdAt: selectedWholesaler.createdAt,
      ownerName: selectedWholesaler.ownerName || '',
      mobile: selectedWholesaler.mobile || '',
      email: selectedWholesaler.email || '',
      address: selectedWholesaler.address || '',
      bkash: selectedWholesaler.bkash || '',
      commissionRate: selectedWholesaler.commissionRate,
      bankDetails: selectedWholesaler.bankDetails ? {
        bankName: selectedWholesaler.bankDetails.bankName,
        accountName: selectedWholesaler.bankDetails.accountName,
        accountNumber: selectedWholesaler.bankDetails.accountNumber,
        branch: selectedWholesaler.bankDetails.branch,
        routing: selectedWholesaler.bankDetails.routing,
      } : undefined,
      documents: selectedWholesaler.documents,
    } : undefined,
    onSuccess: () => onNavigate('/wholesalers'),
  });

  if (!selectedWholesaler) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        Wholesaler not found. <Button variant="ghost" onClick={goBack}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={`Edit ${selectedWholesaler.companyName}`}
        subtitle="Update business and owner information"
        onBack={() => onNavigate(`/wholesalers/${selectedWholesaler.id}`)}
      />

      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-8">
        <FormSection icon={User} title="Basic Information">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <FormField label="Company Name" htmlFor="edit-company" required error={errors.companyName}>
              <Input id="edit-company" placeholder="Company Name" value={values.companyName} onChange={(e) => setField('companyName', e.target.value)} />
            </FormField>
            <FormField label="Owner Name" htmlFor="edit-owner" required error={errors.ownerName}>
              <Input id="edit-owner" placeholder="Owner Name" value={values.ownerName} onChange={(e) => setField('ownerName', e.target.value)} />
            </FormField>
            <FormField label="Mobile Number" htmlFor="edit-mobile" required error={errors.mobile}>
              <Input id="edit-mobile" type="text" placeholder="Mobile" value={values.mobile} onChange={(e) => setField('mobile', e.target.value)} />
            </FormField>
            <FormField label="Email" htmlFor="edit-email" error={errors.email}>
              <Input id="edit-email" type="email" placeholder="Email" value={values.email || ''} onChange={(e) => setField('email', e.target.value)} />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Category" htmlFor="edit-category" required error={errors.category}>
                <Select id="edit-category" options={WHOLESALER_CATEGORIES.map((c) => ({ label: c, value: c }))} value={values.category} onChange={(e) => setField('category', e.target.value)} />
              </FormField>
              <FormField label="District" htmlFor="edit-location" required error={errors.location}>
                <Select id="edit-location" options={WHOLESALER_LOCATIONS.map((l) => ({ label: l, value: l }))} value={values.location} onChange={(e) => setField('location', e.target.value)} />
              </FormField>
            </div>
          </div>
          <FormField label="Full Address" htmlFor="edit-address" error={errors.address}>
            <Textarea id="edit-address" rows={2} placeholder="Address" value={values.address || ''} onChange={(e) => setField('address', e.target.value)} />
          </FormField>
        </FormSection>

        <div className="border-t border-[rgba(60,60,67,0.08)] dark:border-[rgba(255,255,255,0.06)]" />

        <FormSection icon={CreditCard} title="Financial Information">
          <BankDetailsForm
            value={{ bankName: values.bankDetails?.bankName || '', accountName: values.bankDetails?.accountName || '', accountNumber: values.bankDetails?.accountNumber || '', branch: values.bankDetails?.branch || '', routing: values.bankDetails?.routing || '' }}
            bkashNumber={values.bkash || ''}
            onChange={(bd) => setField('bankDetails', { ...values.bankDetails!, bankName: bd.bankName, accountName: bd.accountName, accountNumber: bd.accountNumber, branch: bd.branch, routing: bd.routing })}
            onBkashChange={(v) => setField('bkash', v)}
            isEditing
          />
        </FormSection>

        <div className="flex justify-end gap-4 pt-4">
          <Button variant="secondary" size="md" onClick={() => onNavigate(`/wholesalers/${selectedWholesaler.id}`)} type="button">Cancel</Button>
          <Button variant="primary" size="md" loading={isSubmitting} type="submit">Save Changes</Button>
        </div>
      </form>
    </div>
  );
}