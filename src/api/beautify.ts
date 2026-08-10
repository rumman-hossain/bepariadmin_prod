import { request } from './client';
import type { ApiResponse } from '@/src/types/api';

/**
 * Product image beautification — the client half.
 *
 * The server re-renders a supplier's photograph onto a plain white studio
 * background, optionally placing the garment on a model. One rule covers the
 * whole feature:
 *
 *              With Model                 Without Model
 *   front      model, white background    white background
 *   back       white background           white background
 *
 * A BACK is never modelled, in either mode. That applies to the product's own
 * front/back pair AND to every variation's, so a non-variant product is two
 * images and a five-colour product is twelve.
 */

export type BeautifySide = 'front' | 'back';
export type BeautifyMode = 'with_model' | 'without_model';

/** One generated image, as the server describes it. */
export interface BeautifyJob {
  id: string;
  variationId?: string;
  side: BeautifySide;
  mode: BeautifyMode;
  status: 'pending' | 'ready' | 'committed' | 'failed' | 'discarded';
  /** Proxy path for the generated image. Never a storage URL. */
  previewUrl?: string;
  /** Proxy path for the original, so before/after needs no second request. */
  beforeUrl?: string;
  model: string;
  estCostUsd: number;
  /** True when the server returned an existing image and charged nothing. */
  reused: boolean;
}

export interface RunBeautifyInput {
  productId: string;
  /** Omitted or empty for the product's own front/back pair. */
  variationId?: string;
  side: BeautifySide;
  mode: BeautifyMode;
  /**
   * What the admin typed to describe the model.
   *
   * Sent only for a front in with_model. The server drops it otherwise —
   * a back's prompt has no slot for it — and it forms part of the
   * idempotency key, so editing it and pressing again really does produce a
   * new image rather than returning the previous one.
   */
  modelDescription?: string;
}

/**
 * ONE image per call, not one per product.
 *
 * A twelve-image product at ten to thirty seconds each is minutes of work. As a
 * single request that is past any sane timeout, and the console would learn
 * every result at the very end — so tiles could not land one at a time and the
 * operator would watch a spinner. Per image, each response updates its own
 * tile, and a redo is this same call with the same key.
 */
/**
 * How long one image may take before the client gives up.
 *
 * The default is 15 seconds, which is right for endpoints that answer from a
 * database and wrong for one that waits on an image model. A measured run came
 * back at 14.9s — a tenth of a second inside the limit — so the request
 * aborted, the tile reported failure, and the server finished the work anyway.
 * Three minutes is deliberately generous: a false failure costs an operator a
 * click, a scare and their trust in the feature, and a long wait costs them
 * nothing but time they have already been told to expect.
 */
const GENERATE_TIMEOUT_MS = 180_000;

export async function runBeautify(
  input: RunBeautifyInput,
): Promise<ApiResponse<{ data: BeautifyJob }>> {
  const { productId, ...body } = input;
  return request<{ data: BeautifyJob }>(
    'POST',
    `/api/v1/products/${encodeURIComponent(productId)}/beautify`,
    {
      auth: true,
      body: body as unknown as Record<string, unknown>,
      timeoutMs: GENERATE_TIMEOUT_MS,
    },
  );
}

/** Previews already generated, so a reload does not lose what was paid for. */
export async function listBeautifyJobs(
  productId: string,
): Promise<ApiResponse<{ data: BeautifyJob[] }>> {
  return request<{ data: BeautifyJob[] }>(
    'GET',
    `/api/v1/products/${encodeURIComponent(productId)}/beautify`,
    { auth: true },
  );
}

/**
 * Make the chosen previews the product's images.
 *
 * A pointer swap that spends nothing — the pictures already exist. The
 * originals stay in the bucket and the audit row records what each swap
 * replaced, so this is reversible.
 *
 * Job ids are explicit rather than "apply everything ready", so an operator who
 * redid one tile and left another gets exactly what was on screen.
 */
export async function commitBeautify(
  productId: string,
  jobIds: string[],
): Promise<ApiResponse<{ data: { applied: number } }>> {
  return request<{ data: { applied: number } }>(
    'POST',
    `/api/v1/products/${encodeURIComponent(productId)}/beautify/commit`,
    { auth: true, body: { jobIds } },
  );
}

/** Throw the previews away. The product's images are untouched. */
export async function discardBeautify(
  productId: string,
): Promise<ApiResponse<{ data: { discarded: number } }>> {
  return request<{ data: { discarded: number } }>(
    'DELETE',
    `/api/v1/products/${encodeURIComponent(productId)}/beautify`,
    { auth: true },
  );
}
