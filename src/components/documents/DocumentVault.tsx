import React from 'react';
import { Lock, Eye, Download } from 'lucide-react';
import { IconButton } from '@/src/components/controls';
import { Text } from '@/src/components/data';
import { Alert } from '@/src/components/feedback';
import {
  openDocumentUrl,
  isDocumentOpenFailure,
  type DocumentOpenFailure,
  type FetchDocumentUrl,
} from './openDocument';

/**
 * Identity documents, and the two controls that can reach them.
 *
 * These are a shop owner's or supplier's NID, trade licence, TIN and VAT
 * certificate — the papers that would let somebody impersonate them at a bank.
 * They live in a bucket with `public_access_prevention` enforced and no
 * `allUsers` grant, so there is no address that works without being signed.
 *
 * # ONE component, both vaults
 *
 * It started in `features/retailers`. The supplier screen needed the same thing,
 * and copying it would have meant two answers to questions like "what does a
 * document that is still saving look like" — which is exactly how the retailer
 * and supplier document rules had already drifted apart on the server. What
 * differs is the endpoint, so that is what is passed in.
 *
 * # The URL is fetched on click and never kept
 *
 * Not on mount, not into component state, not into an `href` rendered ahead of
 * time. The link is a bearer credential with a ten-minute life: anything that
 * renders one before it is needed leaks it into the DOM, into a screenshot, and
 * into whatever a browser extension can read. Pressing a button asks the server
 * for a fresh one, uses it, and keeps nothing.
 *
 * That is also why these are buttons and not links. A link invites "copy link
 * address", and the thing copied stops working in minutes — which reads as a
 * broken system rather than as the security property it is.
 */

/** The shape both vaults' documents share. */
export interface VaultDocument {
  id: string;
  docType: string;
  hasFile: boolean;
  verifiedByName?: string | null;
  verifiedAt?: string | null;
  /**
   * The review verdict: pending | approved | rejected | removed.
   *
   * OPTIONAL because only suppliers have a per-document review endpoint — the
   * retailer vault renders the same rows without one, and a required field here
   * would force that screen to invent a value it has no source for.
   */
  status?: string;
}

export interface DocumentVaultProps {
  /** The retailer or supplier these documents belong to. */
  subjectId: string;
  documents: VaultDocument[];
  /** Which endpoint mints the link — this is the only thing the two vaults differ by. */
  fetchUrl: FetchDocumentUrl;
  /** Turns a stored doc_type into the words on screen. */
  labelFor: (docType: string) => string;
  /** What to say when there is nothing on file at all. */
  emptyLabel: string;
  /**
   * The section heading, or `null` when the caller already provides one.
   *
   * The supplier screen wraps this in a "Paperwork" panel, which produced two
   * headings for one list — "Paperwork" and then "Documents" directly under it.
   * The expiry caption still renders either way, because somebody who does not
   * know the link dies will paste it into a chat thread regardless of which
   * heading sits above it.
   */
  heading?: string | null;
  /**
   * Extra controls for one row, rendered by the CALLER.
   *
   * Optional and absent by default, because only suppliers have a per-document
   * review endpoint. Baking Approve/Reject into this shared vault would put
   * buttons on the retailer screen that no route can serve — the two vaults have
   * already drifted apart once and this keeps the difference in one place.
   */
  renderRowActions?: (doc: VaultDocument) => React.ReactNode;
}

