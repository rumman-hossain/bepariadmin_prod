import React, { useMemo } from 'react';
import { Input } from '@/src/components/ui/Input';
import { useAddProductStore } from '../../store/useAddProductStore';
import { DispatchTimeField } from '../DispatchTimeField';
import { ClassificationTemplates } from '../ClassificationTemplates';
import { SizeChipSelector } from '../SizeChipSelector';
import { ToggleBar } from '../ToggleBar';
import { getAvailableSizes, type FootwearScale, type SizeMode } from '../../utils/sizeOptions';
import type { SizeConfig } from '../../../types/registration';

interface Props {
  sizeConfig: SizeConfig | null;
  errors?: Record<string, string>;
}

export function Step2Details({ sizeConfig, errors = {} }: Props) {
  const store = useAddProductStore();
  const { material, weight, volume, colors, selectedSizes, sizeMode, fwScale, setField } = store;

  const isFootwear = sizeConfig?.type === 'FOOTWEAR';

  const availableSizes = useMemo(
    () => getAvailableSizes(sizeConfig, sizeMode as SizeMode, fwScale as FootwearScale),
    [sizeConfig, sizeMode, fwScale],
  );

  const toggleSize = (size: string) => {
    if (selectedSizes.includes(size)) {
      setField(
        'selectedSizes',
        selectedSizes.filter((s) => s !== size),
      );
    } else {
      setField('selectedSizes', [...selectedSizes, size]);
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <ClassificationTemplates />

      <Input
        label="Material / Fabric"
        value={material}
        onChange={(e) => setField('material', e.target.value)}
        className="sm:col-span-2"
      />
      <Input label="Weight (gm)" value={weight} onChange={(e) => setField('weight', e.target.value)} />
      <Input label="Volume (c.ft)" value={volume} onChange={(e) => setField('volume', e.target.value)} />
      <Input
        label="Available Colors"
        value={colors}
        onChange={(e) => setField('colors', e.target.value)}
        placeholder="e.g. Red, Blue (comma separated)"
        className="sm:col-span-2"
      />

      {isFootwear && sizeConfig?.scales && sizeConfig.scales.length > 0 && (
        <div className="sm:col-span-2 space-y-2">
          <p className="text-sm font-medium text-text-primary">Size Scale</p>
          <ToggleBar
            options={sizeConfig.scales as FootwearScale[]}
            selected={fwScale as FootwearScale}
            onSelect={(v) => {
              setField('fwScale', v);
              setField('selectedSizes', []);
            }}
          />
        </div>
      )}

      {!isFootwear && (
        <div className="sm:col-span-2 space-y-2">
          <p className="text-sm font-medium text-text-primary">Size Type</p>
          <ToggleBar
            options={['AUTO', 'LETTER', 'NUMBER', 'UNIQUE'] as SizeMode[]}
            selected={sizeMode as SizeMode}
            onSelect={(v) => {
              setField('sizeMode', v);
              setField('selectedSizes', []);
            }}
          />
        </div>
      )}

      {availableSizes.length > 0 && (
        <SizeChipSelector
          label="Available Sizes"
          options={availableSizes}
          selectedSizes={selectedSizes}
          onSelect={(size) => setField('selectedSizes', [...selectedSizes, size])}
          onDeselect={toggleSize}
          hasError={Boolean(errors.sizes)}
        />
      )}

      <DispatchTimeField hasError={Boolean(errors.dispatchTime)} errorText={errors.dispatchTime} />
    </div>
  );
}
