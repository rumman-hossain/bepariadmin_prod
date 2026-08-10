import {
  createContext,
  useContext,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type ReactNode,
} from 'react';
import {
  AlertTriangle,
  Check,
  Eye,
  ImagePlus,
  Loader2,
  Maximize2,
  MoreHorizontal,
  RefreshCw,
  Sparkles,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
import {
  useAddProductStore,
  emptySlot,
  emptyVariationMedia,
} from '../../store/useAddProductStore';
import { resolveHasVariant } from '../../utils/resolveHasVariant';
import { slotActive } from '../../utils/validateWizardStep';
import { acceptAttribute, useUpload } from '@/src/services/upload/useUpload';
import type { MediaSlot, ProductVariation } from '../../../types/registration';
import { Text } from '@/src/components/data';
import { Popover } from '@/src/components/controls';
import { cn } from '@/src/design-system/utils/cn';
import { mediaDisplayUrl } from '@/src/utils/mediaUrl';
import { ProductMediaViewer, type ViewerItem } from '../../../components/ProductMediaViewer';
import { useParams } from 'react-router-dom';
import { BeautifyStart, BeautifyStrip, BeautifyReview } from '../../../components/BeautifyBar';
import { BeautifyOneDialog } from '../../../components/BeautifyOneDialog';
import { BeautifyTileState } from '../../../components/BeautifyTileState';
import {
  useBeautify,
  slotKey,
  beautifySlotFromPurpose,
  type BeautifySlot,
  type SlotState,
} from '../../../hooks/useBeautify';
import type { BeautifyMode, BeautifySide } from '@/src/api/beautify';

/**
 * WHAT THIS SCREEN IS FOR.
 *
 * An operator arrives here holding a folder of photos and one question: which
 * ones does this product need, and am I finished? The previous version answered
 * neither. It was a flat grid of identical dashed squares — a red underlined
 * "Remove" link appeared under the filled ones, so every tile was a different
 * height and the grid went ragged the moment work started; the only statement
 * of what was required lived in the footer, as a validation error, after the
 * operator had already pressed Continue.
 *
 * So: the requirement is stated at the top, in the affirmative, and it counts
 * down as the work is done. Tiles keep one height in every state. Actions live
 * ON the tile as corner buttons rather than as text beneath it — always
 * visible, because half the operators are on a touch screen where nothing
 * hovers. And every tile takes a dropped file, which is what "poor" mostly
 * meant: a photo screen that could not accept a photo you dragged onto it.
 */

/** Whether the slot is worth telling the operator about. */
type Requirement = 'required' | 'recommended' | 'optional';

interface TileProps {
  label: string;
  /**
   * The accessible name, where the visible one is not unique on the page.
   *
   * A variant product rendered several buttons all called "Front" — the card
   * header naming the colour is a visual cue only, so a screen-reader user
   * heard "Front, button" four times with nothing to tell them apart. The
   * visible label stays short because the card already says which variant it
   * belongs to; the announced one carries the colour.
   */
  ariaLabel?: string;
  /** Shown under the tile. One short line, or nothing. */
  hint?: string;
  requirement?: Requirement;
  slot: MediaSlot;
  purpose: string;
  position: number;
  mediaType: 'image' | 'video';
  /** A clip is 16:9; everything else is square, so the rows line up. */
  shape?: 'square' | 'video';
  /** Off where a section heading already names the tile — see the video slot,
      which used to print the word "Video" twice, once as the heading and once
      as its own caption directly beneath. */
  showLabel?: boolean;
  onUpdate: (partial: Partial<MediaSlot>) => void;
  /** Offered only where the slot can actually be emptied. */
  onClear?: () => void;
}

/**
 * ONE ROW OF THE TILE'S MENU.
 *
 * Full width and 40px tall, because the thing this replaced was a 28px circle
 * and the operators are half on touch screens. The icon is decoration — the
 * label is the accessible name, so nothing here depends on recognising a glyph.
 */
function MenuItem({
  icon: Icon,
  children,
  onClick,
  tone = 'normal',
}: {
  icon: LucideIcon;
  children: ReactNode;
  onClick: () => void;
  tone?: 'normal' | 'bad';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex min-h-10 w-full items-center gap-2.5 px-3 py-2 text-left text-sm',
        tone === 'bad' ? 'text-bad hover:bg-bad-wash' : 'text-ink hover:bg-sheet-hover',
      )}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1">{children}</span>
    </button>
  );
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
function MediaTile({
  label,
  ariaLabel,
  hint,
  requirement,
  slot,
  purpose,
  position,
  mediaType,
  shape = 'square',
  showLabel = true,
  onUpdate,
  onClear,
}: TileProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const { draftId, setField } = useAddProductStore();
  const openMedia = useContext(OpenMediaContext);
  const beautify = useContext(BeautifyContext);
  const beautifySlot = beautifySlotFromPurpose(purpose);
  const beautifyState = beautifySlot ? beautify?.stateFor(purpose) : undefined;
  const [beautifyOpen, setBeautifyOpen] = useState(false);
  /* Lives here rather than in BeautifyTileState because the control that sets
     it is in this tile's menu, and the thing it hides is drawn by that. */
  const [peeking, setPeeking] = useState(false);

  const { uploadSlot, releasePreviewUrl } = useUpload();

  const name = ariaLabel ?? label;
  const uploading = slot.uploadStatus === 'uploading';
  const failed = slot.uploadStatus === 'error';

  /*
   * A CLIP THAT UPLOADED PERFECTLY AND CANNOT BE PLAYED.
   *
   * `uploadStatus` only ever describes the transfer. Measured on dev with a
   * structurally valid MP4 the browser could not decode: draft 201, PUT 200,
   * complete 200, the step reported success — and the preview `<video>` sat
   * there black with `error.code === 4` (MEDIA_ERR_SRC_NOT_SUPPORTED) and
   * nothing anywhere saying so. The file is stored, the listing ships, and the
   * first person to find out is a retailer.
   *
   * The `<video>` element is the only thing that knows. Nothing listened to it.
   *
   * Reset on a new file, because the slot is reused: without this, replacing a
   * broken clip with a good one leaves the warning up.
   */
  const [undecodable, setUndecodable] = useState(false);
  const previewSrc = slot.localUri || slot.uploadedUrl;
  const lastSrc = useRef(previewSrc);
  if (lastSrc.current !== previewSrc) {
    lastSrc.current = previewSrc;
    if (undecodable) setUndecodable(false);
  }

  /*
    `localUri` is a blob: URL for something just picked, but on an EDIT it is
    whatever the product had stored — a `gs://` reference, which is not loadable
    and which the CSP blocks. `mediaDisplayUrl` passes blob: and data: through
    untouched and rewrites gs:// to the public bucket, so both cases render from
    one branch. `uploadedUrl` is the fallback for a slot that carries the
    durable URL and nothing else.
  */
  const previewUrl = mediaDisplayUrl(slot.localUri || slot.uploadedUrl);

  // Only a front or a back, only once the product exists, and only when there
  // is actually a photograph to work from. Declared after previewUrl, which it
  // reads.
  const canBeautify = Boolean(beautify?.enabled && beautifySlot && previewUrl);
  const beautifyBusy =
    beautifyState?.status === 'working' || beautifyState?.status === 'queued';

  const openPicker = () => {
    if (!uploading) inputRef.current?.click();
  };

  /*
   * `.catch(() => {})` at both call sites, not carelessness.
   *
   * `uploadSlot` writes `uploadStatus:'error'` and the message into the slot
   * BEFORE it rethrows (`useUpload.ts`), so the tile and the readiness banner
   * already show the failure — the rethrow exists for callers that want to
   * await it, and this one does not. Left floating it produced an unhandled
   * promise rejection on every failed upload, which is noise in the crash
   * channel that now watches for exactly that.
   */
  const send = async (file: File) => {
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

  /*
   * Clearing a slot revokes its blob.
   *
   * The preview a slot holds after a successful upload is an object URL, not a
   * server URL — see the note in `useUpload`. Emptying the slot without
   * revoking it leaks the whole image for as long as the wizard is open, and
   * an operator swapping the poster a few times is the ordinary case, not a
   * pathological one. Unmount sweeps whatever is left; this is for the slots
   * that stay mounted and simply become empty.
   */
  const clear = onClear
    ? () => {
        releasePreviewUrl(slot.localUri);
        onClear();
      }
    : undefined;

  /* `uploadSlot` runs `rejectionReason` on whatever it is handed, so a dropped
     file meets exactly the same gate as a picked one — the drop target is not a
     second, laxer way in. */
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && !uploading) void send(file).catch(() => {});
  };

  return (
    <div className="flex flex-col gap-1.5">
      {showLabel && (
        <div className="flex items-baseline gap-1.5">
          <Text as="p" variant="label">{label}</Text>
          {requirement === 'required' && (
            <span className="text-2xs font-semibold uppercase tracking-caps text-bad">
              Required
            </span>
          )}
          {requirement === 'optional' && <Text variant="caption">Optional</Text>}
        </div>
      )}

      {/* A named group, not a bare div: the tile is a slot whose controls change
          with its state — an empty one offers "add", a filled one offers
          "replace" and "remove" — and the group is the one thing that carries
          the slot's identity through all of them. */}
      <div
        role="group"
        aria-label={name}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={cn(
          'group relative w-full overflow-hidden rounded-xl',
          shape === 'video' ? 'aspect-video' : 'aspect-square',
          previewUrl
            ? 'border border-rule bg-sheet-2'
            : 'border-2 border-dashed border-rule bg-sheet',
          dragging && 'border-brass bg-brass-wash',
          failed && 'border-bad',
        )}
      >
        {previewUrl ? (
          /* `pointer-events-none` on both: the picture is not the control, the
             invisible button over it is. Without this the media element eats
             the click and the tile stops being clickable. */
          mediaType === 'video' ? (
            <video
              src={previewUrl}
              // The element is the only thing that can tell us the codec is
              // unplayable, and it fires this exactly once per source.
              onError={() => setUndecodable(true)}
              className="pointer-events-none absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <img
              src={previewUrl}
              alt={label}
              className="pointer-events-none absolute inset-0 h-full w-full object-cover"
            />
          )
        ) : (
          /* aria-label is the slot's own name, not "Add Front": the visible
             caption is a sibling, so without it every empty slot announces
             itself as "Drop or click" and a screen-reader user picking the back
             image of the third variant has nothing to steer by. The two corner
             actions qualify the same name with the verb they perform. */
          <button
            type="button"
            onClick={openPicker}
            aria-label={name}
            className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 px-2 text-center hover:bg-sheet-hover"
          >
            <ImagePlus
              className={cn('h-6 w-6', dragging ? 'text-brass' : 'text-ink-4')}
              aria-hidden="true"
            />
            <Text variant="caption">{dragging ? 'Drop to upload' : 'Drop or click'}</Text>
          </button>
        )}

        {/*
          THE PICTURE IS THE BUTTON.

          This was four 28px circles in a row anchored to the top-right corner.
          Measured on dev: the row needs 124px and a variant tile is 75px wide,
          inside `overflow-hidden` — so on every variant tile "View full screen"
          sat 56px OFF the left edge and "Beautify" 24px off it. Both were
          clipped away entirely, and `elementFromPoint` at their centres
          returned the sidebar. The poster is 272px, which is why it looked
          fine everywhere anyone checked.

          The consequence was not cosmetic. A variant image could not be opened
          full screen at all, and a FAILED beautify had no way out of it —
          Correct was one of the two clipped buttons.

          So nothing has to fit in 75px any more. One chip marks the tile as
          having actions, clicking anywhere on the picture opens them, and the
          list is portalled to the body where the tile's overflow cannot reach
          it.
        */}
        {previewUrl && !uploading && (
          <Popover
            label={`Options for ${name}`}
            anchorClassName="absolute inset-0"
            className="w-56 py-1"
            trigger={
              <button
                type="button"
                aria-label={`Options for ${name}`}
                className="relative h-full w-full cursor-pointer rounded-xl focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-rule-focus"
              >
                {/*
                  Always visible, never on hover: half the operators are on a
                  touch screen, where a hover affordance does not exist. One
                  control at this size clears a 75px tile with room to spare.
                */}
                <span className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full border border-rule bg-sheet text-ink-2 shadow-sm">
                  <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                </span>
              </button>
            }
          >
            {(close) => (
              <>
                {/* First, because looking at a tile is the common act and
                    changing it is the consequence. */}
                {openMedia && (
                  <MenuItem
                    icon={Maximize2}
                    onClick={() => {
                      close();
                      openMedia(previewUrl);
                    }}
                  >
                    View full screen
                  </MenuItem>
                )}

                {/* Compare against what the supplier sent. A toggle rather than
                    the press-and-hold it replaced: a hold has no menu
                    equivalent, and a toggle says plainly what it does. */}
                {beautifyState?.status === 'ready' && (
                  <MenuItem
                    icon={Eye}
                    onClick={() => {
                      close();
                      setPeeking((v) => !v);
                    }}
                  >
                    {peeking ? 'Show the beautified' : 'Show the original'}
                  </MenuItem>
                )}

                {/* Beautify THIS image alone. The bar above does the whole
                    product; this is for the one shot that needs redoing, and
                    it is the way out of a failed tile. */}
                {canBeautify && !beautifyBusy && (
                  <MenuItem
                    icon={Sparkles}
                    onClick={() => {
                      close();
                      setBeautifyOpen(true);
                    }}
                  >
                    {beautifyState?.status === 'failed' || beautifyState?.status === 'ready'
                      ? 'Correct this image'
                      : 'Beautify this image'}
                  </MenuItem>
                )}

                <MenuItem
                  icon={RefreshCw}
                  onClick={() => {
                    close();
                    openPicker();
                  }}
                >
                  Replace image
                </MenuItem>

                {clear && (
                  <>
                    <div className="my-1 border-t border-rule-subtle" />
                    <MenuItem
                      icon={Trash2}
                      tone="bad"
                      onClick={() => {
                        close();
                        clear();
                      }}
                    >
                      Remove
                    </MenuItem>
                  </>
                )}
              </>
            )}
          </Popover>
        )}

        {uploading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-sheet-inverse/60">
            <Loader2 className="h-5 w-5 animate-spin text-ink-inverse" aria-hidden="true" />
            <span className="text-2xs font-medium text-ink-inverse">Uploading…</span>
          </div>
        )}

        {/* Beautification, drawn over the photograph the operator is already
            looking at. Never while an upload is in flight: the two states
            would stack, and the tile would claim to be doing both. */}
        {!uploading && beautify && beautifySlot && (
          <BeautifyTileState state={beautifyState} peeking={peeking} />
        )}

        {canBeautify && beautifySlot && (
          <BeautifyOneDialog
            open={beautifyOpen}
            label={name}
            side={beautifySlot.side}
            correcting={
              beautifyState?.status === 'failed' || beautifyState?.status === 'ready'
            }
            onClose={() => setBeautifyOpen(false)}
            onConfirm={(mode, description) => {
              setBeautifyOpen(false);
              beautify?.beautifyOne(purpose, mode, description);
            }}
          />
        )}

        {/*
          Covers the tile, because a black rectangle is exactly what an
          undecodable clip looks like and the operator has no reason to read
          that as a fault. `role="alert"` so it is announced rather than only
          seen — the tile is a thumbnail, and this is the one thing about it
          worth saying out loud.
        */}
        {undecodable && !uploading && (
          <div
            role="alert"
            /* Transparent to clicks like the beautify layers, so the menu that
               offers "Replace" and "Remove" — the two things this text tells
               the operator to do — is still reachable underneath it. */
            className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 bg-bad-wash/95 px-2 text-center"
          >
            <AlertTriangle className="h-4 w-4 text-bad" aria-hidden="true" />
            <span className="text-2xs font-semibold text-bad">This clip will not play</span>
            <span className="text-2xs leading-tight text-ink-2">
              It uploaded, but the browser cannot decode it. Retailers will see the same. Replace
              it with an MP4 (H.264), or remove it.
            </span>
          </div>
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
            if (file) void send(file).catch(() => {});
            e.target.value = '';
          }}
        />
      </div>

      {slot.uploadError ? (
        <p className="text-2xs text-bad">
          {slot.uploadError}{' '}
          <button type="button" onClick={openPicker} className="underline hover:no-underline">
            Try another file
          </button>
        </p>
      ) : (
        hint && <Text variant="caption">{hint}</Text>
      )}
    </div>
  );
}

