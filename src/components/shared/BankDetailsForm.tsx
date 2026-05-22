import React from 'react';
import { Input } from '@/src/components/ui/Input';

interface BankDetails {
  bankName: string;
  accountName: string;
  accountNumber: string;
  branch: string;
  routing: string;
}

interface BankDetailsFormProps {
  value: BankDetails;
  bkashNumber: string;
  onChange: (bankDetails: BankDetails) => void;
  onBkashChange: (bkash: string) => void;
  isEditing: boolean;
}

const emptyBank: BankDetails = {
  bankName: '',
  accountName: '',
  accountNumber: '',
  branch: '',
  routing: '',
};

export function BankDetailsForm({
  value = emptyBank,
  bkashNumber = '',
  onChange,
  onBkashChange,
  isEditing,
}: BankDetailsFormProps) {
  const bank = value || emptyBank;

  if (!isEditing) {
    return (
      <div className="space-y-1">
        <p className="text-sm font-semibold text-[#1C1C1E] dark:text-[#FFFFFF]">
          {bank.bankName || <span className="text-[#8E8E93] font-normal italic">Bank Name Not Added</span>}
        </p>
        {bank.accountName && <p className="text-xs text-[#6D6D72] dark:text-[#AEAEB2]">{bank.accountName}</p>}
        {bank.accountNumber && <p className="text-xs text-[#6D6D72] dark:text-[#AEAEB2] font-mono mt-1">{bank.accountNumber}</p>}
        {bank.branch && <p className="text-xs text-[#6D6D72] dark:text-[#AEAEB2] mt-0.5">{bank.branch}</p>}
        {bkashNumber && (
          <div className="mt-2 flex items-center gap-2 text-xs">
            <span className="font-bold text-pink-600">bKash:</span>
            <span className="font-mono text-[#1C1C1E] dark:text-[#AEAEB2]">{bkashNumber}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Input
        size="sm"
        label="Bank Name"
        placeholder="e.g. Dutch-Bangla Bank Ltd"
        value={bank.bankName}
        onChange={(e) => onChange({ ...bank, bankName: e.target.value })}
      />
      <Input
        size="sm"
        label="Account Holder Name"
        placeholder="e.g. Unique Fabrics Ltd"
        value={bank.accountName}
        onChange={(e) => onChange({ ...bank, accountName: e.target.value })}
      />
      <Input
        size="sm"
        label="Account Number"
        placeholder="e.g. 101.120.3456"
        value={bank.accountNumber}
        onChange={(e) => onChange({ ...bank, accountNumber: e.target.value })}
      />
      <div className="grid grid-cols-2 gap-3">
        <Input
          size="sm"
          label="Branch Name"
          placeholder="e.g. Gulshan"
          value={bank.branch}
          onChange={(e) => onChange({ ...bank, branch: e.target.value })}
        />
        <Input
          size="sm"
          label="Routing Number"
          placeholder="e.g. 095123456"
          value={bank.routing}
          onChange={(e) => onChange({ ...bank, routing: e.target.value })}
        />
      </div>
      <Input
        size="sm"
        label="bKash Number (Optional)"
        placeholder="e.g. 01712345678"
        value={bkashNumber}
        onChange={(e) => onBkashChange(e.target.value)}
      />
    </div>
  );
}