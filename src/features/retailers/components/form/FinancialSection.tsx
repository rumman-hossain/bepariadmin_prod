import { Building, Plus, Trash2 } from 'lucide-react';
import { Button, Input, Select } from '@/src/components/controls';
import { Checkbox } from '@/src/components/controls/Checkbox';
import { FormSection } from '@/src/components/forms/FormSection';
import { FormField } from '@/src/components/forms/FormField';
import { useDefaultableList } from '@/src/hooks/useDefaultableList';
import type { RetailerBank, RetailerWallet } from '../RetailerForm';

/**
 * Where a refund goes: bank accounts and mobile wallets, both repeatable.
 *
 * Same shape as the supplier's FinancialSection, and sharing its ACTUAL logic —
 * `useDefaultableList` handles add/remove/update and the exactly-one-default
 * rule for both features. The fields differ per entity, so the markup lives
 * here; the algorithm does not, which is the part that had been written out
 * three times before it was extracted.
 *
 * Both lists are optional. A shop signed up over the phone often has neither to
 * hand, and blocking registration on a bank account nobody asked for would make
 * legitimate shops unregisterable.
 */

const WALLET_TYPES = [
  { value: 'bkash', label: 'bKash' },
  { value: 'nagad', label: 'Nagad' },
  { value: 'rocket', label: 'Rocket' },
  { value: 'upay', label: 'Upay' },
];

export interface FinancialSectionProps {
  banks: RetailerBank[];
  wallets: RetailerWallet[];
  onBanksChange: (next: RetailerBank[]) => void;
  onWalletsChange: (next: RetailerWallet[]) => void;
}

export function FinancialSection({
  banks: bankValues,
  wallets: walletValues,
  onBanksChange,
  onWalletsChange,
}: FinancialSectionProps) {
  // `count === 0` on the first row: a shop with one account has no meaningful
  // choice to make, and leaving it unmarked would mean a refund with no
  // destination. The server enforces the same rule.
  const banks = useDefaultableList(bankValues, onBanksChange, (count) => ({
    bankName: '',
    accountName: '',
    accountNumber: '',
    branch: '',
    routing: '',
    isDefault: count === 0,
  }));
  const wallets = useDefaultableList(walletValues, onWalletsChange, (count) => ({
    walletType: 'bkash',
    accountNumber: '',
    isDefault: count === 0,
  }));

  return (
    <FormSection icon={Building} title="Financial Details (Multiple Bank/Wallets)">
      <div className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-rule-subtle pb-2 text-sm font-bold text-ink-2">
            <span>Bank Accounts</span>
            <Button type="button" variant="ghost" size="sm" iconLeft={Plus} onClick={banks.add}>
              Add Bank
            </Button>
          </div>

          {bankValues.length === 0 ? (
            <div className="rounded-xl border border-dashed border-rule bg-sheet-2 p-4 text-center text-xs italic text-ink-3">
              No bank accounts yet. Optional — add one if the shop has given you the details.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {bankValues.map((bank, index) => (
                <div
                  key={bank.id ?? bank._key ?? `bank-${index}`}
                  className="relative rounded-xl border border-rule-subtle bg-sheet-2 p-4"
                >
                  <div className="absolute right-3 top-3 flex items-center gap-2">
                    <Checkbox
                      label="Default"
                      checked={Boolean(bank.isDefault)}
                      onChange={(e) => banks.update(index, 'isDefault', e.target.checked)}
                    />
                    <button
                      type="button"
                      aria-label={`Remove bank account ${index + 1}`}
                      onClick={() => banks.remove(index)}
                      className="p-1 text-ink-3 hover:text-bad"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="space-y-3 pt-2">
                    <FormField label="Bank Name" htmlFor={`r-bank-name-${index}`} required>
                      <Input
                        id={`r-bank-name-${index}`}
                        placeholder="e.g. Dutch-Bangla Bank"
                        value={bank.bankName}
                        onChange={(e) => banks.update(index, 'bankName', e.target.value)}
                      />
                    </FormField>
                    <FormField label="Account Holder Name" htmlFor={`r-bank-holder-${index}`} required>
                      <Input
                        id={`r-bank-holder-${index}`}
                        placeholder="e.g. Karim Uddin"
                        value={bank.accountName}
                        onChange={(e) => banks.update(index, 'accountName', e.target.value)}
                      />
                    </FormField>
                    <FormField label="Account Number" htmlFor={`r-bank-num-${index}`} required>
                      <Input
                        id={`r-bank-num-${index}`}
                        placeholder="Account Number"
                        value={bank.accountNumber}
                        onChange={(e) => banks.update(index, 'accountNumber', e.target.value)}
                      />
                    </FormField>
                    <div className="grid grid-cols-2 gap-2">
                      <FormField label="Branch" htmlFor={`r-bank-branch-${index}`}>
                        <Input
                          id={`r-bank-branch-${index}`}
                          placeholder="Branch"
                          value={bank.branch ?? ''}
                          onChange={(e) => banks.update(index, 'branch', e.target.value)}
                        />
                      </FormField>
                      <FormField label="Routing" htmlFor={`r-bank-routing-${index}`}>
                        <Input
                          id={`r-bank-routing-${index}`}
                          placeholder="Routing"
                          value={bank.routing ?? ''}
                          onChange={(e) => banks.update(index, 'routing', e.target.value)}
                        />
                      </FormField>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-rule-subtle pb-2 text-sm font-bold text-ink-2">
            <span>Mobile Wallets</span>
            <Button type="button" variant="ghost" size="sm" iconLeft={Plus} onClick={wallets.add}>
              Add Wallet
            </Button>
          </div>

          {walletValues.length === 0 ? (
            <div className="rounded-xl border border-dashed border-rule bg-sheet-2 p-4 text-center text-xs italic text-ink-3">
              No mobile wallets yet. Optional.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {walletValues.map((wallet, index) => (
                <div
                  key={wallet.id ?? wallet._key ?? `wallet-${index}`}
                  className="relative rounded-xl border border-rule-subtle bg-sheet-2 p-4"
                >
                  <div className="absolute right-3 top-3 flex items-center gap-2">
                    <Checkbox
                      label="Default"
                      checked={Boolean(wallet.isDefault)}
                      onChange={(e) => wallets.update(index, 'isDefault', e.target.checked)}
                    />
                    <button
                      type="button"
                      aria-label={`Remove wallet ${index + 1}`}
                      onClick={() => wallets.remove(index)}
                      className="p-1 text-ink-3 hover:text-bad"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="space-y-3 pt-2">
                    <FormField label="Provider" htmlFor={`r-wallet-type-${index}`} required>
                      <Select
                        id={`r-wallet-type-${index}`}
                        value={wallet.walletType}
                        options={WALLET_TYPES}
                        onChange={(e) => wallets.update(index, 'walletType', e.target.value)}
                      />
                    </FormField>
                    <FormField label="Account Number" htmlFor={`r-wallet-num-${index}`} required>
                      <Input
                        id={`r-wallet-num-${index}`}
                        placeholder="e.g. 01712345678"
                        inputMode="tel"
                        value={wallet.accountNumber}
                        onChange={(e) => wallets.update(index, 'accountNumber', e.target.value)}
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
  );
}
