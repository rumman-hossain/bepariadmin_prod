import React from 'react';
import { Input } from '@/src/components/ui/Input';
import { Select } from '@/src/components/ui/Select';

interface BankDetails {
  bankName: string;
  accountName: string;
  accountNumber: string;
  branch: string;
  routing: string;
}

interface DigitalWallet {
  walletType: 'bkash' | 'nagad' | 'rocket' | 'upay';
  accountNumber: string;
}

interface BankDetailsFormProps {
  value: BankDetails;
  digitalWallet: DigitalWallet;
  onChange: (bankDetails: BankDetails) => void;
  onWalletChange: (wallet: DigitalWallet) => void;
  isEditing: boolean;
}

const emptyBank: BankDetails = {
  bankName: '',
  accountName: '',
  accountNumber: '',
  branch: '',
  routing: '',
};

const emptyWallet: DigitalWallet = {
  walletType: 'bkash',
  accountNumber: '',
};

export function BankDetailsForm({
  value = emptyBank,
  digitalWallet = emptyWallet,
  onChange,
  onWalletChange,
  isEditing,
}: BankDetailsFormProps) {
  const bank = value || emptyBank;
  const wallet = digitalWallet || emptyWallet;

  const getWalletLabel = (type: string) => {
    switch (type) {
      case 'bkash': return 'bKash';
      case 'nagad': return 'Nagad';
      case 'rocket': return 'Rocket';
      case 'upay': return 'Upay';
      default: return 'Digital Wallet';
    }
  };

  const getWalletColor = (type: string) => {
    switch (type) {
      case 'bkash': return 'text-pink-600 dark:text-pink-400 font-bold';
      case 'nagad': return 'text-orange-600 dark:text-orange-400 font-bold';
      case 'rocket': return 'text-purple-600 dark:text-purple-400 font-bold';
      case 'upay': return 'text-blue-600 dark:text-blue-400 font-bold';
      default: return 'text-slate-600 dark:text-slate-400 font-bold';
    }
  };

  if (!isEditing) {
    return (
      <div className="space-y-1">
        <p className="text-sm font-semibold text-[#1C1C1E] dark:text-[#FFFFFF]">
          {bank.bankName || <span className="text-[#8E8E93] font-normal italic">Bank Name Not Added</span>}
        </p>
        {bank.accountName && <p className="text-xs text-[#6D6D72] dark:text-[#AEAEB2]">{bank.accountName}</p>}
        {bank.accountNumber && <p className="text-xs text-[#6D6D72] dark:text-[#AEAEB2] font-mono mt-1">{bank.accountNumber}</p>}
        {bank.branch && <p className="text-xs text-[#6D6D72] dark:text-[#AEAEB2] mt-0.5">{bank.branch}</p>}
        {wallet.accountNumber && (
          <div className="mt-2 flex items-center gap-2 text-xs">
            <span className={getWalletColor(wallet.walletType)}>{getWalletLabel(wallet.walletType)}:</span>
            <span className="font-mono text-[#1C1C1E] dark:text-[#AEAEB2]">{wallet.accountNumber}</span>
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
      
      <div className="grid grid-cols-3 gap-3 items-end">
        <div className="col-span-1">
          <Select
            size="sm"
            label="Wallet Type"
            options={[
              { label: 'bKash', value: 'bkash' },
              { label: 'Nagad', value: 'nagad' },
              { label: 'Rocket', value: 'rocket' },
              { label: 'Upay', value: 'upay' },
            ]}
            value={wallet.walletType}
            onChange={(e) => onWalletChange({ ...wallet, walletType: e.target.value as 'bkash' | 'nagad' | 'rocket' | 'upay' })}
          />
        </div>
        <div className="col-span-2">
          <Input
            size="sm"
            label="Wallet Number (Optional)"
            placeholder="e.g. 01712345678"
            value={wallet.accountNumber}
            onChange={(e) => onWalletChange({ ...wallet, accountNumber: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}