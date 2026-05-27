import React from 'react';
import { Input } from '@/src/components/ui/Input';
import { useAddProductStore } from '../../store/useAddProductStore';

export function Step2Details() {
  const { material, weight, volume, colors, setField } = useAddProductStore();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Input label="Material" value={material} onChange={(e) => setField('material', e.target.value)} />
      <Input label="Weight" value={weight} onChange={(e) => setField('weight', e.target.value)} />
      <Input label="Volume" value={volume} onChange={(e) => setField('volume', e.target.value)} />
      <Input label="Colors" value={colors} onChange={(e) => setField('colors', e.target.value)} />
    </div>
  );
}
