export type DraftState =
  | 'UPLOADING'
  | 'READY'
  | 'PUBLISHING'
  | 'PUBLISHED'
  | 'FAILED'
  | 'EXPIRED';

export type MediaType = 'image' | 'video' | 'document';

export interface FileSpec {
  filename: string;
  contentType: string;
  sizeBytes: number;
  checksum: string;
  mediaType: MediaType;
  position: number;
  purpose: string;
}

export interface CreateDraftRequest {
  purpose: string;
  files: FileSpec[];
}

export interface FileUploadDetails {
  fileId: string;
  signedUrl: string;
  resumableUri: string;
  urlExpires: string;
  gcsBucket: string;
  gcsObjectName: string;
}

export interface Draft {
  id: string;
  wholesalerId: string;
  productId?: string;
  state: DraftState;
  expectedFileCount: number;
  uploadedCount: number;
  version: number;
  lastActivityAt: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

export interface CreateDraftResponse {
  draft: Draft;
  files: FileUploadDetails[];
}

export interface CompleteFileRequest {
  idempotencyKey: string;
  actualSize: number;
  actualChecksum: string;
}

export interface CompleteFileResponse {
  draftId: string;
  draftState: DraftState;
  uploadedCount: number;
}

export interface PublishDraftRequest {
  idempotencyKey: string;
  version: number;
}

export interface MediaAsset {
  id: number;
  cdnUrl: string;
  gcsRawPath: string;
  filename: string;
  mediaType: MediaType;
  purpose: string;
  sortOrder: number;
}

export interface PublishDraftResponse {
  success: boolean;
  state: DraftState;
  message: string;
  mediaAssets?: MediaAsset[];
}

export interface GetDraftStatusResponse {
  draft: Draft;
  files: Array<Record<string, unknown>>;
}