/** The empty cell that grows the gallery, sized to sit level with the tiles. */
function AddTile({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex aspect-square w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-rule text-ink-4 hover:border-brass hover:bg-sheet-hover hover:text-ink"
    >
      <ImagePlus className="h-5 w-5" aria-hidden="true" />
      <Text variant="caption">Add</Text>
    </button>
  );
}

/**
 * WHERE THE OPERATOR LOOKS FIRST.
 *
 * The requirement, in the affirmative, before they start rather than after they
 * press Continue. `tone` follows the same precedence the validator uses — a
 * failure outranks a queue, a queue outranks an unmet requirement.
 */
function ReadinessBanner({
  tone,
  title,
  detail,
}: {
  tone: 'ok' | 'warn' | 'bad';
  title: string;
  detail?: string;
}) {
  const Icon = tone === 'ok' ? Check : AlertTriangle;
  return (
    /* A live region: the interesting transitions here happen without the
       operator touching anything — an upload finishes, a queue drains, the last
       variant gets its back shot — and the whole point of the banner is to say
       so at the moment it becomes true. */
    <div
      role="status"
      className={cn(
        'flex items-start gap-2.5 rounded-xl border px-3.5 py-3',
        tone === 'ok' && 'border-ok-border bg-ok-wash',
        tone === 'warn' && 'border-warn-border bg-warn-wash',
        tone === 'bad' && 'border-bad-border bg-bad-wash',
      )}
    >
      <Icon
        className={cn(
          'mt-0.5 h-4 w-4 shrink-0',
          tone === 'ok' && 'text-ok',
          tone === 'warn' && 'text-warn',
          tone === 'bad' && 'text-bad',
        )}
        aria-hidden="true"
      />
      <div className="min-w-0">
        <p
          className={cn(
            'text-sm font-semibold',
            tone === 'ok' && 'text-ok',
            tone === 'warn' && 'text-warn',
            tone === 'bad' && 'text-bad',
          )}
        >
          {title}
        </p>
        {detail && <p className="text-xs text-ink-2">{detail}</p>}
      </div>
    </div>
  );
}

