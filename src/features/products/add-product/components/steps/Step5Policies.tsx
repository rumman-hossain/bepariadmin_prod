import React from 'react';
import { Input } from '@/src/components/controls';
import { Switch } from '@/src/components/controls/Switch';
import { useAddProductStore } from '../../store/useAddProductStore';

/**
 * Hoisted to module scope — this was defined inside Step5Policies' render body.
 *
 * A component declared during render is a NEW component type on every render,
 * so React unmounts and remounts its whole subtree rather than updating it.
 * Because the wizard re-renders on every keystroke, that meant every character
 * typed into Warranty Duration, Return Window or Exchange Window destroyed and
 * recreated the `<Input>` inside — dropping focus and the caret after a single
 * letter. It was a user-visible bug, not just wasted work.
 */
function ToggleSection({
  title,
  description,
  enabled,
  onToggle,
  children,
}: {
  title: string;
  description?: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-rule bg-sheet">
      <div className="flex items-start justify-between gap-4 px-4 py-3">
        <div className="min-w-0">
          <p className="text-base font-medium text-ink">{title}</p>
          {description && <p className="mt-0.5 text-sm text-ink-3">{description}</p>}
        </div>
        <Switch checked={enabled} onChange={(e) => onToggle(e.target.checked)} aria-label={title} />
      </div>
      {enabled && (
        <div className="flex flex-col gap-3 border-t border-rule-subtle px-4 py-3">{children}</div>
      )}
    </div>
  );
}

export function Step5Policies({ errors = {} }: { errors?: Record<string, string> }) {
  const store = useAddProductStore();
  const { setField } = store;

  return (
    <div className="flex flex-col gap-3">
      <ToggleSection
        title="Warranty"
        description="Offer a warranty on this product."
        enabled={store.warrantyEnabled}
        onToggle={(v) => setField('warrantyEnabled', v)}
      >
        <Input
          label="Duration"
          placeholder="e.g. 12 months"
          value={store.warrantyDuration}
          onChange={(e) => setField('warrantyDuration', e.target.value)}
          error={errors.warrantyDuration}
        />
        <Input
          label="What it covers"
          value={store.warrantyDescription}
          onChange={(e) => setField('warrantyDescription', e.target.value)}
          error={errors.warrantyDescription}
        />
      </ToggleSection>

      <ToggleSection
        title="Returns"
        description="Let retailers return this product."
        enabled={store.returnPolicyEnabled}
        onToggle={(v) => setField('returnPolicyEnabled', v)}
      >
        <Input
          label="Return window"
          placeholder="e.g. 7 days"
          value={store.returnWindow}
          onChange={(e) => setField('returnWindow', e.target.value)}
          error={errors.returnWindow}
        />
        <Input
          label="Condition required"
          value={store.returnCondition}
          onChange={(e) => setField('returnCondition', e.target.value)}
          error={errors.returnCondition}
        />
      </ToggleSection>

      <ToggleSection
        title="Exchanges"
        description="Let retailers exchange this product."
        enabled={store.exchangeEnabled}
        onToggle={(v) => setField('exchangeEnabled', v)}
      >
        <Input
          label="Exchange window"
          placeholder="e.g. 14 days"
          value={store.exchangeWindow}
          onChange={(e) => setField('exchangeWindow', e.target.value)}
          error={errors.exchangeWindow}
        />
        <Input
          label="Terms"
          value={store.exchangeDescription}
          onChange={(e) => setField('exchangeDescription', e.target.value)}
          error={errors.exchangeDescription}
        />
      </ToggleSection>
    </div>
  );
}
