import type { Order, PaymentRecord } from '@/src/types/domain';

export interface WholesalerStats {
  totalOrders?: number;
  totalPayout?: number;
  rating?: number;
  dispatchSpeed?: string;
}

/** Order history — wire when backend endpoint exists */
export async function listWholesalerOrders(_wholesalerId: string): Promise<Order[]> {
  return [];
}

/** Payout history — wire when backend endpoint exists */
export async function listWholesalerPayouts(_wholesalerId: string): Promise<PaymentRecord[]> {
  return [];
}

/** Dashboard stats — wire when backend endpoint exists */
export async function getWholesalerStats(_wholesalerId: string): Promise<WholesalerStats | null> {
  return null;
}

export interface WholesalerDecisionOrders {
  accepted: Order[];
  rejected: Order[];
}

/** Accepted/rejected order decisions — wire when backend endpoint exists */
export async function listWholesalerDecisionOrders(
  _wholesalerId: string,
): Promise<WholesalerDecisionOrders> {
  return { accepted: [], rejected: [] };
}

export interface UploadWholesalerAssetResult {
  fileUrl: string;
}

/** File upload — wire when admin storage API exists */
export async function uploadWholesalerAsset(
  _wholesalerId: string,
  _file: File,
  _purpose: 'logo' | 'document',
): Promise<UploadWholesalerAssetResult> {
  throw new Error('File upload API is not connected yet.');
}
