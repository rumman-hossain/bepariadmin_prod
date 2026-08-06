import { isNotFound } from '@/src/features/retailers/api/retailersApi';

/**
 * Asking for a document link, allowing for one that has only just been saved.
 *
 * # The wait this exists for
 *
 * Pressing View immediately after adding a document could answer "Resource not
 * found" — and the same button worked a minute later. Two things produced that,
 * and only one of them was a bug:
 *
 *   - the screen held document ids the attach had deleted, fixed by refreshing
 *     the detail AFTER the attach rather than after the PATCH; and
 *   - the plain race that remains, where a save lands a moment behind the
 *     refetch it triggered.
 *
 * Nothing can remove the second. What it CAN stop doing is calling it an error:
 * a document that is still being written is a wait, not a loss, and telling an
 * operator their file is missing sends them to re-upload something that is
 * already there.
 *
 * # Why exactly one retry
 *
 * Enough to cover a save settling; short enough that a document which genuinely
 * is not there still gets an answer rather than a spinner. Retrying until it
 * works would turn a real absence into a hang.
 *
 * Only a 404 is retried. A 403 is a decision, not a delay — the operator may not
 * read this document, and waiting will not change that.
 */

/** Long enough for an attach to land, short enough to still feel like an answer. */
export const STILL_SAVING_RETRY_MS = 1500;

export const STILL_SAVING_MESSAGE =
  'This document is still being saved. Try again in a moment.';

export interface DocumentOpenFailure {
  message: string;
  /** True when the document may simply not have finished saving yet. */
  stillSaving: boolean;
}

/**
 * How to ask the server for a link.
 *
 * Passed in rather than imported, because there are two vaults now — retailers
 * and suppliers — with the same behaviour and different endpoints. A module
 * that reached for one of them directly would be a shared component that only
 * half works for the other.
 */
export type FetchDocumentUrl = (subjectId: string, documentId: string) => Promise<{ url: string }>;

export interface OpenDocumentDeps {
  /** Injected so a test does not spend a real second and a half waiting. */
  wait: (ms: number) => Promise<void>;
}

const defaultDeps: OpenDocumentDeps = {
  wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};

/**
 * Returns the document's URL, or throws a failure the screen can word correctly.
 *
 * Throws `DocumentOpenFailure`-shaped errors via `documentOpenFailure`, so the
 * caller can tell "wait a moment" from "you cannot open this".
 */
export async function openDocumentUrl(
  fetchUrl: FetchDocumentUrl,
  subjectId: string,
  documentId: string,
  deps: OpenDocumentDeps = defaultDeps,
): Promise<string> {
  try {
    const { url } = await fetchUrl(subjectId, documentId);
    return url;
  } catch (first) {
    if (!isNotFound(first)) {
      throw failure(messageOf(first, 'That document could not be opened'), false);
    }

    // One more go. The button stays in its loading state through this, so what
    // the operator sees is the thing still working rather than a refusal.
    await deps.wait(STILL_SAVING_RETRY_MS);

    try {
      const { url } = await fetchUrl(subjectId, documentId);
      return url;
    } catch (second) {
      if (isNotFound(second)) {
        throw failure(STILL_SAVING_MESSAGE, true);
      }
      throw failure(messageOf(second, 'That document could not be opened'), false);
    }
  }
}

/** True for the errors this module throws, so a caller can read `stillSaving`. */
export function isDocumentOpenFailure(err: unknown): err is Error & DocumentOpenFailure {
  return err instanceof Error && typeof (err as { stillSaving?: unknown }).stillSaving === 'boolean';
}

function failure(message: string, stillSaving: boolean): Error & DocumentOpenFailure {
  return Object.assign(new Error(message), { message, stillSaving });
}

function messageOf(err: unknown, fallback: string): string {
  return err instanceof Error && err.message.trim() !== '' ? err.message : fallback;
}
