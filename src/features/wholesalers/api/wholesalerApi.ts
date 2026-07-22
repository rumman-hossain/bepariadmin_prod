/**
 * Wholesaler API Service
 */

import { request } from '@/src/api/client';
import { hashPassword } from '@/src/auth/passwordHasher';
import type { Wholesaler } from '@/src/types/domain';
import type { WholesalerFilters } from '../types';
import type { WholesalerFormData } from '../schemas/wholesalerSchema';
import {
  wholesalerDetailResponseSchema,
  wholesalerListResponseSchema,
  type WholesalerProfilePayload,
} from '../schemas/wholesalerApiSchema';
import { assertOk, parseApiError, WholesalerApiError } from './errors';
import { DEFAULT_COMMISSION_RATE } from '../constants';

function docTypeFromName(name: string): string {
  if (name === 'Trade License') return 'trade_license';
  if (name === 'TIN Certificate') return 'tin';
  if (name === 'VAT Registration') return 'vat';
  if (name === 'Owner NID Photo') return 'nid';
  return 'other';
}

function mapStatus(s: string): Wholesaler['status'] {
  switch (s.toUpperCase()) {
    case 'ACTIVE':
    case 'APPROVED':
      return 'Active';
    case 'INIT':
    case 'REVIEW':
    case 'PENDING_REVIEW':
    case 'STORE_CREATED':
    case 'RESUBMIT_REQUIRED':
      return 'Review';
    case 'REJECTED':
      return 'Rejected';
    case 'SUSPENDED':
      return 'Suspended';
    default:
      return 'Review';
  }
}

function formatDate(value: unknown): string | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  return undefined;
}

export function mapProfileToWholesaler(profile: WholesalerProfilePayload | Record<string, unknown>): Wholesaler {
  const p = profile as Record<string, unknown>;
  const rawAddresses = Array.isArray(p.addresses) ? (p.addresses as Record<string, unknown>[]) : [];
  const primaryAddress =
    rawAddresses.find((a) => a.isDefault || a.addressType === 'primary') ?? rawAddresses[0];
  const districtFromAddresses = (addr: Record<string, unknown> | undefined) => {
    const d = addr?.district ?? addr?.District;
    return typeof d === 'string' ? d.trim() : '';
  };
  const locationDistrict =
    districtFromAddresses(primaryAddress) ||
    rawAddresses.map((a) => districtFromAddresses(a)).find((d) => d.length > 0) ||
    '';

  const rawBanks = Array.isArray(p.bankDetails) ? (p.bankDetails as Record<string, unknown>[]) : [];
  const primaryBank = rawBanks.find((b) => b.isDefault) ?? rawBanks[0];

  const rawWallets = Array.isArray(p.bkashWallets) ? (p.bkashWallets as Record<string, unknown>[]) : [];
  const primaryWallet = rawWallets.find((w) => w.isDefault) ?? rawWallets[0];

  const categoryStr = (p.category as string) || '';

  const addresses = rawAddresses.map((a) => ({
    id: a.id as string | undefined,
    addressType: (a.addressType as 'primary' | 'warehouse' | 'return' | 'billing') || 'primary',
    division: a.division as string | undefined,
    district: (a.district as string) || '',
    postalCode: (a.postalCode as string) || '',
    addressLine: (a.addressLine as string) || '',
    isDefault: !!a.isDefault,
  }));

  const bankDetailsList = rawBanks.map((b) => ({
    id: b.id as string | undefined,
    bankName: (b.bankName as string) || '',
    accountName: (b.accountName as string) || '',
    accountNumber: (b.accountNumber as string) || '',
    branch: (b.branch as string) || '',
    routing: (b.routing as string) || '',
    isDefault: !!b.isDefault,
  }));

  const digitalWallets = rawWallets.map((w) => ({
    id: w.id as string | undefined,
    walletType: (w.walletType as 'bkash' | 'nagad' | 'rocket' | 'upay') || 'bkash',
    accountNumber: (w.accountNumber as string) || '',
    isDefault: !!w.isDefault,
  }));

  const rawDocs = Array.isArray(p.documents) ? (p.documents as Record<string, unknown>[]) : [];
  const documents = rawDocs.map((d) => ({
    id: d.id as string | undefined,
    name: (d.docName as string) || '',
    date: formatDate(d.createdAt),
    status: (d.status as string) || 'Pending',
    fileUrl: (d.fileUrl as string) || undefined,
  }));

  return {
    id: p.id as string,
    code: (p.code as string) || undefined,
    companyName: ((p.companyName ?? p.shopName ?? p.name) as string) || '',
    category: categoryStr,
    location: locationDistrict,
    status: mapStatus((p.status as string) || 'INIT'),
    createdAt: formatDate(p.createdAt),
    ownerName: (p.name as string) || '',
    mobile: (p.phone as string) || '',
    email: (p.email as string) || undefined,
    address: (primaryAddress?.addressLine as string) || undefined,
    logoUrl: sanitizeLogoUrlForApi((p.logoUrl as string) || undefined),
    digitalWallet: primaryWallet
      ? {
          walletType: (primaryWallet.walletType as string) || 'bkash',
          accountNumber: (primaryWallet.accountNumber as string) || '',
        }
      : undefined,
    commissionRate: typeof p.margin === 'number' ? p.margin : DEFAULT_COMMISSION_RATE,
    bankDetails: primaryBank
      ? {
          bankName: primaryBank.bankName as string,
          accountName: primaryBank.accountName as string,
          accountNumber: primaryBank.accountNumber as string,
          branch: (primaryBank.branch as string) || '',
          routing: (primaryBank.routing as string) || '',
        }
      : undefined,
    documents,
    addresses,
    bankDetailsList,
    digitalWallets,
  };
}

