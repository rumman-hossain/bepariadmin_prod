/**
 * The review checklist — the reasoning behind Approve, made legible.
 *
 * An approver is answering "may this go live?", and the answer rests on four or
 * five specific facts that were previously scattered across the page: how many
 * images, whether the margin clears the platform floor, whether the
 * classification is complete, whether any variant is unbuyable.
 *
 * Gathering them beside the images means the decision is made from one place
 * rather than assembled by scrolling. The first item is the SERVER'S actual
 * publish gate; the rest are the checks a careful operator does anyway.
 *
 * Nothing here blocks anything. It informs a judgement — a warning is a thing
 * worth seeing before approving, not a refusal.
 */
import { Text } from '@/src/components/data';
import { cn } from '@/src/design-system/utils/cn';

export type CheckTone = 'ok' | 'warn' | 'bad';

export interface ChecklistItem {
  label: string;
  value: string;
  tone: CheckTone;
  /** One line on what the value means, or what to do about it. */
  note?: string;
}

const MARK: Record<CheckTone, string> = { ok: '✓', warn: '⚠', bad: '✕' };
const MARK_CLASS: Record<CheckTone, string> = {
  ok: 'text-ok',
  warn: 'text-warn',
  bad: 'text-bad',
};

export function ProductReviewChecklist({ items }: { items: ChecklistItem[] }) {
  return (
    <div>
      <Text variant="label">Review checklist</Text>
      <ul className="mt-1.5 divide-y divide-rule-subtle">
        {items.map((item) => (
          <li key={item.label} className="grid grid-cols-[1.25rem_1fr_auto] items-baseline gap-x-2 py-2">
            <span
              aria-hidden="true"
              className={cn('text-sm font-bold leading-snug', MARK_CLASS[item.tone])}
            >
              {MARK[item.tone]}
            </span>
            <span className="text-sm text-ink">{item.label}</span>
            <span className={cn('text-sm font-semibold', MARK_CLASS[item.tone])}>
              {/* Screen readers get the verdict as a word; the glyph is decorative. */}
              <span className="sr-only">{item.tone === 'ok' ? 'Pass: ' : 'Attention: '}</span>
              {item.value}
            </span>
            {item.note && (
              <span className="col-start-2 col-end-4 text-2xs text-ink-3">{item.note}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
