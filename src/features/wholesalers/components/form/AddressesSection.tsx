import { MapPin, Plus, Trash2 } from 'lucide-react';
import { Button, Input, Select, Textarea } from '@/src/components/controls';
import { Checkbox } from '@/src/components/controls/Checkbox';
import { FormSection } from '@/src/components/forms/FormSection';
import { FormField } from '@/src/components/forms/FormField';
import { useDefaultableList } from '@/src/hooks/useDefaultableList';
import { useWholesalerFormContext, DISTRICT_OPTIONS } from './useWholesalerFormContext';

/**
 * Warehouse and billing addresses.
 * 
 * Exactly one is the default; removing it promotes the next. That rule lives in
 * useDefaultableList, which also fixed the in-place mutation the three
 * hand-written copies shared.
 */
export function AddressesSection() {
  const { values , setField} = useWholesalerFormContext();
  const addresses = useDefaultableList(values.addresses, (next) => setField('addresses', next), (count) => ({
    addressType: 'primary' as const, division: '', district: '', postalCode: '', addressLine: '', isDefault: count === 0,
  }));

  return (
    <FormSection icon={MapPin} title="Addresses (Multi-Address)">
      <div className="space-y-6">
        {(values.addresses || []).map((addr, index) => (
          <div
            key={addr.id ?? addr._key ?? `idx-${index}`}
            className="p-5 rounded-2xl bg-sheet-2 border border-rule-subtle relative group animate-slide-up"
          >
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <Checkbox
                label="Default address"
                checked={addr.isDefault}
                onChange={(e) => addresses.update(index, 'isDefault', e.target.checked)}
              />
              {values.addresses.length > 1 && (
                <button 
                  type="button" 
                  onClick={() => addresses.remove(index)}
                  className="p-1.5 rounded-lg text-ink-3 hover:bg-bad-wash hover:text-bad transition-colors"
                  title="Delete address"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="text-sm font-bold text-ink mb-4 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-brass-wash text-brass flex items-center justify-center text-xs">
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
                  onChange={(e) => addresses.update(index, 'addressType', e.target.value)}
                />
              </FormField>
              <FormField label="District" htmlFor={`addr-district-${index}`} required>
                <Select
                  id={`addr-district-${index}`}
                  placeholder="Select district"
                  options={DISTRICT_OPTIONS.map(d => ({ label: d, value: d }))}
                  value={addr.district || ''}
                  onChange={(e) => addresses.update(index, 'district', e.target.value)}
                />
              </FormField>
              <FormField label="Postal Code" htmlFor={`addr-post-${index}`} required>
                <Input
                  id={`addr-post-${index}`}
                  placeholder="e.g. 1230"
                  value={addr.postalCode}
                  onChange={(e) => addresses.update(index, 'postalCode', e.target.value)}
                />
              </FormField>
            </div>
            <FormField label="Full Address Line" htmlFor={`addr-line-${index}`} required>
              <Textarea
                id={`addr-line-${index}`}
                rows={2}
                placeholder="e.g. House #15, Road #4, Sector #3, Uttara"
                value={addr.addressLine}
                onChange={(e) => addresses.update(index, 'addressLine', e.target.value)}
              />
            </FormField>
          </div>
        ))}

        <Button 
          type="button" 
          variant="outline" 
          size="sm" 
          iconLeft={Plus}
          onClick={addresses.add}
          className="w-full md:w-auto"
        >
          Add Another Address
        </Button>
      </div>
    </FormSection>
  );
}
