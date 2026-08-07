import { useRef } from 'react';
import { ImagePlus, Loader2 } from 'lucide-react';
import {
  useAddProductStore,
  emptySlot,
  emptyVariationMedia,
} from '../../store/useAddProductStore';
import { resolveHasVariant } from '../../utils/resolveHasVariant';
import { acceptAttribute, useUpload } from '@/src/services/upload/useUpload';
import type {
  MediaSlot,
  ProductVariation,
  VariationMediaState,
} from '../../../types/registration';
import { Text } from '@/src/components/data';
import { mediaDisplayUrl } from '@/src/utils/mediaUrl';

interface SlotProps {
  label: string;
  slot: MediaSlot;
  purpose: string;
  position: number;
  mediaType: 'image' | 'video';
  /** Where this slot's progress and result go. */
  onUpdate: (partial: Partial<MediaSlot>) => void;
  /** Offered only when the slot can be emptied — a gallery entry, not a fixed slot. */
  onClear?: () => void;
}

/**
 * One upload slot.
 *
 * `onUpdate` is a PROP rather than derived from `purpose`. It used to call
 * `setProductMediaSlot(purpose.replace('product:',''))`, which welded the
 * component to product-level media and is why per-variation media had no UI at
 * all: there was no way to point a slot at a variation. `uploadSlot` already
 * takes an `onSlotUpdate` callback, so the seam was there — this just stops
 * closing over the wrong half of it.
 */
