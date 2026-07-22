import React from 'react';
import { Input } from '@/src/components/ui/Input';
import { useAddProductStore } from '../../store/useAddProductStore';

export function Step5Policies({ errors = {} }: { errors?: Record<string, string> }) {
  const store = useAddProductStore();
  const { setField } = store;

  const ToggleSection = ({
    title,
    enabled,
    onToggle,
    children,
  }: {
    title: string;
    enabled: boolean;
    onToggle: (v: boolean) => void;
    children: React.ReactNode;
  }) => (
    <div className="p-4 rounded-xl border border-border-default space-y-3">
      <label className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-text-primary">{title}</span>
        <input type="checkbox" checked={enabled} onChange={(e) => onToggle(e.target.checked)} />
      </label>
      {enabled && children}
    </div>
  );

  return (
    <div className="space-y-4">
      <ToggleSection
        title="Warranty"
        enabled={store.warrantyEnabled}
        onToggle={(v) => setField('warrantyEnabled', v)}
      >
        <Input label="Duration" value={store.warrantyDuration} onChange={(e) => setField('warrantyDuration', e.target.value)} error={errors.warrantyDuration} />
        <Input label="Description" value={store.warrantyDescription} onChange={(e) => setField('warrantyDescription', e.target.value)} error={errors.warrantyDescription} />
      </ToggleSection>
      <ToggleSection
        title="Return Policy"
        enabled={store.returnPolicyEnabled}
        onToggle={(v) => setField('returnPolicyEnabled', v)}
      >
        <Input label="Return Window" value={store.returnWindow} onChange={(e) => setField('returnWindow', e.target.value)} error={errors.returnWindow} />
        <Input label="Condition" value={store.returnCondition} onChange={(e) => setField('returnCondition', e.target.value)} error={errors.returnCondition} />
      </ToggleSection>
      <ToggleSection
        title="Exchange Policy"
        enabled={store.exchangeEnabled}
        onToggle={(v) => setField('exchangeEnabled', v)}
      >
        <Input label="Exchange Window" value={store.exchangeWindow} onChange={(e) => setField('exchangeWindow', e.target.value)} error={errors.exchangeWindow} />
        <Input label="Description" value={store.exchangeDescription} onChange={(e) => setField('exchangeDescription', e.target.value)} error={errors.exchangeDescription} />
      </ToggleSection>
      <p className="text-xs text-text-tertiary">Policies are shown for parity; backend submission does not include them yet.</p>
    </div>
  );
}
