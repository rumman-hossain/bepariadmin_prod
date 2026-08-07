/**
 * The decision rail — what is being asked of the operator, and what they may do.
 *
 * It leads with the VERDICT rather than a row of buttons, because the screen's
 * job is to get one judgement out of a person: "this product needs your review"
 * is the question, and Approve / Reject are the two answers.
 *
 * Only legal verbs appear. The rail mirrors the server's transition table
 * (`LEGAL_VERBS`), so it never offers an action that would come back refused.
 *
 * A verb blocked by a GUARD rather than by the state is shown DISABLED WITH ITS
 * REASON — "Publish needs at least one image" — not hidden. Hiding it answers
 * "why can't I publish?" with silence; disabling it answers with the thing to
 * go and fix.
 */
import { Check, X, Upload, ArrowDownToLine, Pencil } from 'lucide-react';
import { Button } from '@/src/components/controls';
import { Text } from '@/src/components/data';
import { cn } from '@/src/design-system/utils/cn';
import { LEGAL_VERBS, type ProductState, type ProductVerb } from '../types/adminProduct';

interface Props {
  state: ProductState | '';
  imageCount: number;
  /** Rendered under the verdict — "Submitted 2 days ago by Karim Textiles". */
  context?: string;
  busy?: ProductVerb | null;
  onApprove: () => void;
  onReject: () => void;
  onPublish: () => void;
  onTakeDown: () => void;
  onEdit: () => void;
}

/** The heading, in the words of the decision being asked for. */
const VERDICT: Record<ProductState, string> = {
  DRAFT: 'Still being written by the supplier',
  PENDING: 'This product needs your review',
  APPROVED: 'Approved — not yet visible to retailers',
  PUBLIC: 'Live to retailers',
  REJECTED: 'Rejected',
  REMOVED: 'Removed from the catalogue',
};

/**
 * Why a legal-looking verb is unavailable in this state.
 *
 * Distinct from a guard: these explain the STATE MACHINE, so an operator
 * wondering where Approve went is told when it comes back.
 */
const STATE_NOTE: Partial<Record<ProductState, string>> = {
  DRAFT: 'Approve and reject unlock once the supplier submits this.',
  PENDING: 'Publish unlocks after the product is approved.',
  REJECTED: 'Only the supplier can resubmit a rejected product.',
  REMOVED: 'Nothing further can be done to a removed product.',
};

export function ProductActionRail({
  state,
  imageCount,
  context,
  busy,
  onApprove,
  onReject,
  onPublish,
  onTakeDown,
  onEdit,
}: Props) {
  const legal = state ? LEGAL_VERBS[state] : [];
  const can = (v: ProductVerb) => legal.includes(v);

  // The publish gate, checked here so the reason can be stated rather than
  // discovered by pressing the button and reading a 422.
  const publishBlocked = can('publish') && imageCount === 0;
  const stateNote = state ? STATE_NOTE[state] : undefined;

  return (
    <aside
      aria-label="Actions"
      className="sticky top-4 flex flex-col gap-3 rounded-lg border border-rule bg-sheet p-3.5"
    >
      <div>
        <p className="text-sm font-semibold leading-snug text-ink">
          {state ? VERDICT[state] : 'This product is in a state the console does not recognise'}
        </p>
        {context && (
          <Text as="p" variant="caption" className="mt-0.5">
            {context}
          </Text>
        )}
      </div>

      {legal.length > 0 && <hr className="border-rule-subtle" />}

      <div className="flex flex-col gap-2">
        {can('approve') && (
          <Button
            fullWidth
            variant="primary"
            iconLeft={Check}
            loading={busy === 'approve'}
            disabled={Boolean(busy)}
            onClick={onApprove}
          >
            Approve
          </Button>
        )}

        {can('reject') && (
          <Button
            fullWidth
            variant="outline"
            iconLeft={X}
            disabled={Boolean(busy)}
            className="border-bad-border text-bad hover:bg-bad-wash"
            onClick={onReject}
          >
            Reject…
          </Button>
        )}

        {can('publish') && (
          <Button
            fullWidth
            variant="primary"
            iconLeft={Upload}
            loading={busy === 'publish'}
            disabled={Boolean(busy) || publishBlocked}
            onClick={onPublish}
          >
            Publish
          </Button>
        )}

        {can('takeDown') && (
          <Button
            fullWidth
            variant="outline"
            iconLeft={ArrowDownToLine}
            disabled={Boolean(busy)}
            className="border-bad-border text-bad hover:bg-bad-wash"
            onClick={onTakeDown}
          >
            Take down…
          </Button>
        )}
      </div>

      {/* The gate, stated. */}
      {publishBlocked && (
        <p
          className={cn(
            'flex gap-2 rounded-md border border-warn-border bg-warn-wash px-2.5 py-2 text-xs text-warn',
          )}
        >
          <span aria-hidden="true">⚠</span>
          <span>
            <b className="font-semibold">Publish needs at least one image.</b> Retailers see the
            first one as the catalogue thumbnail.
          </span>
        </p>
      )}

      {!publishBlocked && can('publish') && (
        <p className="flex gap-2 rounded-md border border-ok-border bg-ok-wash px-2.5 py-2 text-xs text-ok">
          <span aria-hidden="true">✓</span>
          <span>
            Publish gate clear — {imageCount} image{imageCount === 1 ? '' : 's'} on file.
          </span>
        </p>
      )}

      {stateNote && (
        <p className="flex gap-2 rounded-md border border-mute-border bg-mute-wash px-2.5 py-2 text-xs text-ink-2">
          <span aria-hidden="true">ⓘ</span>
          <span>{stateNote}</span>
        </p>
      )}

      <hr className="border-rule-subtle" />

      <Text variant="label">Always available</Text>
      <Button fullWidth variant="secondary" iconLeft={Pencil} onClick={onEdit}>
        Edit product
      </Button>
    </aside>
  );
}