function DocumentRow({
  subjectId,
  doc,
  fetchUrl,
  labelFor,
  onFailure,
  actions,
}: {
  subjectId: string;
  doc: VaultDocument;
  fetchUrl: FetchDocumentUrl;
  labelFor: (docType: string) => string;
  onFailure: (failure: DocumentOpenFailure | null) => void;
  /** Caller-supplied controls for this row. Absent on the retailer vault. */
  actions?: React.ReactNode;
}) {
  // Tracked per ACTION, so pressing Download does not put the View button in a
  // loading state and leave the operator wondering which one they pressed.
  const [busy, setBusy] = React.useState<'view' | 'download' | null>(null);

  const reach = async (mode: 'view' | 'download') => {
    setBusy(mode);
    onFailure(null);
    try {
      /*
       * openDocumentUrl, not the api call directly: a document added moments ago
       * can still be settling, and it retries once before deciding anything is
       * wrong. `busy` stays set through that, so the button shows the work
       * continuing instead of the screen showing a refusal.
       */
      const url = await openDocumentUrl(fetchUrl, subjectId, doc.id);
      /*
       * `?download=1` asks the proxy for `Content-Disposition: attachment`.
       *
       * The flag is on the request, not the link: an attachment is never
       * rendered, so choosing it can only make the response more inert. One
       * token serves both, and neither the bucket nor the object path appears in
       * either — the URL is a short path on our own domain and the backend
       * streams the bytes.
       *
       * `noopener` stays. Its original reason is gone (the tab is same-origin
       * now, so `window.opener` is no longer a foreign handle) but it costs
       * nothing and the habit is worth more than the byte.
       */
      window.open(
        mode === 'download' ? `${url}?download=1` : url,
        '_blank',
        'noopener,noreferrer',
      );
    } catch (err) {
      onFailure(
        isDocumentOpenFailure(err)
          ? { message: err.message, stillSaving: err.stillSaving }
          : { message: 'That document could not be opened', stillSaving: false },
      );
    } finally {
      setBusy(null);
    }
  };

  const missing = !doc.hasFile;

  return (
    /*
     * WRAPPING, not shrinking.
     *
     * This vault is rendered inside a card in a one-third column — measured at
     * 257px on the supplier screen. With a fixed row the two controls kept
     * their full width, the name column was squeezed to nothing, and every
     * label broke one word per line underneath the buttons.
     *
     * `flex-wrap` plus a floor on the text means the controls drop to their own
     * line instead of landing on the words. It holds at any width, which is the
     * property that was missing — the icons below make today's row fit, but
     * only this stops it breaking again.
     *
     * The floor is 6rem because of an arithmetic mistake worth recording. It
     * was 9rem, which is WIDER than the space a 257px column actually leaves:
     *
     *   255 total − 32 padding − 14 lock − 12 gap − 12 gap − 68 icons = 117
     *
     * A floor above that can never be met, so the row wrapped on every render
     * and the icons sat on their own line — the anti-overlap rule firing
     * constantly instead of only in extremis. 6rem (96px) fits inside 117, so
     * the row stays on one line here, and still wraps if a container ever gets
     * narrower than about 240px.
     */
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-rule-subtle px-4 py-3 last:border-b-0">
      <Lock className="h-3.5 w-3.5 shrink-0 text-ink-4" aria-hidden="true" />
      <div className="min-w-[6rem] flex-1">
        <Text>{labelFor(doc.docType)}</Text>
        <Text as="p" variant="caption">
          {missing
            ? 'Not provided'
            : doc.verifiedByName
              ? `Verified by ${doc.verifiedByName}${doc.verifiedAt ? ` · ${doc.verifiedAt.slice(0, 10)}` : ''}`
              : /*
                 * Just "Uploaded".
                 *
                 * This used to read "Uploaded · nobody has checked it yet",
                 * spelling out what pending means. It cost three lines of wrap
                 * in a narrow column to say something the row already implies:
                 * the alternative branch names a verifier, so its absence IS
                 * "nobody has". The distinction survives; the sentence does not.
                 */
                'Uploaded'}
        </Text>
      </div>
      {/*
        Both controls, or neither. A row with no file offers nothing rather than
        a button that can only fail — the absence IS the answer, and it is
        already spelled out beside it.
      */}
      {!missing && (
        /*
         * Icons, not words.
         *
         * `IconButton` makes `label` REQUIRED and puts it on both `aria-label`
         * and `title` — so the words are not lost, they move to the tooltip and
         * to the screen reader. An icon-only control without a name is
         * announced as "button" and is unusable without sight, which is why
         * this primitive exists rather than a `<Button>` with empty children.
         */
        <div className="flex shrink-0 items-center gap-1">
          <IconButton
            icon={Eye}
            label="View"
            variant="secondary"
            size="sm"
            loading={busy === 'view'}
            disabled={busy !== null}
            onClick={() => reach('view')}
          />
          <IconButton
            icon={Download}
            label="Download"
            variant="ghost"
            size="sm"
            loading={busy === 'download'}
            disabled={busy !== null}
            onClick={() => reach('download')}
          />
        </div>
      )}
      {/*
        Caller-supplied controls, AFTER View and Download and outside the
        `!missing` gate: a supplier's document can need a verdict whether or not
        its object is readable, and the review decision is not a way of reaching
        the file.
      */}
      {actions}
    </div>
  );
}

export function DocumentVault({
  subjectId,
  documents,
  fetchUrl,
  labelFor,
  emptyLabel,
  heading = 'Documents',
  renderRowActions,
}: DocumentVaultProps) {
  const [failure, setFailure] = React.useState<DocumentOpenFailure | null>(null);
  const headingId = React.useId();

  return (
    <section
      className="flex flex-col gap-3"
      {...(heading ? { 'aria-labelledby': headingId } : { 'aria-label': 'Documents' })}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        {heading && (
          <h2 id={headingId} className="text-md font-semibold text-ink">
            {heading}
          </h2>
        )}
        {/*
          The expiry, stated up front rather than discovered when a bookmarked
          link 403s an hour later. The instinct is to hide this and make the list
          look ordinary — but somebody who does not know the link dies will paste
          it into a chat thread and be confused when a colleague cannot open it.
        */}
        <Text variant="caption">Links last ten minutes and only work in this browser.</Text>
      </div>

      {/*
        A document that has not finished saving is a WAIT, not a failure, and it
        is worded and coloured as one. Calling it "could not be opened" sent an
        operator off to re-upload a file that was already on its way in — the
        exact report this distinction exists to prevent.
      */}
      {failure && (
        <Alert
          tone={failure.stillSaving ? 'warn' : 'bad'}
          title={failure.stillSaving ? 'Still saving that document' : 'Could not open that document'}
        >
          {failure.message}
        </Alert>
      )}

      <div className="overflow-hidden rounded-lg border border-rule bg-sheet">
        {documents.length === 0 ? (
          <div className="px-4 py-6">
            <Text variant="secondary">{emptyLabel}</Text>
          </div>
        ) : (
          documents.map((doc) => (
            <DocumentRow
              key={doc.id}
              subjectId={subjectId}
              doc={doc}
              fetchUrl={fetchUrl}
              labelFor={labelFor}
              onFailure={setFailure}
              actions={renderRowActions?.(doc)}
            />
          ))
        )}
      </div>

      <Text variant="caption">
        Images and PDFs, up to 10 MB and 20 MB. Only an administrator and the account itself can
        open these. The file is served through this console — there is no storage address to share,
        and a link forwarded to anyone else stops working.
      </Text>
    </section>
  );
}