/** Strip client-only preview URLs before sending to API */
export function sanitizeLogoUrlForApi(url: string | undefined): string {
  if (!url) return '';
  if (url.startsWith('data:')) return '';
  if (url.startsWith('mock-gcs://')) return '';
  return url;
}

function buildUpdatePayload(dto: WholesalerFormData): Record<string, unknown> {
  return {
    name: dto.ownerName,
    shopName: dto.companyName,
    companyName: dto.companyName,
    phone: dto.mobile,
    category: dto.categories.join(', '),
    margin: dto.commissionRate ?? DEFAULT_COMMISSION_RATE,
    logoUrl: sanitizeLogoUrlForApi(dto.logoUrl),
    addresses: (dto.addresses || []).map((a) => ({
      addressType: a.addressType,
      division: a.division || '',
      district: a.district,
      postalCode: a.postalCode,
      addressLine: a.addressLine,
      isDefault: a.isDefault,
    })),
    bkashWallets: (dto.digitalWallets || []).map((w) => ({
      walletType: w.walletType,
      accountNumber: w.accountNumber,
      isDefault: w.isDefault,
    })),
    bankDetails: (dto.bankDetailsList || []).map((b) => ({
      bankName: b.bankName,
      accountName: b.accountName,
      accountNumber: b.accountNumber,
      branch: b.branch || '',
      routing: b.routing || '',
      isDefault: b.isDefault,
    })),
    documents: (dto.documents || [])
      .filter((d) => d.fileUrl && !d.fileUrl.startsWith('mock-gcs://'))
      .map((d) => ({
        docType: docTypeFromName(d.name),
        docName: d.name,
        status: (d.status || 'pending').toLowerCase(),
        fileUrl: d.fileUrl || '',
      })),
  };
}

export async function listWholesalers(
  filters?: WholesalerFilters,
  options?: { bustCache?: boolean },
): Promise<Wholesaler[]> {
  const searchParams = new URLSearchParams();
  if (filters?.search) searchParams.set('search', filters.search);
  if (filters?.category && filters.category !== 'All') searchParams.set('category', filters.category);
  if (filters?.location && filters.location !== 'All') searchParams.set('location', filters.location);
  if (options?.bustCache) searchParams.set('_', String(Date.now()));

  const query = searchParams.toString();
  const res = await request<unknown>(
    'GET',
    `/api/v1/admin/wholesalers${query ? `?${query}` : ''}`,
    { auth: true },
  );

  assertOk(res);

  const raw = res.data;
  let profiles: WholesalerProfilePayload[] = [];

  if (Array.isArray(raw)) {
    profiles = raw as WholesalerProfilePayload[];
  } else {
    const parsed = wholesalerListResponseSchema.safeParse(raw);
    if (!parsed.success) {
      throw new WholesalerApiError('Invalid wholesaler list received from server', res.status);
    }
    profiles = parsed.data.data;
  }

  return profiles.map((p) => mapProfileToWholesaler(p));
}

export async function resetWholesalerPassword(
  wholesalerId: string,
  newPasswordHash: string,
): Promise<void> {
  const res = await request<{ data?: string; message?: string }>(
    'POST',
    `/api/v1/admin/wholesalers/${encodeURIComponent(wholesalerId)}/reset-password`,
    { auth: true, body: { new_password_hash: newPasswordHash } },
  );
  assertOk(res);
}

export async function getWholesaler(id: string): Promise<Wholesaler> {
  const res = await request<unknown>(
    'GET',
    `/api/v1/admin/wholesalers/${encodeURIComponent(id)}`,
    { auth: true },
  );

  assertOk(res);

  const parsed = wholesalerDetailResponseSchema.safeParse(res.data);
  const profile = parsed.success
    ? parsed.data.data
    : ((res.data as Record<string, unknown>)?.data as WholesalerProfilePayload) ??
      (res.data as WholesalerProfilePayload);

  if (!profile || typeof profile !== 'object' || !('id' in profile)) {
    throw new WholesalerApiError('Invalid wholesaler detail received from server', res.status);
  }

  return mapProfileToWholesaler(profile);
}

