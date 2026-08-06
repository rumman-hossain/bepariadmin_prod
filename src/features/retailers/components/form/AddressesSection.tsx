import { MapPin, Plus, Trash2 } from 'lucide-react';
import { Button, Input, Select } from '@/src/components/controls';
import { Checkbox } from '@/src/components/controls/Checkbox';
import { FormSection } from '@/src/components/forms/FormSection';
import { FormField } from '@/src/components/forms/FormField';
import { useDefaultableList } from '@/src/hooks/useDefaultableList';
import { DISTRICT_OPTIONS } from '@/src/constants/districts';
import type { RetailerAddress } from '../RetailerForm';

/**
 * Where the shop is, and anywhere else it needs post sent.
 *
 * Same shape as the supplier's AddressesSection, sharing `useDefaultableList`
 * and the district list rather than copying either. `users.retailer_addresses`
 * has the same columns as the wholesaler table — migration 090 mirrored it
 * deliberately — so the fields map one to one.
 *
 * Repeatable because a shop and its owner's home are often different places,
 * and a delivery sent to the wrong one is a delivery that fails.
 */

/**
 * A retailer address is a SHOP address. There is no second kind.
 *
 * The chooser used to offer Warehouse, Return Address and Billing Address —
 * copied across from the supplier form, where a company genuinely has all four.
 * A retailer is a shop: it has the place it trades from, and possibly a second
 * place it also trades from. Every other option was a way to file an address
 * under a label nothing downstream reads, and picking one wrongly is silent.
 *
 * `primary` is the stored value, unchanged — it is what `users.retailer_addresses`
 * defaults to and what the server's validateAddresses assigns when nothing is
 * sent. Renaming the stored value to 'shop' would orphan every row already
 * written. Only the chooser is gone; the data is the same.
 */
const SHOP_ADDRESS_TYPE = 'primary';

export interface AddressesSectionProps {
  addresses: RetailerAddress[];
  onChange: (next: RetailerAddress[]) => void;
}

export function AddressesSection({ addresses: values, onChange }: AddressesSectionProps) {
  const addresses = useDefaultableList(values, onChange, (count) => ({
    addressType: SHOP_ADDRESS_TYPE,
    division: '',
    district: '',
    postalCode: '',
    addressLine: '',
    isDefault: count === 0,
  }));

  return (
    <FormSection icon={MapPin} title="Addresses">
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-rule-subtle pb-2 text-sm font-bold text-ink-2">
          <span>Addresses</span>
          <Button type="button" variant="ghost" size="sm" iconLeft={Plus} onClick={addresses.add}>
            Add Address
          </Button>
        </div>

        {values.length === 0 ? (
          <div className="rounded-xl border border-dashed border-rule bg-sheet-2 p-4 text-center text-xs italic text-ink-3">
            No address yet. Add the shop&apos;s address so deliveries can reach it.
          </div>
        ) : (
          <div className="space-y-4">
            {values.map((addr, index) => (
              <div
                key={addr.id ?? addr._key ?? `addr-${index}`}
                className="relative rounded-xl border border-rule-subtle bg-sheet-2 p-4"
              >
                <div className="absolute right-3 top-3 flex items-center gap-2">
                  <Checkbox
                    label="Default"
                    checked={Boolean(addr.isDefault)}
                    onChange={(e) => addresses.update(index, 'isDefault', e.target.checked)}
                  />
                  <button
                    type="button"
                    aria-label={`Remove address ${index + 1}`}
                    onClick={() => addresses.remove(index)}
                    className="p-1 text-ink-3 hover:text-bad"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/*
                  Two columns, not three. The Address Type chooser used to sit
                  here; with one possible value it was a control that could only
                  be left alone.
                */}
                <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
                  <FormField label="District" htmlFor={`r-addr-district-${index}`} required>
                    <Select
                      id={`r-addr-district-${index}`}
                      placeholder="Select district"
                      options={DISTRICT_OPTIONS.map((d) => ({ label: d, value: d }))}
                      value={addr.district || ''}
                      onChange={(e) => addresses.update(index, 'district', e.target.value)}
                    />
                  </FormField>
                  <FormField label="Postal Code" htmlFor={`r-addr-post-${index}`}>
                    <Input
                      id={`r-addr-post-${index}`}
                      placeholder="e.g. 1230"
                      inputMode="numeric"
                      value={addr.postalCode ?? ''}
                      onChange={(e) => addresses.update(index, 'postalCode', e.target.value)}
                    />
                  </FormField>
                </div>

                <div className="mt-3">
                  <FormField label="Full Address Line" htmlFor={`r-addr-line-${index}`} required>
                    <Input
                      id={`r-addr-line-${index}`}
                      placeholder="e.g. Shop #12, Kacha Bazar Road, Mirpur 10"
                      value={addr.addressLine}
                      onChange={(e) => addresses.update(index, 'addressLine', e.target.value)}
                    />
                  </FormField>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </FormSection>
  );
}
