import { useRef } from 'react';
import { ImagePlus, Loader2 } from 'lucide-react';
import { useAddProductStore } from '../../store/useAddProductStore';
import { resolveHasVariant } from '../../utils/resolveHasVariant';
import { useUpload } from '@/src/services/upload/useUpload';
import type { MediaSlot } from '../../../types/registration';
import { Text } from '@/src/components/data';

interface SlotProps {
  label: string;
  slot: MediaSlot;
  purpose: string;
  position: number;
  accept: string;
  mediaType: 'image' | 'video';
}

function MediaSlotInput({ label, slot, purpose, position, accept, mediaType }: SlotProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { setProductMediaSlot, draftId, setField } = useAddProductStore();
  const { uploadSlot } = useUpload();

  const handleFile = async (file: File) => {
    const key = purpose.replace('product:', '') as 'poster' | 'front' | 'back' | 'left' | 'right';
    await uploadSlot({
      file,
      purpose,
      position,
      mediaType,
      draftId,
      onDraftId: (id) => setField('draftId', id),
      onSlotUpdate: (partial) => setProductMediaSlot(key, partial),
    });
  };

  return (
    <div className="space-y-2">
      <Text as="p" variant="label">{label}</Text>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="relative w-full aspect-square rounded-xl border-2 border-dashed border-rule flex flex-col items-center justify-center gap-2 hover:bg-sheet-2 overflow-hidden"
      >
        {slot.localUri ? (
          mediaType === 'video' ? (
            <video src={slot.localUri} className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <img src={slot.localUri} alt={label} className="absolute inset-0 w-full h-full object-cover" />
          )
        ) : (
          <>
            <ImagePlus className="w-8 h-8 text-ink-3" />
            <Text variant="caption">Upload</Text>
          </>
        )}
        {slot.uploadStatus === 'uploading' && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          </div>
        )}
      </button>
      {slot.uploadError && <p className="text-xs text-bad">{slot.uploadError}</p>}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}

export function Step4Media() {
  const { productMedia, hasVariant: hasVariantRaw, variations } = useAddProductStore();
  const hasVariant = resolveHasVariant(hasVariantRaw, variations);

  if (hasVariant) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <MediaSlotInput
          label="Poster"
          slot={productMedia.poster}
          purpose="product:poster"
          position={0}
          accept="image/*"
          mediaType="image"
        />
        <Text as="p" variant="secondary" className="sm:col-span-2">
          Variant products use poster here; per-variation images are managed in the variation manager on Step 3.
        </Text>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      <MediaSlotInput label="Poster" slot={productMedia.poster} purpose="product:poster" position={0} accept="image/*" mediaType="image" />
      <MediaSlotInput label="Front" slot={productMedia.front} purpose="product:front" position={1} accept="image/*" mediaType="image" />
      <MediaSlotInput label="Back" slot={productMedia.back} purpose="product:back" position={2} accept="image/*" mediaType="image" />
      <MediaSlotInput label="Left" slot={productMedia.left} purpose="product:left" position={3} accept="image/*" mediaType="image" />
      <MediaSlotInput label="Right" slot={productMedia.right} purpose="product:right" position={4} accept="image/*" mediaType="image" />
      <MediaSlotInput label="Video" slot={productMedia.video} purpose="product:video" position={0} accept="video/*" mediaType="video" />
    </div>
  );
}
