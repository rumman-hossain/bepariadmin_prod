import { Building, Plus, Trash2 } from 'lucide-react';
import { Button, Input, Select } from '@/src/components/controls';
import { Checkbox } from '@/src/components/controls/Checkbox';
import { FormSection } from '@/src/components/forms/FormSection';
import { FormField } from '@/src/components/forms/FormField';
import { useDefaultableList } from '@/src/hooks/useDefaultableList';
import { useWholesalerFormContext } from './useWholesalerFormContext';

/**
 * Bank accounts, mobile wallets and the commission rate.
 */
export function FinancialSection() {
  const { values , setField} = useWholesalerFormContext();
  const banks = useDefaultableList(values.bankDetailsList, (next) => setField('bankDetailsList', next), (count) => ({
    bankName: '', accountName: '', accountNumber: '', branch: '', routing: '', isDefault: count === 0,
  }));
  const wallets = useDefaultableList(values.digitalWallets, (next) => setField('digitalWallets', next), (count) => ({
    walletType: 'bkash' as const, accountNumber: '', isDefault: count === 0,
  }));

  return (
    <FormSection icon={Building} title="Financial Details (Multiple Bank/Wallets)">
      <div className="space-y-6">
    
        {/* Banks Section */}
        <div className="space-y-4">
          <div className="text-sm font-bold text-ink-2 flex items-center justify-between border-b pb-2">
            <span>Bank Accounts</span>
            <Button 
              type="button" 
              variant="ghost" 
              size="sm" 
              iconLeft={Plus} 
              onClick={banks.add}
              className="text-brass hover:bg-brass-wash"
            >
              Add Bank
            </Button>
          </div>

          {(values.bankDetailsList || []).length === 0 ? (
            <div className="text-xs text-ink-3 italic p-4 bg-sheet-2 rounded-xl border border-dashed text-center">
              No bank accounts added yet. Click 'Add Bank' to configure.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(values.bankDetailsList || []).map((bank, index) => (
                <div
                  key={bank.id ?? bank._key ?? `idx-${index}`}
                  className="p-4 rounded-xl border border-rule-subtle bg-sheet-2 relative"
                >
                  <div className="absolute top-3 right-3 flex items-center gap-2">
                    <Checkbox
                      label="Default"
                      checked={bank.isDefault}
                      onChange={(e) => banks.update(index, 'isDefault', e.target.checked)}
                    />
                    <button
                      type="button"
                      onClick={() => banks.remove(index)}
                      className="p-1 text-ink-3 hover:text-bad"
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
                        onChange={(e) => banks.update(index, 'bankName', e.target.value)} 
                      />
                    </FormField>
                    <FormField label="Account Holder Name" htmlFor={`bank-acc-name-${index}`} required>
                      <Input 
                        id={`bank-acc-name-${index}`} 
                        placeholder="e.g. Elegant Fabrics Ltd" 
                        value={bank.accountName} 
                        onChange={(e) => banks.update(index, 'accountName', e.target.value)} 
                      />
                    </FormField>
                    <FormField label="Account Number" htmlFor={`bank-acc-num-${index}`} required>
                      <Input 
                        id={`bank-acc-num-${index}`} 
                        placeholder="Account Number" 
                        value={bank.accountNumber} 
                        onChange={(e) => banks.update(index, 'accountNumber', e.target.value)} 
                      />
                    </FormField>
                    <div className="grid grid-cols-2 gap-2">
                      <FormField label="Branch Name" htmlFor={`bank-branch-${index}`}>
                        <Input 
                          id={`bank-branch-${index}`} 
                          placeholder="Branch" 
                          value={bank.branch || ''} 
                          onChange={(e) => banks.update(index, 'branch', e.target.value)} 
                        />
                      </FormField>
                      <FormField label="Routing Number" htmlFor={`bank-routing-${index}`}>
                        <Input 
                          id={`bank-routing-${index}`} 
                          placeholder="Routing" 
                          value={bank.routing || ''} 
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

        {/* Mobile Wallets Section */}
        <div className="space-y-4 pt-4">
          <div className="text-sm font-bold text-ink-2 flex items-center justify-between border-b pb-2">
            <span>Mobile Wallets</span>
            <Button 
              type="button" 
              variant="ghost" 
              size="sm" 
              iconLeft={Plus} 
              onClick={wallets.add}
              className="text-brass hover:bg-brass-wash"
            >
              Add Wallet
            </Button>
          </div>

          {(values.digitalWallets || []).length === 0 ? (
            <div className="text-xs text-ink-3 italic p-4 bg-sheet-2 rounded-xl border border-dashed text-center">
              No mobile money wallets added. Click 'Add Wallet' to configure.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(values.digitalWallets || []).map((wallet, index) => (
                <div
                  key={wallet.id ?? wallet._key ?? `idx-${index}`}
                  className="p-4 rounded-xl border border-rule-subtle bg-sheet-2 relative"
                >
                  <div className="absolute top-3 right-3 flex items-center gap-2">
                    <Checkbox
                      label="Default"
                      checked={wallet.isDefault}
                      onChange={(e) => wallets.update(index, 'isDefault', e.target.checked)}
                    />
                    <button
                      type="button"
                      onClick={() => wallets.remove(index)}
                      className="p-1 text-ink-3 hover:text-bad"
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
                        onChange={(e) => wallets.update(index, 'walletType', e.target.value)}
                      />
                    </FormField>
                    <FormField label="Mobile Account Number" htmlFor={`wallet-num-${index}`} required>
                      <Input 
                        id={`wallet-num-${index}`} 
                        placeholder="e.g. 018XXXXXXXX" 
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
