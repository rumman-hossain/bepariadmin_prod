import { useState } from 'react';
import { Button, Input, Textarea } from '@/src/components/controls';
import { Dialog } from '@/src/components/feedback';
import { Text } from '@/src/components/data';
import type { BeautifyMode, BeautifySide } from '@/src/api/beautify';

/**
 * Beautify ONE image, or correct one that came back wrong.
 *
 * The bar at the top runs every front and back at once, which is right the
 * first time a product is prepared and wrong afterwards: redoing a single bad
 * shot should not regenerate — or re-bill — the eleven that were already fine.
 *
 * It is also the answer to a failure. The old "Try again" button was removed
 * because it never recovered from anything, but a tile that fails still needs
 * a way forward, and the honest one is to change what was asked and ask again.
 * That is this dialog, with a note.
 */

interface Props {
  open: boolean;
  /** "Front", "Red · back" — names the one image this will make. */
  label: string;
  side: BeautifySide;
  /** Pre-fills from the last run so a correction extends it rather than restarting. */
  initialMode?: BeautifyMode;
  initialDescription?: string;
  /** Shown when correcting rather than starting fresh. */
  correcting?: boolean;
  onClose: () => void;
  onConfirm: (mode: BeautifyMode, description: string) => void;
}

/** What this one image will cost, from the same split the server bills on. */
function priceOf(side: BeautifySide, mode: BeautifyMode): string {
  return side === 'front' && mode === 'with_model' ? '$0.07' : '$0.03';
}

export function BeautifyOneDialog({
  open,
  label,
  side,
  initialMode = 'with_model',
  initialDescription = '',
  correcting = false,
  onClose,
  onConfirm,
}: Props) {
  const [mode, setMode] = useState<BeautifyMode>(initialMode);
  const [description, setDescription] = useState(initialDescription);
  const [note, setNote] = useState('');

  /*
   * A BACK is never modelled, so it has no description at all — the server
   * drops one, the prompt has no slot for it, and the database refuses it.
   * Showing the field on a back would offer a control that does nothing.
   */
  const needsModel = side === 'front' && mode === 'with_model';
  const canRun = !needsModel || description.trim().length > 0;

  /*
   * The correction is APPENDED, not substituted. "the hem is cut off" on its
   * own would throw away who the model is; they asked for a change, not a
   * restart. It also lands in the idempotency key, which is what makes the
   * result a new picture rather than the one being complained about.
   */
  const finalDescription = note.trim()
    ? `${description.trim()}${description.trim() ? '. ' : ''}${note.trim()}`
    : description.trim();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="sm"
      title={correcting ? `Correct ${label}` : `Beautify ${label}`}
      isDirty={note.trim().length > 0 || description !== initialDescription}
      discardMessage="What you have written will be lost."
    >
      <div className="space-y-4">
        <div className="flex gap-2">
          <Button
            variant={mode === 'with_model' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setMode('with_model')}
          >
            With model
          </Button>
          <Button
            variant={mode === 'without_model' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setMode('without_model')}
          >
            Without model
          </Button>
        </div>

        {side === 'back' ? (
          <Text variant="caption">
            A back is never put on a model. Only its background changes.
          </Text>
        ) : (
          mode === 'with_model' && (
            <Input
              label="Describe the model"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="young Bangladeshi woman, mid-20s, natural makeup"
              maxLength={300}
            />
          )
        )}

        {correcting && (
          <Textarea
            label="What should change?"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            maxLength={300}
            placeholder="the hem is cut off — show the whole garment"
          />
        )}

        {/* Named before the click. This is the only control here that spends. */}
        <Text variant="caption">
          This generates one image and costs about {priceOf(side, mode)}.
        </Text>

        <div className="flex justify-end gap-3">
          <Button variant="secondary" size="md" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            disabled={!canRun}
            onClick={() => onConfirm(mode, finalDescription)}
          >
            {correcting ? 'Generate again' : 'Generate'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
