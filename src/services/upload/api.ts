/**
 * Web Upload API Client — port of wholesaleapp upload service.
 */
import { getAccessToken } from '@/src/api/client';
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

async function authHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function wrapAuth<T>(fn: (headers: Record<string, string>) => Promise<Response>): Promise<T> {
  const response = await fn(await authHeaders());
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

  /** Upload file bytes to GCS resumable URI (web File/Blob) */
  async uploadToGCS(resumableUri: string, file: File | Blob, contentType: string): Promise<void> {
    const response = await fetch(resumableUri, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(file.size),
      },
      body: file,
    });
    if (!response.ok) {
      throw new UploadError(response.status, `GCS upload failed (${response.status})`);
    }
  }
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
