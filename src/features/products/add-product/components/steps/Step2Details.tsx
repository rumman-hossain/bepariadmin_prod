import { useMemo, useState } from 'react';
import { Input } from '@/src/components/controls';
import { useAddProductStore, countOrphanedSizes } from '../../store/useAddProductStore';
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
  const {
    material,
    weight,
    volume,
    colors,
    selectedSizes,
    sizeMode,
    fwScale,
    setField,
    setSelectedSizes,
  } = store;

  /** What the last vocabulary change threw away, so it is not thrown away silently. */
  const [discarded, setDiscarded] = useState(0);

  const isFootwear = sizeConfig?.type === 'FOOTWEAR';

  const availableSizes = useMemo(
    () => getAvailableSizes(sizeConfig, sizeMode as SizeMode, fwScale as FootwearScale),
    [sizeConfig, sizeMode, fwScale],
  );

  /*
   * Changing the scale or the size type empties the selection — UK 6 and US 8
   * are not the same string, so nothing carries over.
   *
   * `setSelectedSizes` is what makes that safe. Assigning `selectedSizes`
   * directly leaves `sizeStockSet`, `moqSet` and `sizeLowStockAlertSet` keyed
   * by the OLD sizes, and they are submitted along with the new ones — so a
   * shoe ends up with stock recorded against both UK and US numbers, where
   * "8" means two different sizes. That is the bug this replaces, and it is
   * still live in the mobile app.
   */
  const changeVocabulary = (apply: () => void) => {
    setDiscarded(countOrphanedSizes(store, []));
    apply();
    setSelectedSizes([]);
  };

  const toggleSize = (size: string) => {
    setSelectedSizes(
      selectedSizes.includes(size)
        ? selectedSizes.filter((s) => s !== size)
        : [...selectedSizes, size],
    );
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
          <p className="text-sm font-medium text-ink">Size Scale</p>
          <ToggleBar
            options={sizeConfig.scales as FootwearScale[]}
            selected={fwScale as FootwearScale}
            onSelect={(v) => changeVocabulary(() => setField('fwScale', v))}
          />
        </div>
      )}

      {!isFootwear && (
        <div className="sm:col-span-2 space-y-2">
          <p className="text-sm font-medium text-ink">Size Type</p>
          <ToggleBar
            options={['AUTO', 'LETTER', 'NUMBER', 'UNIQUE'] as SizeMode[]}
            selected={sizeMode as SizeMode}
            onSelect={(v) => changeVocabulary(() => setField('sizeMode', v))}
          />
        </div>
      )}

      {discarded > 0 && (
        <div
          role="status"
          className="sm:col-span-2 flex gap-2 rounded-md border border-warn-border bg-warn-wash px-3 py-2 text-xs text-warn"
        >
          <span aria-hidden="true">⚠</span>
          <span>
            <b className="font-semibold">
              Stock, MOQ and alert levels for {discarded} size{discarded === 1 ? '' : 's'} were
              cleared.
            </b>{' '}
            The old sizes do not exist in this scale, and carrying the numbers over would record
            them against the wrong size. Re-enter them below.
          </span>
        </div>
      )}

      {availableSizes.length > 0 && (
        <SizeChipSelector
          label="Available Sizes"
          options={availableSizes}
          selectedSizes={selectedSizes}
          onSelect={toggleSize}
          onDeselect={toggleSize}
          hasError={Boolean(errors.sizes)}
        />
      )}

      <DispatchTimeField hasError={Boolean(errors.dispatchTime)} errorText={errors.dispatchTime} />
    </div>
  );
}