export async function createWholesaler(dto: WholesalerFormData): Promise<Wholesaler> {
  const passwordHash = dto.password
    ? await hashPassword(dto.password, dto.email.toLowerCase().trim())
    : '';

  const fullPayload = {
    email: dto.email,
    password_hash: passwordHash,
    name: dto.ownerName,
    shopName: dto.companyName,
    companyName: dto.companyName,
    phone: dto.mobile,
    category: dto.categories.join(', '),
    margin: dto.commissionRate ?? DEFAULT_COMMISSION_RATE,
    logoUrl: sanitizeLogoUrlForApi(dto.logoUrl),
    addresses: (dto.addresses || []).map((a) => ({
      addressType: a.addressType,
      division: a.division || '',
      district: a.district,
      postalCode: a.postalCode,
      addressLine: a.addressLine,
      isDefault: a.isDefault,
    })),
    bankDetails: (dto.bankDetailsList || []).map((b) => ({
      bankName: b.bankName,
      accountName: b.accountName,
      accountNumber: b.accountNumber,
      branch: b.branch || '',
      routing: b.routing || '',
      isDefault: b.isDefault,
    })),
    bkashWallets: (dto.digitalWallets || []).map((w) => ({
      walletType: w.walletType,
      accountNumber: w.accountNumber,
      isDefault: w.isDefault,
    })),
    documents: (dto.documents || [])
      .filter((d) => d.fileUrl && !d.fileUrl.startsWith('mock-gcs://'))
      .map((d) => ({
        docType: docTypeFromName(d.name),
        docName: d.name,
        status: (d.status || 'pending').toLowerCase(),
        fileUrl: d.fileUrl || '',
      })),
  };

  const res = await request<{ data?: Record<string, unknown> }>(
    'POST',
    '/api/v1/auth/admin/create-wholesaler',
    { auth: true, body: fullPayload },
  );

  if (!res.ok) {
    throw parseApiError(res);
  }

  const wholesalerId = res.data?.data?.id as string | undefined;
  if (!wholesalerId) {
    throw new WholesalerApiError(
      'Supplier onboarded but server returned an incomplete response. Refresh the list.',
      res.status,
    );
  }

  return getWholesaler(wholesalerId);
}

export async function updateWholesaler(id: string, dto: WholesalerFormData): Promise<Wholesaler> {
  const res = await request<Record<string, unknown>>(
    'PATCH',
    `/api/v1/admin/wholesalers/${encodeURIComponent(id)}`,
    { auth: true, body: buildUpdatePayload(dto) },
  );

  if (!res.ok) {
    throw parseApiError(res);
  }

  return getWholesaler(id);
}

export async function updateWholesalerMargin(id: string, margin: number): Promise<Wholesaler> {
  const res = await request<Record<string, unknown>>(
    'PATCH',
    `/api/v1/admin/wholesalers/${encodeURIComponent(id)}`,
    { auth: true, body: { margin } },
  );

  if (!res.ok) {
    throw parseApiError(res);
  }

  return getWholesaler(id);
}

async function postAction(path: string, body?: Record<string, unknown>): Promise<void> {
  const res = await request<unknown>('POST', path, { auth: true, body });
  assertOk(res);
}

export async function approveWholesaler(id: string, _reviewedBy: string): Promise<Wholesaler> {
  await postAction(`/api/v1/admin/wholesalers/${encodeURIComponent(id)}/approve`, {});
  return getWholesaler(id);
}

export async function rejectWholesaler(
  id: string,
  _reviewedBy: string,
  reason: string,
): Promise<Wholesaler> {
  await postAction(`/api/v1/admin/wholesalers/${encodeURIComponent(id)}/reject`, { reason });
  return getWholesaler(id);
}

export async function suspendWholesaler(
  id: string,
  _reviewedBy: string,
  reason: string,
): Promise<Wholesaler> {
  await postAction(`/api/v1/admin/wholesalers/${encodeURIComponent(id)}/suspend`, { reason });
  return getWholesaler(id);
}

export async function unsuspendWholesaler(id: string, _reviewedBy: string): Promise<Wholesaler> {
  await postAction(`/api/v1/admin/wholesalers/${encodeURIComponent(id)}/unsuspend`, {});
  return getWholesaler(id);
}

export async function requestResubmitWholesaler(
  id: string,
  _reviewedBy: string,
  reason: string,
): Promise<Wholesaler> {
  await postAction(`/api/v1/admin/wholesalers/${encodeURIComponent(id)}/request-resubmit`, { reason });
  return getWholesaler(id);
}
