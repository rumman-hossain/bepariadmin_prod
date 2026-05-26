import type { ApiResponse } from '@/src/types/api';

type ErrorBody = {
  error?: { message?: string; code?: string };
  message?: string;
  code?: string;
};

export class WholesalerApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'WholesalerApiError';
    this.status = status;
    this.code = code;
  }
}

export function parseApiError(res: ApiResponse<unknown>): WholesalerApiError {
  const body = res.data as ErrorBody | undefined;
  const code = body?.error?.code ?? body?.code;
  const message =
    body?.error?.message ??
    body?.message ??
    statusToMessage(res.status);
  return new WholesalerApiError(message, res.status, code);
}

export function statusToMessage(status: number): string {
  switch (status) {
    case 401:
      return 'Your session has expired. Please sign in again.';
    case 403:
      return 'You do not have permission to perform this action.';
    case 404:
      return 'Wholesaler not found.';
    case 408:
      return 'Request timed out. Please try again.';
    case 409:
      return 'This record conflicts with an existing supplier.';
    default:
      if (status >= 500) return 'Server error. Please try again later.';
      if (status > 0) return `Request failed (HTTP ${status})`;
      return 'Network error. Check your connection and try again.';
  }
}

export function assertOk(res: ApiResponse<unknown>): void {
  if (!res.ok) {
    throw parseApiError(res);
  }
}

export function toWholesalerApiError(err: unknown): WholesalerApiError {
  if (err instanceof WholesalerApiError) return err;
  if (err instanceof Error) return new WholesalerApiError(err.message, 0);
  return new WholesalerApiError('Something went wrong', 0);
}
