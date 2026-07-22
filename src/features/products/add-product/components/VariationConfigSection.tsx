import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/src/components/ui/Button';
import { Modal } from '@/src/components/ui/Modal';
import { Input } from '@/src/components/ui/Input';
import { useAddProductStore } from '../store/useAddProductStore';
import type { ProductVariation } from '../../types/registration';

interface Props {
  onGenerate: () => void;
  platformMargin: number;
  isEditMode?: boolean;
  errorMessage?: string;
}

function ChipList({
  label,
  items,
  input,
  onInputChange,
  onAdd,
  onRemove,
}: {
  label: string;
  items: string[];
  input: string;
  onInputChange: (v: string) => void;
  onAdd: () => void;
  onRemove: (idx: number) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-text-primary">{label}</p>
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder={`Add ${label.toLowerCase()}…`}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onAdd();
            }
          }}
        />
        <Button type="button" variant="outline" iconLeft={Plus} onClick={onAdd} className="shrink-0">
          Add
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((item, idx) => (
          <span
            key={`${item}-${idx}`}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-muted text-sm border border-border-default"
          >
            {item}
            <button type="button" onClick={() => onRemove(idx)} aria-label={`Remove ${item}`}>
              <X className="w-3.5 h-3.5 text-text-tertiary" />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}

export function VariationConfigSection({ onGenerate, platformMargin, isEditMode, errorMessage }: Props) {
  const { variationColors, variationDesigns, variations, sku, basePrice, setField } = useAddProductStore();
  const [colorInput, setColorInput] = useState('');
  const [designInput, setDesignInput] = useState('');
  const [managerOpen, setManagerOpen] = useState(false);
  const [alert, setAlert] = useState('');

  const addColor = () => {
    const val = colorInput.trim();
    if (!val) return;
    if (variationColors.includes(val) || variationDesigns.includes(val)) {
      setAlert('Color already used or conflicts with a design');
      return;
    }
    if (variationColors.length >= 5) {
      setAlert('Maximum 5 colors allowed');
      return;
    }
    setField('variationColors', [...variationColors, val]);
    setColorInput('');
    setAlert('');
  };

  const addDesign = () => {
    const val = designInput.trim();
    if (!val) return;
    if (variationDesigns.includes(val) || variationColors.includes(val)) {
      setAlert('Design already used or conflicts with a color');
      return;
    }
    if (variationDesigns.length >= 5) {
      setAlert('Maximum 5 designs allowed');
      return;
    }
    setField('variationDesigns', [...variationDesigns, val]);
    setDesignInput('');
    setAlert('');
  };

  const handleGenerateClick = () => {
    if (!sku?.trim()) {
      setAlert('Complete steps 1–2 and generate SKU first');
      return;
    }
    if (variationColors.length === 0 && variationDesigns.length === 0) {
      setAlert('Add at least one color or design');
      return;
    }
    onGenerate();
    setManagerOpen(true);
    setAlert('');
  };

  const updateVariation = (index: number, updates: Partial<ProductVariation>) => {
    const next = [...variations];
    next[index] = { ...next[index], ...updates };
    setField('variations', next);
  };

  const base = parseFloat(basePrice) || 0;
  const calcRetail = (price?: number) => {
    const b = price ?? base;
    return b > 0 ? (b * (1 + platformMargin / 100)).toFixed(2) : '0';
  };

  return (
    <div className="space-y-4">
      <ChipList
        label="Colors"
        items={variationColors}
        input={colorInput}
        onInputChange={setColorInput}
        onAdd={addColor}
        onRemove={(idx) => setField('variationColors', variationColors.filter((_, i) => i !== idx))}
      />
      <ChipList
        label="Designs"
        items={variationDesigns}
        input={designInput}
        onInputChange={setDesignInput}
        onAdd={addDesign}
        onRemove={(idx) => setField('variationDesigns', variationDesigns.filter((_, i) => i !== idx))}
      />

      {(alert || errorMessage) && (
        <p className="text-sm text-semantic-danger">{alert || errorMessage}</p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={handleGenerateClick}>
          Generate / Sync Variations
        </Button>
        {variations.length > 0 && (
          <Button type="button" variant="outline" onClick={() => setManagerOpen(true)}>
            Manage {variations.length} variation(s)
          </Button>
        )}
      </div>

      <Modal open={managerOpen} onClose={() => setManagerOpen(false)} size="lg">
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <h3 className="text-lg font-semibold">Variation Manager</h3>
          {variations.length === 0 ? (
            <p className="text-sm text-text-secondary">No variations yet. Generate from colors/designs above.</p>
          ) : (
            <div className="space-y-3">
              {variations.map((v, idx) => (
                <div key={v.id ?? idx} className="p-3 rounded-xl border border-border-default space-y-2">
                  <div className="flex justify-between gap-2">
                    <div>
                      <p className="font-semibold text-sm">{v.displayLabel || v.subName}</p>
                      <p className="text-xs text-text-tertiary">{v.subSku}</p>
                    </div>
                    <p className="text-sm font-bold text-emerald-600">৳ {calcRetail(v.price)}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      label="Base Price"
                      type="number"
                      value={v.price != null ? String(v.price) : ''}
                      onChange={(e) => updateVariation(idx, { price: Number(e.target.value) || undefined })}
                    />
                    <Input
                      label="Stock"
                      type="number"
                      value={v.stock != null ? String(v.stock) : ''}
                      onChange={(e) => updateVariation(idx, { stock: Number(e.target.value) || 0 })}
                    />
                    <Input
                      label="MOQ"
                      type="number"
                      value={v.moq != null ? String(v.moq) : ''}
                      onChange={(e) => updateVariation(idx, { moq: Number(e.target.value) || 1 })}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
          <Button variant="outline" onClick={() => setManagerOpen(false)}>
            Done
          </Button>
        </div>
      </Modal>
    </div>
  );
}