function SectionHead({ title, caption }: { title: string; caption?: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-rule-subtle pb-1.5">
      <Text as="p" variant="strong">{title}</Text>
      {caption && <Text variant="caption">{caption}</Text>}
    </div>
  );
}

/** The explanation that earns the poster its size on the page. */
function PosterNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-note-border bg-note-wash p-3">
      <Text as="p" variant="strong">Catalogue thumbnail</Text>
      <Text as="p" variant="secondary">{children}</Text>
    </div>
  );
}

/*
 * Three named shots, then a short gallery.
 *
 * `left` and `right` are gone. A wholesale catalogue is not an orthographic
 * drawing — a buyer wants the poster, the front, the back and a couple of
 * detail shots, and five fixed squares of equal weight said nothing about
 * which of them mattered. Existing side shots fold into the gallery on
 * hydrate, so nothing is lost from a product that already has them.
 */
const NAMED_SLOTS = [
  { key: 'front', label: 'Front', hint: 'The main product shot', position: 1 },
  { key: 'back', label: 'Back', hint: 'Reverse side', position: 2 },
] as const;

/** Three, not five — see NAMED_SLOTS. */
/*
 * OPENING A TILE FULL SCREEN, from wherever that tile happens to be.
 *
 * Tiles are nested inside VariationCard, so passing each one its index in the
 * viewer's slide list would mean threading a counter through every branch and
 * keeping it in step with the render order — the kind of bookkeeping that goes
 * wrong the first time a slot is added. A tile instead says "open ME", by URL,
 * and the root finds its position in the list it built.
 *
 * Undefined outside the provider, so the View action simply does not render
 * rather than throwing — MediaTile is also used in places that have no viewer.
 */