function MediaSlotInput({
  label,
  slot,
  purpose,
  position,
  mediaType,
  onUpdate,
  onClear,
}: SlotProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { draftId, setField } = useAddProductStore();
  const { uploadSlot } = useUpload();

  const handleFile = async (file: File) => {
    await uploadSlot({
      file,
      purpose,
      position,
      mediaType,
      draftId,
      onDraftId: (id) => setField('draftId', id),
      onSlotUpdate: onUpdate,
    });
  };

  const previewUrl = mediaDisplayUrl(slot.localUri);

  return (
    <div className="space-y-2">
      <Text as="p" variant="label">{label}</Text>
      {/* aria-label: the visible caption is a sibling <Text>, so without it
          every empty slot announces itself as "Upload" and a screen-reader user
          picking the back image of the third variant has nothing to steer by. */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        aria-label={label}
        className="relative w-full aspect-square rounded-xl border-2 border-dashed border-rule flex flex-col items-center justify-center gap-2 hover:bg-sheet-2 overflow-hidden"
      >
        {/*
          `localUri` is a blob: URL for something just picked, but on an EDIT it
          is whatever the product had stored — a `gs://` reference, which is not
          loadable and which the CSP blocks. `mediaDisplayUrl` passes blob: and
          data: through untouched and rewrites gs:// to the public bucket, so
          both cases render from one branch.
        */}
        {previewUrl ? (
          mediaType === 'video' ? (
            <video src={previewUrl} className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <img src={previewUrl} alt={label} className="absolute inset-0 w-full h-full object-cover" />
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
      {onClear && previewUrl && (
        <button
          type="button"
          onClick={onClear}
          className="w-full text-2xs font-medium text-bad underline hover:no-underline"
        >
          Remove
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        /*
          Derived from the same constant that VALIDATES, not hardcoded.

          These slots asked for `image/*`, which is far wider than
          ALLOWED_IMAGE_TYPES — it offers HEIC, GIF, TIFF, BMP and SVG. So the
          picker let an operator choose the HEIC their iPhone had just taken,
          and `rejectionReason` refused it the instant the dialog closed, by a
          rule they had no way to see. acceptAttribute exists for exactly this
          and the product slots were not using it.
        */
        accept={acceptAttribute(mediaType)}
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

/** The five named product slots, in the order the storefront reads them. */
const PRODUCT_SLOTS = [
  { key: 'poster', label: 'Poster', position: 0 },
  { key: 'front', label: 'Front', position: 1 },
  { key: 'back', label: 'Back', position: 2 },
  { key: 'left', label: 'Left', position: 3 },
  { key: 'right', label: 'Right', position: 4 },
] as const;

const MAX_GALLERY = 5;

/**
 * Media for ONE variation — front, back, a small gallery and a video.
 *
 * THIS DID NOT EXIST, AND ITS ABSENCE BLOCKED EVERY VARIANT PRODUCT.
 *
 * `validateStep4` requires `media.front` and `media.back` on every variation.
 * The store has carried `setVariationMediaSlot`, `addVariationMoreSlots`,
 * `setVariationMoreSlot`, `removeVariationMoreSlot` and `setVariationVideoSlot`
 * for some time with ZERO callers, and this step told the operator the images
 * were "managed in the variation manager on Step 3" — where no such control
 * exists either. So the step reported N variations missing mandatory images and
 * offered nothing that could supply them.
 */
function VariationMedia({ variation, index }: { variation: ProductVariation; index: number }) {
  const {
    setVariationMediaSlot,
    setVariationVideoSlot,
    addVariationMoreSlots,
    setVariationMoreSlot,
    removeVariationMoreSlot,
  } = useAddProductStore();

  const id = variation.id ?? '';
  const media = (variation.media as VariationMediaState | undefined) ?? emptyVariationMedia();
  const label = [variation.color, variation.design].filter(Boolean).join(' · ')
    || variation.subName
    || `Variant ${index + 1}`;

  const missing = !media.front?.localUri && !media.front?.uploadedUrl;

  return (
    <section className="rounded-xl border border-rule bg-sheet p-3">
      <div className="mb-2.5 flex flex-wrap items-center gap-2">
        <Text as="p" variant="strong">{label}</Text>
        {variation.subSku && (
          <span className="font-mono text-2xs text-ink-2">{variation.subSku}</span>
        )}
        {missing && (
          <span className="ml-auto rounded-full border border-warn-border bg-warn-wash px-2 py-0.5 text-2xs font-semibold text-warn">
            Front and back required
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MediaSlotInput
          label="Front"
          slot={media.front}
          purpose={`variation:${id}:front`}
          position={0}
          mediaType="image"
          onUpdate={(p) => setVariationMediaSlot(id, 'front', p)}
          onClear={() => setVariationMediaSlot(id, 'front', { localUri: '', uploadedUrl: '' })}
        />
        <MediaSlotInput
          label="Back"
          slot={media.back}
          purpose={`variation:${id}:back`}
          position={1}
          mediaType="image"
          onUpdate={(p) => setVariationMediaSlot(id, 'back', p)}
          onClear={() => setVariationMediaSlot(id, 'back', { localUri: '', uploadedUrl: '' })}
        />

        {media.more.map((slot, i) => (
          <MediaSlotInput
            key={i}
            label={`More ${i + 1}`}
            slot={slot}
            purpose={`variation:${id}:more`}
            position={2 + i}
            mediaType="image"
            onUpdate={(p) => setVariationMoreSlot(id, i, p)}
            onClear={() => removeVariationMoreSlot(id, i)}
          />
        ))}

        {media.more.length < MAX_GALLERY && (
          <button
            type="button"
            onClick={() => addVariationMoreSlots(id, [emptySlot()])}
            className="flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-rule text-ink-3 hover:bg-sheet-2"
          >
            <ImagePlus className="h-6 w-6" aria-hidden="true" />
            <Text variant="caption">Add image</Text>
          </button>
        )}

        <MediaSlotInput
          label="Video"
          slot={media.video}
          purpose={`variation:${id}:video`}
          position={0}
          mediaType="video"
          onUpdate={(p) => setVariationVideoSlot(id, p)}
          onClear={() => setVariationVideoSlot(id, { localUri: '', uploadedUrl: '' })}
        />
      </div>
    </section>
  );
}

export function Step4Media() {
  const store = useAddProductStore();
  const {
    productMedia,
    hasVariant: hasVariantRaw,
    variations,
    setProductMediaSlot,
    setProductVideoSlot,
    addProductMoreSlots,
    setProductMoreSlot,
    removeProductMoreSlot,
  } = store;
  const hasVariant = resolveHasVariant(hasVariantRaw, variations);

  if (hasVariant) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <MediaSlotInput
            label="Poster"
            slot={productMedia.poster}
            purpose="product:poster"
            position={0}
            mediaType="image"
            onUpdate={(p) => setProductMediaSlot('poster', p)}
            onClear={() => setProductMediaSlot('poster', { localUri: '', uploadedUrl: '' })}
          />
          <Text as="p" variant="secondary" className="sm:col-span-2">
            The poster represents the whole product. Each variant carries its own front and
            back below — both are required before this step will pass.
          </Text>
        </div>

        {variations.length === 0 ? (
          <div className="rounded-xl border border-warn-border bg-warn-wash p-3 text-sm text-warn">
            No variations yet. Generate them on Step 3, then their images appear here.
          </div>
        ) : (
          variations.map((v, i) => <VariationMedia key={v.id ?? i} variation={v} index={i} />)
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      {PRODUCT_SLOTS.map(({ key, label, position }) => (
        <MediaSlotInput
          key={key}
          label={label}
          slot={productMedia[key]}
          purpose={`product:${key}`}
          position={position}
          mediaType="image"
          onUpdate={(p) => setProductMediaSlot(key, p)}
          onClear={() => setProductMediaSlot(key, { localUri: '', uploadedUrl: '' })}
        />
      ))}

      {/* The extra gallery, which also had no UI: five more slots the model,
          the payload and the summary all already accounted for, capping a new
          product at six images instead of eleven. */}
      {productMedia.more.map((slot, i) => (
        <MediaSlotInput
          key={i}
          label={`More ${i + 1}`}
          slot={slot}
          purpose="product:more"
          position={5 + i}
          mediaType="image"
          onUpdate={(p) => setProductMoreSlot(i, p)}
          onClear={() => removeProductMoreSlot(i)}
        />
      ))}

      {productMedia.more.length < MAX_GALLERY && (
        <button
          type="button"
          onClick={() => addProductMoreSlots([emptySlot()])}
          className="flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-rule text-ink-3 hover:bg-sheet-2"
        >
          <ImagePlus className="h-6 w-6" aria-hidden="true" />
          <Text variant="caption">Add image</Text>
        </button>
      )}

      <MediaSlotInput
        label="Video"
        slot={productMedia.video}
        purpose="product:video"
        position={0}
        mediaType="video"
        onUpdate={(p) => setProductVideoSlot(p)}
        onClear={() => setProductVideoSlot({ localUri: '', uploadedUrl: '' })}
      />
    </div>
  );
}
