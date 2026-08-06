/**
 * Web Upload API Client — port of wholesaleapp upload service.
 */
import { getFreshAccessToken, forceRefreshAccessToken } from '@/src/api/client';
import type {
  CreateDraftRequest,
  CreateDraftResponse,
  CompleteFileRequest,
  CompleteFileResponse,
  PublishDraftRequest,
  PublishDraftResponse,
  GetDraftStatusResponse,
} from './types';
import { UploadError } from './errors';

const CREATE_DRAFT_TIMEOUT_MS = 120_000;
const COMPLETE_FILE_TIMEOUT_MS = 60_000;

/**
 * How much life a token needs before an upload call will use it.
 *
 * Longer than the longest timeout below, so a call cannot start with a valid
 * token and finish with an expired one.
 */
const TOKEN_HEADROOM_SECONDS = 150;

/*
 * These requests build their own headers rather than going through `request()`,
 * because they need per-call timeouts and the raw Response. That is fine — what
 * was not fine is that they also skipped everything `request()` does about token
 * freshness.
 *
 * The old version read `getAccessToken()` and sent whatever it found. Access
 * tokens last fifteen minutes, so an operator who left the add-product flow open
 * and came back to it got `Upload failed (401)` and lost the draft. No expiry
 * check, no refresh, no retry — a second, silently worse auth path beside the
 * good one.
 */
async function authHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = await getFreshAccessToken(TOKEN_HEADROOM_SECONDS);
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function wrapAuth<T>(fn: (headers: Record<string, string>) => Promise<Response>): Promise<T> {
  let response = await fn(await authHeaders());

  // One retry on 401, matching `request()`.
  //
  // The expiry check above cannot catch a session revoked elsewhere — a password
  // change on another device evicts this one immediately, and a token that looks
  // valid locally is already dead. Being told is the only way to find out.
  //
  // Replaying a POST is safe HERE SPECIFICALLY, which is not a general licence:
  // a 401 comes from the auth middleware before the handler runs, so the request
  // did nothing. There is no draft to duplicate and no file to complete twice.
  // Exactly one refresh and one replay; if that fails too, the session is gone
  // and the error stands. The shared AbortController means the retry inherits
  // the original deadline rather than getting a fresh one.
  if (response.status === 401) {
    const refreshed = await forceRefreshAccessToken();
    if (refreshed) {
      response = await fn({
        'Content-Type': 'application/json',
        Authorization: `Bearer ${refreshed}`,
      });
    }
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new UploadError(response.status, (body as { message?: string }).message ?? `Upload failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export class UploadAPIClient {
  async createDraft(request: CreateDraftRequest, draftId?: string): Promise<CreateDraftResponse> {
    const normalized: CreateDraftRequest = {
      ...request,
      files: request.files.map((f) => ({
        ...f,
        contentType: f.contentType === 'image/jpg' ? 'image/jpeg' : f.contentType,
        mediaType: f.mediaType === 'document' ? 'image' : f.mediaType,
      })),
    };
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CREATE_DRAFT_TIMEOUT_MS);
    const url = draftId
      ? `/api/v1/uploads/drafts?draftId=${encodeURIComponent(draftId)}`
      : '/api/v1/uploads/drafts';
    try {
      return await wrapAuth<CreateDraftResponse>((headers) =>
        fetch(url, { method: 'POST', headers, body: JSON.stringify(normalized), signal: controller.signal }),
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async getDraftStatus(draftId: string): Promise<GetDraftStatusResponse> {
    return wrapAuth<GetDraftStatusResponse>((headers) =>
      fetch(`/api/v1/uploads/drafts/${draftId}`, { headers }),
    );
  }

  async completeFile(fileId: string, body: CompleteFileRequest): Promise<CompleteFileResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), COMPLETE_FILE_TIMEOUT_MS);
    try {
      return await wrapAuth<CompleteFileResponse>((headers) =>
        fetch(`/api/v1/uploads/files/${fileId}/complete`, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
          signal: controller.signal,
        }),
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async publishDraft(draftId: string, body: PublishDraftRequest): Promise<PublishDraftResponse> {
    return wrapAuth<PublishDraftResponse>((headers) =>
      fetch(`/api/v1/uploads/drafts/${draftId}/publish`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      }),
    );
  }

  /**
   * Send the bytes to GCS.
   *
   * # Why the parameter is no longer called `resumableUri`
   *
   * It was, and the name was the bug's hiding place. GCS evaluates CORS when a
   * resumable session is INITIATED, and the session URI inherits that decision —
   * later PUTs to `?upload_id=…` are never re-evaluated. The backend initiates
   * those sessions server-to-server with no `Origin` header, so no origin is
   * ever recorded and every browser PUT to one is blocked. The write SUCCEEDS at
   * Google and the browser discards the response: `200 (OK)` alongside
   * `net::ERR_FAILED`, which is what made it look like a bucket misconfiguration
   * for three rounds of CORS edits.
   *
   * A signed PUT is evaluated per request against the bucket's CORS config, so
   * it works. This function no longer cares which kind of URL it is given, and
   * the name says so.
   *
   * # The headers are not optional
   *
   * `contentType` and `sha256` are INSIDE the signature. GCS recomputes it from
   * what actually arrives, so a missing or altered header is a 403
   * `SignatureDoesNotMatch` — not a warning, not a fallback. `Content-Length`
   * is set by the browser and cannot be assigned here at all; assigning it was
   * silently ignored.
   */
  async uploadToGCS(
    uploadUrl: string,
    file: File | Blob,
    contentType: string,
    sha256?: string,
  ): Promise<void> {
    const headers: Record<string, string> = { 'Content-Type': contentType };

    // Only for a signed PUT. A resumable session URI signs nothing, and sending
    // these to one would be extra preflight surface for no benefit.
    if (isSignedUploadUrl(uploadUrl)) {
      // Write-once: the signature binds generation 0, so this URL cannot
      // overwrite an object that already exists.
      headers['x-goog-if-generation-match'] = '0';
      if (sha256) {
        // The checksum the server compares at completion. Signed, so it is the
        // value this upload will be held to.
        headers['x-goog-meta-expected-sha256'] = sha256;
      }
    }

    const response = await fetch(uploadUrl, { method: 'PUT', headers, body: file });
    if (!response.ok) {
      throw new UploadError(response.status, gcsFailureMessage(response.status));
    }
  }
}

/**
 * Is this a V4 signed URL, or a resumable session URI?
 *
 * The two take different headers and the caller cannot tell them apart by
 * shape alone. A signed URL carries the signature in the query string; a
 * resumable session is addressed through `/upload/storage/v1/…?upload_id=`.
 *
 * Exported for tests: sending signed headers to a resumable session, or
 * omitting them from a signed PUT, are both silent failures at the boundary
 * where nothing else can see them.
 */
export function isSignedUploadUrl(url: string): boolean {
  return url.includes('X-Goog-Signature=');
}

/**
 * What went wrong, in terms the operator can act on.
 *
 * 403 from GCS on an upload is almost always the signature, and "GCS upload
 * failed (403)" sends somebody to check permissions they have not touched.
 */
function gcsFailureMessage(status: number): string {
  if (status === 403) {
    return 'The upload link was rejected (403). It may have expired — choose the file again.';
  }
  if (status === 412) {
    // Precondition failed: generation-match. Something is already at that path.
    return 'That file has already been uploaded. Choose it again to start a new upload.';
  }
  return `The file could not be uploaded (${status}).`;
}

/** SHA-256 hex digest of a File */
export async function sha256Hex(file: Blob): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hash = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function randomUUID(): string {
  return crypto.randomUUID();
}