const OpenMediaContext = createContext<((url: string) => void) | undefined>(undefined);

/*
 * BEAUTIFY STATE, reaching the tiles the same way the viewer does.
 *
 * A context for the same reason OpenMediaContext is one: tiles are nested
 * inside VariationCard, and threading a per-tile status down through every
 * branch would be bookkeeping that goes wrong the first time a slot is added.
 *
 * Keyed by the tile's own `purpose` string, which already encodes which
 * variation and which side it is — so there is no second identity to keep in
 * step with the first.
 */
interface BeautifyTileAccess {
  stateFor: (purpose: string) => SlotState | undefined;
  redo: (purpose: string, note: string) => void;
  /**
   * Beautify ONE image, on its own, without touching the rest of the product.
   *
   * The bar runs every front and back at once, which is right when a product
   * is first prepared and wrong afterwards: re-doing a single bad shot should
   * not regenerate — or re-bill — the eleven that were already fine.
   */
  beautifyOne: (purpose: string, mode: BeautifyMode, description: string) => void;
  /** False during first registration, where there is no product row to commit to. */
  enabled: boolean;
}
const BeautifyContext = createContext<BeautifyTileAccess | undefined>(undefined);


const MAX_GALLERY = 3;

/** Every tile grid on the page, so tiles are one size wherever they appear. */
const TILE_GRID = 'grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5';

