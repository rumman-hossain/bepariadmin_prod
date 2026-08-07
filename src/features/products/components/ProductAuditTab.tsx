/**
 * The audit trail — who moved this product, when, and why.
 *
 * The module has recorded every transition with its actor and reason since
 * PM-5, and until now nothing displayed it. That is the whole accountability
 * record of the catalogue: a rejection's reason lives here and nowhere else
 * once the product has moved on.
 */
import { Timeline, type TimelineEvent } from '@/src/components/data/Timeline';
import { Text } from '@/src/components/data';
import { EmptyState } from '@/src/components/feedback';
import { useProductAuditQuery } from '../queries';
import type { ProductHistoryEntry } from '@/src/api/adminProducts';
import type { BadgeTone } from '@/src/components/data/Value';

/** Verb → how it should read and feel in the stream. */
const ACTION: Record<string, { title: string; tone: BadgeTone }> = {
  submit: { title: 'Submitted for review', tone: 'warn' },
  approve: { title: 'Approved', tone: 'ok' },
  reject: { title: 'Rejected', tone: 'bad' },
  publish: { title: 'Published to retailers', tone: 'ok' },
  take_down: { title: 'Taken down', tone: 'bad' },
  'take-down': { title: 'Taken down', tone: 'bad' },
  request_deletion: { title: 'Deletion requested by the supplier', tone: 'warn' },
  stock: { title: 'Stock adjusted', tone: 'note' },
};

function toEvent(entry: ProductHistoryEntry, index: number): TimelineEvent {
  const known = ACTION[entry.action?.toLowerCase() ?? ''];
  return {
    id: `${entry.createdAt}-${index}`,
    /*
     * An unrecognised action is shown as itself rather than dropped. A gap in
     * an audit trail is worse than an ugly row: it reads as "nothing happened",
     * which is the one thing an audit trail must never say falsely.
     */
    title: known?.title ?? entry.action ?? 'Unknown action',
    at: entry.createdAt,
    actor: [entry.actorRole, entry.actorId].filter(Boolean).join(' · ') || undefined,
    tone: known?.tone ?? 'neutral',
    detail: entry.reason ? (
      <span className="block border-l-2 border-bad-border bg-sheet-2 px-2.5 py-1.5 text-xs text-ink-2">
        “{entry.reason}”
      </span>
    ) : entry.from && entry.to ? (
      <Text variant="caption">
        {entry.from} → {entry.to}
      </Text>
    ) : undefined,
  };
}

export function ProductAuditTab({ productId }: { productId: string }) {
  const { data, isPending, error } = useProductAuditQuery(productId);

  if (isPending) {
    return (
      <div className="flex flex-col gap-2" aria-label="Loading history">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-10 animate-pulse rounded-md bg-sheet-2" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Text as="p" variant="secondary" className="text-bad">
        The history could not be loaded.
      </Text>
    );
  }

  const entries = data ?? [];

  if (entries.length === 0) {
    return (
      <EmptyState
        title="No recorded history"
        message="Transitions are recorded from the moment a product is submitted. A product still in draft has none."
      />
    );
  }

  // Newest first: the last thing that happened is the thing being asked about.
  const events = [...entries]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map(toEvent);

  return <Timeline events={events} />;
}
