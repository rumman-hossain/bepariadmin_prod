import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader, Page, Panel, Row } from '@/src/components/layout/primitives';
import { DataTable, Text, StatusBadge, EmptyValue, Pagination, formatDate } from '@/src/components/data';
import type { Column } from '@/src/components/data';
import { EmptyState, ErrorState, SkeletonPage, Alert } from '@/src/components/feedback';
import { Button, SegmentedControl } from '@/src/components/controls';
import { useAuth } from '@/src/hooks/useAuth';
import {
  useThreads,
  useQueueCounts,
  useClaim,
  useRelease,
  useClose,
  useReopen,
} from '../hooks/useSupport';
import type { Thread } from '../api/messagesApi';

const VIEWS = ['queue', 'mine', 'closed'] as const;
type View = (typeof VIEWS)[number];

const AUDIENCES = ['retailer', 'wholesaler'] as const;
type Audience = (typeof AUDIENCES)[number];

type ThreadRow = Record<string, unknown> & Thread;

/**
 * Messages — the support queue.
 *
 * A retailer or wholesaler writes in; the thread sits unclaimed until a staff
 * member picks it up; that person answers and closes it. Whoever is free
 * answers, so nothing goes unanswered because one person is on leave.
 *
 * **Retailers and wholesalers are separate queues and never mix.** They are
 * different conversations with different people about different things — a
 * retailer chasing a delivery, a supplier chasing a payout. A blended inbox
 * makes the person on the desk context-switch on every row and makes "how long
 * are suppliers waiting" unanswerable.
 *
 * Both waiting counts stay on screen whichever queue is open, because separate
 * queues must not mean an unseen queue.
 *
 * **The message bodies are not here yet, and the screen says so rather than
 * showing an empty thread.** They are Firestore documents — chosen for realtime,
 * which is what a conversation needs — and the write path is waiting on a
 * service account. An empty thread panel would read as "this person wrote
 * nothing", which is the opposite of the truth.
 *
 * **Claim failures are expected, not exceptional.** Two people working one queue
 * will both click Claim on the same row eventually. The server refuses the
 * second with a sentence naming what happened, and that sentence is shown as-is.
 */