function countSlots(slots: (MediaSlot | undefined)[]) {
  const active = slots.filter(slotActive) as MediaSlot[];
  return {
    added: active.length,
    pending: active.filter((s) => s.uploadStatus === 'uploading' || s.uploadStatus === 'idle')
      .length,
    failed: active.filter((s) => s.uploadStatus === 'error').length,
  };
}

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
 *
 * Laid out as a CARD rather than a full-width band: at two per row a
 * twelve-colour product is six rows instead of twelve screens of scrolling.
 */
function VariationCard({ variation, index }: { variation: ProductVariation; index: number }) {
  const {
    setVariationMediaSlot,
    setVariationVideoSlot,
    addVariationMoreSlots,
    setVariationMoreSlot,
    removeVariationMoreSlot,
  } = useAddProductStore();

  const id = variation.id ?? '';
  /*
   * No cast. `ProductVariation.media` is `VariationMediaState | undefined` now
   * that hydrate folds the server's rows into slots — this line used to read
   * `(variation.media as VariationMediaState) ?? emptyVariationMedia()`, and
   * `??` does not fire for a non-empty ARRAY, which is what the server sends.
   * `media.more` was then undefined and the step threw on `.map`.
   */
  const media = variation.media ?? emptyVariationMedia();
  const label =
    [variation.color, variation.design].filter(Boolean).join(' · ') ||
    variation.subName ||
    `Variant ${index + 1}`;

  const complete = slotActive(media.front) && slotActive(media.back);

  return (
    <section className="rounded-xl border border-rule bg-sheet p-3.5">
      <header className="mb-3 flex flex-wrap items-center gap-2">
        <Text as="p" variant="strong">{label}</Text>
        {variation.subSku && (
          <span className="font-mono text-2xs text-ink-3">{variation.subSku}</span>
        )}
        <span
          className={cn(
            'ml-auto rounded-full border px-2 py-0.5 text-2xs font-semibold',
            complete
              ? 'border-ok-border bg-ok-wash text-ok'
              : 'border-warn-border bg-warn-wash text-warn',
          )}
        >
          {complete ? 'Front and back set' : 'Front and back required'}
        </span>
      </header>

      {/*
        The requirement is stated ONCE, in the pill above, not again on each
        tile. A variant card packs six tiles into a row, so a tile is narrower
        than the words "FRONT REQUIRED" — the badge overflowed into the next
        column and rendered as "FRONT REQUIREDBACK REQUIRED". The pill says the
        same thing with room to say it, and it says it about the pair, which is
        how the validator actually checks.
      */}

      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-6">
        <MediaTile
          label="Front"
          ariaLabel={`Front — ${label}`}
          slot={media.front}
          purpose={`variation:${id}:front`}
          position={0}
          mediaType="image"
          onUpdate={(p) => setVariationMediaSlot(id, 'front', p)}
          onClear={() => setVariationMediaSlot(id, 'front', { localUri: '', uploadedUrl: '' })}
        />
        <MediaTile
          label="Back"
          ariaLabel={`Back — ${label}`}
          slot={media.back}
          purpose={`variation:${id}:back`}
          position={1}
          mediaType="image"
          onUpdate={(p) => setVariationMediaSlot(id, 'back', p)}
          onClear={() => setVariationMediaSlot(id, 'back', { localUri: '', uploadedUrl: '' })}
        />

        {media.more.map((slot, i) => (
          <MediaTile
            key={i}
            label={`Detail ${i + 1}`}
            ariaLabel={`Detail ${i + 1} — ${label}`}
            slot={slot}
            purpose={`variation:${id}:more`}
            position={2 + i}
            mediaType="image"
            onUpdate={(p) => setVariationMoreSlot(id, i, p)}
            onClear={() => removeVariationMoreSlot(id, i)}
          />
        ))}

        {media.more.length < MAX_GALLERY && (
          <div className="flex flex-col gap-1.5">
            <Text as="p" variant="label">Detail</Text>
            <AddTile
              label={`Add image to ${label}`}
              onClick={() => addVariationMoreSlots(id, [emptySlot()])}
            />
          </div>
        )}

        <MediaTile
          label="Video"
          ariaLabel={`Video — ${label}`}
          requirement="optional"
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

  /*
   * BEAUTIFY IS AN EDIT-MODE FEATURE, and not by preference.
   *
   * Committing repoints a products.product_media row. During first
   * registration the images are already in GCS but the product row does not
   * exist yet, so there is nothing to repoint. Register, then beautify. The
   * controls are simply absent before that; there is nothing to explain.
   *
   * The route param rather than the store's `productId`, which is typed
   * `number | null` and never assigned — useAddProductLogic reads the same
   * param, so this is one source rather than a second.
   */
  const { productId } = useParams<{ productId?: string }>();
  const beautify = useBeautify();
  const [runOpts, setRunOpts] = useState<{ mode: BeautifyMode; description: string } | null>(null);

  /*
   * Every front and back in the product, which is exactly the set beautify
   * acts on: the product's own pair, then each variation's. Built from the
   * store so it cannot drift from the tiles, and a slot with no image is
   * skipped — there is nothing to re-render.
   */
  const beautifySlots = useMemo<BeautifySlot[]>(() => {
    const out: BeautifySlot[] = [];
    const push = (slot: MediaSlot | undefined, variationId: string, side: BeautifySide, label: string) => {
      // The thumbnail rides along so the run can be watched from the control
      // itself — see BeautifyStrip. Same resolution the tiles use, because on
      // an edit the slot holds a gs:// reference no browser can load.
      if (slotActive(slot)) {
        out.push({
          variationId,
          side,
          label,
          thumbUrl: mediaDisplayUrl(slot?.localUri || slot?.uploadedUrl) ?? undefined,
        });
      }
    };
    /*
     * The product's own pair counts whenever it EXISTS, variant or not.
     *
     * This used to be gated on `!hasVariant`. In practice a variant product's
     * own front and back are empty — the variant layout offers a poster and
     * then per-variation tiles — so `slotActive` skips them anyway. Gating on
     * the shape as well was a second rule that could only ever disagree with
     * the first: "front and back, variant and non-variant" is the rule.
     */
    push(productMedia.front, '', 'front', 'Front');
    push(productMedia.back, '', 'back', 'Back');
    variations.forEach((v) => {
      const m = v.media;
      if (!m || !v.id) return;
      const who = v.subName || v.color || v.subSku || 'Variant';
      push(m.front, String(v.id), 'front', `${who} · front`);
      push(m.back, String(v.id), 'back', `${who} · back`);
    });
    return out;
  }, [productMedia, variations]);

  /*
   * The price BEFORE the button, from the same split the server bills on: the
   * dearer model composes a person onto a front, the cheap one replaces a
   * background. Only With Model pays the higher rate, and only on fronts.
   */
  const costFor = (mode: BeautifyMode) =>
    beautifySlots.reduce(
      (sum, s) => sum + (mode === 'with_model' && s.side === 'front' ? 0.067 : 0.0336),
      0,
    );

  const beautifyAccess = useMemo(
    () => ({
      stateFor: (purpose: string) => {
        const slot = beautifySlotFromPurpose(purpose);
        return slot ? beautify.states[slotKey(slot.variationId, slot.side)] : undefined;
      },
      redo: (purpose: string, note: string) => {
        const slot = beautifySlotFromPurpose(purpose);
        if (!slot || !productId || !runOpts) return;
        const known = beautifySlots.find(
          (s) => s.variationId === slot.variationId && s.side === slot.side,
        );
        if (!known) return;
        /*
         * The operator's correction is APPENDED to the model description, not
         * substituted for it. "the hem is cut off" on its own would throw away
         * who the model is, and they asked for a change, not a restart.
         *
         * It also lands in the idempotency key, which is what makes the redo
         * produce a new picture rather than returning the one being complained
         * about.
         */
        const description = note
          ? `${runOpts.description}${runOpts.description ? '. ' : ''}${note}`
          : runOpts.description;
        void beautify.redo(
          { productId, mode: runOpts.mode, modelDescription: description, slots: beautifySlots },
          known,
        );
      },

      /*
       * ONE IMAGE, ON ITS OWN.
       *
       * Reuses the single-slot path Redo already uses, so this is a control
       * and a dialog rather than new plumbing. `runOpts` is also recorded so a
       * later Redo on this tile knows which mode and description it is
       * correcting — without it, a redo after an individual run would have
       * nothing to append the correction to.
       */
      beautifyOne: (purpose: string, mode: BeautifyMode, description: string) => {
        const slot = beautifySlotFromPurpose(purpose);
        if (!slot || !productId) return;
        const known = beautifySlots.find(
          (s) => s.variationId === slot.variationId && s.side === slot.side,
        );
        if (!known) return;
        setRunOpts({ mode, description });
        void beautify.redo(
          { productId, mode, modelDescription: description, slots: beautifySlots },
          known,
        );
      },

      enabled: Boolean(productId),
    }),
    [beautify, beautifySlots, productId, runOpts],
  );

  /*
   * EVERY TILE ON THE SCREEN, in the order they are laid out.
   *
   * Built straight from the store rather than from the branch-local JSX, so the
   * variant and non-variant layouts share one list and neither can drift from
   * what is on screen. A slot with nothing in it is skipped — an empty tile has
   * nothing to show full screen.
   *
   * `mediaDisplayUrl` for the same reason the tiles use it: on an EDIT a slot
   * holds a `gs://` reference, which no browser can load and the CSP blocks.
   */
  const [viewerAt, setViewerAt] = useState<number | null>(null);

  const viewerItems = useMemo<ViewerItem[]>(() => {
    const out: ViewerItem[] = [];

    /*
     * A beautified slot contributes TWO slides, before and after, adjacent.
     *
     * That adjacency is the comparison. The two are framed identically, so
     * paging between them shows exactly what changed — which is cheaper and
     * clearer than a second modal, and it reuses the viewer instead of
     * competing with it.
     */
    const push = (
      slot: MediaSlot | undefined,
      label: string,
      kind: 'image' | 'video',
      beautified?: { variationId: string; side: BeautifySide },
    ) => {
      const url = mediaDisplayUrl(slot?.localUri || slot?.uploadedUrl);
      if (!url) return;
      const state = beautified
        ? beautify.states[slotKey(beautified.variationId, beautified.side)]
        : undefined;
      const preview = state?.status === 'ready' ? state.job.previewUrl : undefined;

      out.push({ url, kind, label: preview ? `${label} · before` : label });
      if (preview) out.push({ url: preview, kind: 'image', label: `${label} · after` });
    };

    push(productMedia.poster, 'Poster', 'image');
    push(productMedia.front, 'Front', 'image', { variationId: '', side: 'front' });
    push(productMedia.back, 'Back', 'image', { variationId: '', side: 'back' });
    (productMedia.more ?? []).forEach((slot, i) => push(slot, `Detail ${i + 1}`, 'image'));
    push(productMedia.video, 'Video', 'video');

    variations.forEach((v) => {
      const m = v.media;
      if (!m) return;
      const who = v.subName || v.color || v.subSku || 'Variant';
      const id = v.id ? String(v.id) : '';
      push(m.front, `${who} · front`, 'image', id ? { variationId: id, side: 'front' } : undefined);
      push(m.back, `${who} · back`, 'image', id ? { variationId: id, side: 'back' } : undefined);
      (m.more ?? []).forEach((slot, i) => push(slot, `${who} · detail ${i + 1}`, 'image'));
      push(m.video, `${who} · video`, 'video');
    });

    return out;
  }, [productMedia, variations, beautify.states]);

  /* A tile asks to be opened by URL; its position is looked up here. */
  const openMedia = (url: string) => {
    const i = viewerItems.findIndex((item) => item.url === url);
    setViewerAt(i >= 0 ? i : 0);
  };

  /*
   * Both layouts — variant and plain — get the provider and the overlay from
   * one place. Wrapping each return separately would be two copies of the same
   * three lines, and the second is the one that gets forgotten.
   */
  const withViewer = (children: ReactNode) => (
    <OpenMediaContext.Provider value={openMedia}>
      <BeautifyContext.Provider value={beautifyAccess}>
        {children}
        <ProductMediaViewer
          items={viewerItems}
          openAt={viewerAt}
          onClose={() => setViewerAt(null)}
        />
      </BeautifyContext.Provider>
    </OpenMediaContext.Provider>
  );

  /*
   * The controls, rendered by both layouts from one place — a second copy is
   * the one that gets forgotten when something changes.
   *
   * Absent entirely during first registration (no product row to commit to)
   * and when there is no front or back to work from.
   */
  const beautifyPanel =
    productId && beautifySlots.length > 0 ? (
      <div className="flex flex-col gap-3">
        <BeautifyStart
          imageCount={beautifySlots.length}
          estimatedCost={costFor('with_model')}
          disabled={beautify.running}
          onRun={(mode, description) => {
            setRunOpts({ mode, description });
            void beautify.run({ productId, mode, modelDescription: description, slots: beautifySlots });
          }}
        />
        {/* Directly beneath the button, so the sheen is where the operator is
            already looking rather than below the fold. */}
        <BeautifyStrip slots={beautifySlots} states={beautify.states} />
      </div>
    ) : null;

  const beautifyReview = productId ? (
    <BeautifyReview
      done={beautify.progress.done}
      total={beautify.progress.total}
      readyCount={beautify.readyJobs().length}
      busy={beautify.running}
      onApply={() => void beautify.commit(productId)}
      onDiscard={() => void beautify.discard(productId)}
    />
  ) : null;


  const poster = (
    <MediaTile
      label="Poster"
      requirement="recommended"
      slot={productMedia.poster}
      purpose="product:poster"
      position={0}
      mediaType="image"
      onUpdate={(p) => setProductMediaSlot('poster', p)}
      onClear={() => setProductMediaSlot('poster', { localUri: '', uploadedUrl: '' })}
    />
  );

  if (hasVariant) {
    /*
     * The variant branch of `validateStep4` does not look at product media at
     * all — it counts variations missing a front or a back. So that is what
     * this says, rather than implying the poster is what stands between the
     * operator and the next step.
     */
    const incomplete = variations.filter((v) => {
      const media = v.media;
      return !media || !slotActive(media.front) || !slotActive(media.back);
    }).length;

    const counts = countSlots(
      variations.flatMap((v) => {
        const media = v.media;
        return media ? [media.front, media.back, ...(media.more ?? []), media.video] : [];
      }),
    );

    const banner =
      variations.length === 0
        ? { tone: 'warn' as const, title: 'No variations yet', detail: 'Generate them on Step 3 and their images appear here.' }
        : counts.failed > 0
          ? { tone: 'bad' as const, title: `${counts.failed} upload${counts.failed === 1 ? '' : 's'} failed`, detail: 'Open the tile with the red border and try another file.' }
          : counts.pending > 0
            ? { tone: 'warn' as const, title: `${counts.pending} image${counts.pending === 1 ? '' : 's'} still uploading`, detail: 'The step will not pass until they finish.' }
            : incomplete > 0
              ? { tone: 'warn' as const, title: `${incomplete} of ${variations.length} variants still need a front and a back`, detail: 'Both are mandatory on every variant.' }
              : { tone: 'ok' as const, title: `All ${variations.length} variants have their front and back`, detail: 'Detail shots and clips are optional.' };

    return withViewer(
      <div className="space-y-5">
        <ReadinessBanner {...banner} />
        {beautifyPanel}

        <section className="grid gap-4 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)]">
          {poster}
          <PosterNote>
            The one image a retailer sees before they open the product. Each variant carries
            its own front and back below — those are what the step checks.
          </PosterNote>
        </section>

        {variations.length > 0 && (
          <section className="space-y-3">
            <SectionHead
              title="Variant images"
              caption={`${variations.length} variant${variations.length === 1 ? '' : 's'}`}
            />
            <div className="grid gap-4 xl:grid-cols-2">
              {variations.map((v, i) => (
                <VariationCard key={v.id ?? i} variation={v} index={i} />
              ))}
            </div>
          </section>
        )}
        {beautifyReview}
      </div>
    );
  }

  const counts = countSlots([
    productMedia.poster,
    productMedia.front,
    productMedia.back,
    ...productMedia.more,
    productMedia.video,
  ]);

  /*
   * THE HONEST REQUIREMENT.
   *
   * `validateStep4` asks for at least ONE active slot — it does not single out
   * the poster, the front or the back. The old copy said front and back were
   * required, which was true only on the variant branch, and no copy anywhere
   * said what the non-variant branch actually wanted. An operator who believes
   * a screen demands more than it does supplies photographs nobody asked for;
   * one who believes it demands less gets stopped by the footer.
   */
  const banner =
    counts.failed > 0
      ? { tone: 'bad' as const, title: `${counts.failed} upload${counts.failed === 1 ? '' : 's'} failed`, detail: 'Open the tile with the red border and try another file.' }
      : counts.pending > 0
        ? { tone: 'warn' as const, title: `${counts.pending} image${counts.pending === 1 ? '' : 's'} still uploading`, detail: 'The step will not pass until they finish.' }
        : counts.added === 0
          ? { tone: 'warn' as const, title: 'At least one image is required', detail: 'Start with the poster — it is the one a retailer sees in the catalogue.' }
          : {
              tone: 'ok' as const,
              title: `${counts.added} image${counts.added === 1 ? '' : 's'} ready`,
              detail: slotActive(productMedia.poster)
                ? 'Everything else on this page is optional.'
                : 'No poster yet. It is the catalogue thumbnail, so it is worth adding.',
            };

  return withViewer(
    <div className="space-y-5">
      <ReadinessBanner {...banner} />
      {beautifyPanel}

      {/*
        THE POSTER IS NOT ONE OF FIVE EQUAL SQUARES.

        This was a flat `grid-cols-3` of five identical tiles — poster, front,
        back, left, right — which told the operator nothing about which image
        does the work. The poster is the catalogue thumbnail: it is the only one
        a retailer sees before deciding to open the product at all. It gets the
        column and the sentence; the rest are supporting shots.
      */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)]">
        <section className="space-y-3">
          {poster}
          <PosterNote>
            The one image a retailer sees before they open the product. Everything else here
            is seen only after they have.
          </PosterNote>
        </section>

        <div className="space-y-5">
          <section className="space-y-3">
            <SectionHead title="Product shots" caption="Optional, but the pair sells the item" />
            <div className={TILE_GRID}>
              {NAMED_SLOTS.map(({ key, label, hint, position }) => (
                <MediaTile
                  key={key}
                  label={label}
                  hint={hint}
                  slot={productMedia[key]}
                  purpose={`product:${key}`}
                  position={position}
                  mediaType="image"
                  onUpdate={(p) => setProductMediaSlot(key, p)}
                  onClear={() => setProductMediaSlot(key, { localUri: '', uploadedUrl: '' })}
                />
              ))}
            </div>
          </section>

          {/* Detail shots — optional, capped, and counted so the cap is visible
              before the operator hits it rather than as a control that vanishes. */}
          <section className="space-y-3">
            <SectionHead
              title="Detail shots"
              caption={`${productMedia.more.length} of ${MAX_GALLERY} · optional`}
            />
            <div className={TILE_GRID}>
              {productMedia.more.map((slot, i) => (
                <MediaTile
                  key={i}
                  label={`Detail ${i + 1}`}
                  showLabel={false}
                  slot={slot}
                  purpose="product:more"
                  position={3 + i}
                  mediaType="image"
                  onUpdate={(p) => setProductMoreSlot(i, p)}
                  onClear={() => removeProductMoreSlot(i)}
                />
              ))}

              {productMedia.more.length < MAX_GALLERY && (
                <AddTile label="Add image" onClick={() => addProductMoreSlots([emptySlot()])} />
              )}
            </div>
          </section>

          <section className="space-y-3">
            <SectionHead title="Video" caption="One clip · optional" />
            {/* showLabel off: the heading above already says "Video", and this
                tile printing it again is exactly the duplicate the old layout
                shipped. */}
            <div className="max-w-sm">
              <MediaTile
                label="Video"
                showLabel={false}
                shape="video"
                slot={productMedia.video}
                purpose="product:video"
                position={0}
                mediaType="video"
                onUpdate={(p) => setProductVideoSlot(p)}
                onClear={() => setProductVideoSlot({ localUri: '', uploadedUrl: '' })}
              />
            </div>
          </section>
        </div>
      </div>
      {beautifyReview}
    </div>
  );
}