export function MessagesPage() {
  const [params, setParams] = useSearchParams();
  const raw = params.get('view');
  const view: View = VIEWS.includes(raw as View) ? (raw as View) : 'queue';
  const rawAudience = params.get('for');
  const audience: Audience = AUDIENCES.includes(rawAudience as Audience)
    ? (rawAudience as Audience)
    : 'retailer';
  const page = Math.max(1, Number(params.get('page') ?? '1') || 1);
  const { user } = useAuth();

  // The three views are the same query with different filters. 'queue' is
  // everything open or assigned; 'mine' narrows to this person; 'closed' is the
  // archive, which the default view deliberately excludes.
  const status = view === 'closed' ? 'closed' : '';
  const assignedTo = view === 'mine' ? 'me' : '';

  const threads = useThreads(audience, status, assignedTo, page);
  const counts = useQueueCounts();
  const claim = useClaim();
  const release = useRelease();
  const close = useClose();
  const reopen = useReopen();
  const [failure, setFailure] = useState<string | null>(null);

  const setParam = (k: string, v: string | null) => {
    const p = new URLSearchParams(params);
    if (v === null) p.delete(k);
    else p.set(k, v);
    if (k === 'view' || k === 'for') p.delete('page');
    setParams(p, { replace: true });
  };

  const run = (m: { mutate: (id: string, o?: object) => void }, id: string) => {
    setFailure(null);
    m.mutate(id, {
      onError: (err: unknown) =>
        setFailure(err instanceof Error ? err.message : 'That could not be done'),
    });
  };

  const busy = claim.isPending || release.isPending || close.isPending || reopen.isPending;

  const columns: Column<ThreadRow>[] = [
    {
      key: 'openedByName',
      header: 'From',
      render: (t) => (
        <div>
          <Text>{t.openedByName}</Text>
          <Text variant="caption">{t.openedByKind}</Text>
        </div>
      ),
    },
    {
      key: 'subject',
      header: 'About',
      render: (t) => (
        <div>
          <Text>{t.subject ?? 'No subject'}</Text>
          {/* The preview is denormalised onto the thread so the queue can be
              scanned without a Firestore read per row. */}
          {t.lastMessage && <Text variant="caption" truncate>{t.lastMessage}</Text>}
        </div>
      ),
    },
    { key: 'status', header: 'Status', render: (t) => <StatusBadge status={t.status} /> },
    {
      key: 'assignedToName',
      header: 'Handled by',
      render: (t) => (t.assignedToName ? <Text>{t.assignedToName}</Text> : <EmptyValue />),
    },
    {
      key: 'createdAt',
      header: 'Opened',
      sortBy: (t) => t.createdAt,
      render: (t) => (
        <Text as="span" variant="secondary">
          <time dateTime={t.createdAt}>{formatDate(t.createdAt)}</time>
        </Text>
      ),
    },
    {
      key: 'action',
      header: '',
      render: (t) => {
        if (t.status === 'closed') {
          return (
            <Button variant="ghost" size="sm" disabled={busy} onClick={() => run(reopen, t.id)}>
              Reopen
            </Button>
          );
        }
        if (t.status === 'open') {
          return (
            <Button variant="primary" size="sm" disabled={busy} onClick={() => run(claim, t.id)}>
              Claim
            </Button>
          );
        }
        // Assigned. Only the holder may release, so only they are offered it —
        // the server refuses anyone else, and offering a control that will be
        // refused teaches people the console is unreliable.
        return (
          <Row gap="sm">
            {t.assignedToId === user?.id && (
              <Button variant="ghost" size="sm" disabled={busy} onClick={() => run(release, t.id)}>
                Release
              </Button>
            )}
            <Button variant="ghost" size="sm" disabled={busy} onClick={() => run(close, t.id)}>
              Close
            </Button>
          </Row>
        );
      },
    },
  ];

  if (threads.isPending) return <SkeletonPage shape="list" />;

  return (
    <Page>
      <PageHeader
        title="Messages"
        subtitle={audience === 'retailer' ? 'Support threads from retailers' : 'Support threads from suppliers'}
        actions={
          <Row gap="sm" wrap>
            <SegmentedControl<Audience>
              label="Queue"
              value={audience}
              onChange={(a) => setParam('for', a)}
              options={[
                {
                  value: 'retailer',
                  // The waiting count rides on the label so the other queue is
                  // visible without leaving this one.
                  label: counts.data
                    ? `Retailers (${counts.data.retailer})`
                    : 'Retailers',
                },
                {
                  value: 'wholesaler',
                  label: counts.data
                    ? `Suppliers (${counts.data.wholesaler})`
                    : 'Suppliers',
                },
              ]}
            />
            <SegmentedControl<View>
            label="View"
            value={view}
            onChange={(v) => setParam('view', v)}
            options={[
              { value: 'queue', label: 'Queue' },
              { value: 'mine', label: 'Mine' },
              { value: 'closed', label: 'Closed' },
              ]}
            />
          </Row>
        }
      />

      {failure && (
        <Alert tone="warn" title="Not done">
          {failure}
        </Alert>
      )}

      <Alert tone="info" title="Message bodies are not connected yet">
        The queue below is real — threads, who opened them, who is handling them. The
        conversation itself lives in Firestore for realtime delivery, and that connection is
        not built. Claiming and closing work; reading and replying do not yet.
      </Alert>

      <Panel flush>
        {threads.isError ? (
          <ErrorState title="The queue could not be loaded" onRetry={() => void threads.refetch()} />
        ) : !threads.data?.data.length ? (
          <EmptyState
            title={
              view === 'mine'
                ? 'Nothing assigned to you in this queue'
                : view === 'closed'
                  ? 'No closed threads'
                  : 'The queue is empty'
            }
            message={
              view === 'queue'
                ? `Nothing opens a ${audience} support thread yet — that app has no route to start one. This queue is empty because none has been opened, not because they have all been answered.`
                : 'Threads appear here as they are handled.'
            }
          />
        ) : (
          <DataTable<ThreadRow>
            data={threads.data.data as ThreadRow[]}
            columns={columns}
            rowKey={(t) => t.id}
            caption="Support queue"
          />
        )}
      </Panel>

      {threads.data && threads.data.meta.total > 25 && (
        <Row justify="between">
          <Text variant="caption">{threads.data.meta.total} threads</Text>
          <Pagination
            page={page}
            pageSize={25}
            total={threads.data.meta.total}
            onPageChange={(p) => setParam('page', p <= 1 ? null : String(p))}
          />
        </Row>
      )}
    </Page>
  );
}
