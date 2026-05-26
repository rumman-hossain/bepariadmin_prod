/**
 * Wholesaler API Service
 *
 * Uses the centralized HTTP client (src/api/client.ts) for all API calls.
 * Token management (refresh, 401 retry, expiry guards, deduplication)
 * is handled by the shared client — no axios duplication.
 *
 * Backend endpoints:
 *   POST   /api/v1/auth/admin/create-wholesaler   — create (admin)
 *   GET    /api/v1/admin/wholesalers                — list
 *   GET    /api/v1/admin/wholesalers/{id}           — get by ID
 *   PATCH  /api/v1/admin/wholesalers/{id}           — update
 *   POST   /api/v1/admin/wholesalers/{id}/approve   — approve
 *   POST   /api/v1/admin/wholesalers/{id}/reject    — reject
 *   POST   /api/v1/admin/wholesalers/{id}/suspend   — suspend
 *   POST   /api/v1/admin/wholesalers/{id}/unsuspend — activate
 *   POST   /api/v1/admin/wholesalers/{id}/request-resubmit — request resubmission
 */

import { request } from '@/src/api/client';
import { hashPassword } from '@/src/auth/passwordHasher';
import type { Wholesaler } from '@/src/types/domain';
import type {
  //CreateWholesalerDTO,
  //UpdateWholesalerDTO,
  WholesalerFilters,
} from '../types';

// ═══════════════════════════════════════════════════════════════
// API Response Mapping
// ═══════════════════════════════════════════════════════════════

/**
 * Backend WholesalerProfile shape:
 *   id, name, companyName, shopName, phone, email, category, margin,
 *   referralCode, status, logoUrl, createdAt, updatedAt
 *   addresses: [{id, addressType, division, district, postalCode, addressLine, isDefault}]
 *   bankDetails: [{id, bankName, accountName, accountNumber, branch, routing, isDefault}]
 *   bkashWallets: [{id, walletType, accountNumber, isDefault}]
 *   documents: [{id, docType, docName, fileUrl, status, verifiedBy, verifiedAt}]
 */
function mapProfileToWholesaler(profile: Record<string, unknown>): Wholesaler {
  const rawAddresses = Array.isArray(profile.addresses) ? (profile.addresses as Record<string, unknown>[]) : [];
  const primaryAddress = rawAddresses.find(a => a.isDefault || a.addressType === 'primary') ?? rawAddresses[0];

  const rawBanks = Array.isArray(profile.bankDetails) ? (profile.bankDetails as Record<string, unknown>[]) : [];
  const primaryBank = rawBanks.find(b => b.isDefault) ?? rawBanks[0];

  const rawWallets = Array.isArray(profile.bkashWallets) ? (profile.bkashWallets as Record<string, unknown>[]) : [];
  const primaryWallet = rawWallets.find(w => w.isDefault) ?? rawWallets[0];

  // Split comma-separated category string
  const categoryStr = (profile.category as string) || '';

  const addresses = rawAddresses.map(a => ({
    id: a.id as string | undefined,
    addressType: (a.addressType as 'primary' | 'warehouse' | 'return' | 'billing') || 'primary',
    division: a.division as string | undefined,
    district: (a.district as string) || 'Dhaka',
    postalCode: (a.postalCode as string) || '',
    addressLine: (a.addressLine as string) || '',
    isDefault: !!a.isDefault,
  }));

  const bankDetailsList = rawBanks.map(b => ({
    id: b.id as string | undefined,
    bankName: (b.bankName as string) || '',
    accountName: (b.accountName as string) || '',
    accountNumber: (b.accountNumber as string) || '',
    branch: (b.branch as string) || '',
    routing: (b.routing as string) || '',
    isDefault: !!b.isDefault,
  }));

  const digitalWallets = rawWallets.map(w => ({
    id: w.id as string | undefined,
    walletType: (w.walletType as 'bkash' | 'nagad' | 'rocket' | 'upay') || 'bkash',
    accountNumber: (w.accountNumber as string) || '',
    isDefault: !!w.isDefault,
  }));

  const rawDocs = Array.isArray(profile.documents) ? (profile.documents as Record<string, unknown>[]) : [];
  const documents = rawDocs.map(d => ({
    id: d.id as string | undefined,
    name: (d.docName as string) || '',
    date: (d.createdAt as string) || '',
    status: (d.status as string) || 'Pending',
    fileUrl: (d.fileUrl as string) || undefined,
  }));

  return {
    id: profile.id as string,
    companyName: (profile.companyName ?? profile.name) as string,
    category: categoryStr, // Keep for backward compatibility
    location: (primaryAddress?.district as string) || 'Dhaka',
    status: mapStatus((profile.status as string) || 'INIT'),
    acceptanceRate: 100,
    dispatchSpeed: '24h',
    riskScore: undefined,
    createdAt: (profile.createdAt as string) || undefined,
    ownerName: (profile.name as string) || '',
    mobile: (profile.phone as string) || '',
    email: (profile.email as string) || undefined,
    address: (primaryAddress?.addressLine as string) || undefined, // Keep for backward compatibility
    logoUrl: (profile.logoUrl as string) || undefined,
    digitalWallet: primaryWallet
      ? {
          walletType: (primaryWallet.walletType as string) || 'bkash',
          accountNumber: (primaryWallet.accountNumber as string) || '',
        }
      : { walletType: 'bkash', accountNumber: '' },
    commissionRate: (profile.margin as number) || undefined,
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

/**
 * Map backend status string to frontend union type.
 * Backend: ACTIVE | INIT | REVIEW | REJECTED | SUSPENDED
 * Frontend: 'Active' | 'Review' | 'Suspended'
 */
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
    case 'SUSPENDED':
      return 'Suspended';
    default:
      return 'Review';
  }
}

// ═══════════════════════════════════════════════════════════════
// API Methods
// ═══════════════════════════════════════════════════════════════

/**
 * List all wholesalers with optional filters.
 * GET /api/v1/admin/wholesalers
 */
export async function listWholesalers(
  filters?: WholesalerFilters,
): Promise<Wholesaler[]> {
  const searchParams = new URLSearchParams();
  if (filters?.search) searchParams.set('search', filters.search);
  if (filters?.category && filters.category !== 'All')
    searchParams.set('category', filters.category);
  if (filters?.location && filters.location !== 'All')
    searchParams.set('location', filters.location);

  const query = searchParams.toString();
  const res = await request<Record<string, unknown>>(
    'GET',
    `/api/v1/admin/wholesalers${query ? `?${query}` : ''}`,
    { auth: true },
  );

  const data = res.data;
  const profiles: Record<string, unknown>[] = Array.isArray(res.data)
    ? (res.data as unknown as Record<string, unknown>[])
    : ((data as Record<string, unknown>)?.data as Record<string, unknown>[]) ??
      ((data as Record<string, unknown>)?.wholesalers as Record<string, unknown>[]) ?? [];

  return profiles.map(mapProfileToWholesaler);
}

/**
 * Get a single wholesaler by ID.
 * GET /api/v1/admin/wholesalers/{id}
 */
export async function getWholesaler(id: string): Promise<Wholesaler> {
  const res = await request<Record<string, unknown>>(
    'GET',
    `/api/v1/admin/wholesalers/${encodeURIComponent(id)}`,
    { auth: true },
  );
  const data = res.data as Record<string, unknown> | undefined;
  const profile = (data?.data as Record<string, unknown>) ?? data ?? {};
  return mapProfileToWholesaler(profile);
}

/**
 * Create a new wholesaler (admin-initiated).
 *
 * POST /api/v1/auth/admin/create-wholesaler
 *
 * Current backend request shape:
 * {
 *   "email": "supplier@example.com",
 *   "password_hash": "pbkdf2v2:<64 hex chars>"
 * }
 *
 * Password is PBKDF2-SHA256 hashed in-browser using email as salt
 * (same algorithm as mobile app). Plaintext password NEVER leaves the browser.
 *
 * Backend creates auth account → returns 201.
 * Then PATCH profile details via updateWholesaler().
 */
import type { WholesalerFormData } from '../schemas/wholesalerSchema';

export async function createWholesaler(
  dto: WholesalerFormData,
): Promise<Wholesaler> {
  // Step 0: Pre-check duplicate email/mobile across active wholesaler list
  const allWholesalers = await listWholesalers();
  
  const emailDuplicate = allWholesalers.find(
    (w) => (w.email || '').toLowerCase().trim() === dto.email.toLowerCase().trim()
  );
  if (emailDuplicate) {
    throw new Error(`The email address "${dto.email}" is already registered to an onboarded supplier. Duplicate emails are not allowed.`);
  }

  const cleanDtoMobile = dto.mobile.replace(/\D/g, '');
  const mobileDuplicate = allWholesalers.find(
    (w) => (w.mobile || '').replace(/\D/g, '') === cleanDtoMobile
  );
  if (mobileDuplicate) {
    throw new Error(`The mobile number "${dto.mobile}" is already registered to an onboarded supplier. Duplicate mobile numbers are not allowed.`);
  }

  // Step 1: Create auth account & profile (now in a single backend transaction!)
  const passwordHash = dto.password
    ? await hashPassword(dto.password, dto.email.toLowerCase().trim())
    : '';

  // Pack the full request shape matching our new backend AdminCreateWholesalerRequest struct!
  const fullPayload = {
    email: dto.email,
    password_hash: passwordHash,
    name: dto.ownerName,
    shopName: dto.companyName,
    companyName: dto.companyName,
    phone: dto.mobile,
    category: dto.categories.join(', '),
    margin: dto.commissionRate ?? 9.5,
    logoUrl: dto.logoUrl || '',
    addresses: (dto.addresses || []).map(a => ({
      addressType: a.addressType,
      division: a.division || '',
      district: a.district,
      postalCode: a.postalCode,
      addressLine: a.addressLine,
      isDefault: a.isDefault,
    })),
    bankDetails: (dto.bankDetailsList || []).map(b => ({
      bankName: b.bankName,
      accountName: b.accountName,
      accountNumber: b.accountNumber,
      branch: b.branch || '',
      routing: b.routing || '',
      isDefault: b.isDefault,
    })),
    bkashWallets: (dto.digitalWallets || []).map(w => ({
      walletType: w.walletType,
      accountNumber: w.accountNumber,
      isDefault: w.isDefault,
    })),
    documents: (dto.documents || []).map((d) => ({
      docType: d.name === 'Trade License' ? 'trade_license'
             : d.name === 'TIN Certificate' ? 'tin'
             : d.name === 'VAT Registration' ? 'vat'
             : d.name === 'Owner NID Photo' ? 'nid'
             : 'other',
      docName: d.name,
      status: d.status || 'pending',
      fileUrl: d.fileUrl || '',
    })),
  };

  const res1 = await request<{ data: Record<string, unknown> }>(
    'POST',
    '/api/v1/auth/admin/create-wholesaler',
    {
      auth: true,
      body: fullPayload,
    },
  );

  if (!res1.ok) {
    type ErrorResponse = { error?: { message?: string }; message?: string };
    const errObj = res1.data as ErrorResponse | undefined;
    const errMsg = errObj?.error?.message ?? errObj?.message ?? `Failed to onboard supplier (HTTP ${res1.status})`;
    throw new Error(errMsg);
  }

  // Retrieve the newly created wholesaler ID from the single-step response
  const responseData = res1.data?.data;
  const wholesalerId = responseData?.id as string | undefined;

  if (!wholesalerId) {
    throw new Error('Supplier onboarded successfully, but backend returned an incomplete session state. Please refresh the page.');
  }

  // Step 2: Fetch the full profile (just to map it to the frontend's expected Wholesaler structure)
  return getWholesaler(wholesalerId);
}

/**
 * Update an existing wholesaler.
 * PATCH /api/v1/admin/wholesalers/{id}
 */
export async function updateWholesaler(
  id: string,
  dto: WholesalerFormData,
): Promise<Wholesaler> {
  // Step 0: Pre-check duplicate email/mobile across active wholesaler list (excluding current wholesaler)
  const allWholesalers = await listWholesalers();

  const emailDuplicate = allWholesalers.find(
    (w) => w.id !== id && (w.email || '').toLowerCase().trim() === dto.email.toLowerCase().trim()
  );
  if (emailDuplicate) {
    throw new Error(`The email address "${dto.email}" is already registered to another supplier. Duplicate emails are not allowed.`);
  }

  const cleanDtoMobile = dto.mobile.replace(/\D/g, '');
  const mobileDuplicate = allWholesalers.find(
    (w) => w.id !== id && (w.mobile || '').replace(/\D/g, '') === cleanDtoMobile
  );
  if (mobileDuplicate) {
    throw new Error(`The mobile number "${dto.mobile}" is already registered to another supplier. Duplicate mobile numbers are not allowed.`);
  }

  const payload: Record<string, unknown> = {
    name: dto.ownerName,
    shopName: dto.companyName,
    companyName: dto.companyName,
    phone: dto.mobile,
    category: dto.categories.join(', '),
    addresses: (dto.addresses || []).map(a => ({
      addressType: a.addressType,
      division: a.division || '',
      district: a.district,
      postalCode: a.postalCode,
      addressLine: a.addressLine,
      isDefault: a.isDefault,
    })),
    logoUrl: dto.logoUrl || '',
    bkashWallets: (dto.digitalWallets || []).map(w => ({
      walletType: w.walletType,
      accountNumber: w.accountNumber,
      isDefault: w.isDefault,
    })),
    bankDetails: (dto.bankDetailsList || []).map(b => ({
      bankName: b.bankName,
      accountName: b.accountName,
      accountNumber: b.accountNumber,
      branch: b.branch || '',
      routing: b.routing || '',
      isDefault: b.isDefault,
    })),
    documents: (dto.documents || []).map((d) => ({
      docType: d.name === 'Trade License' ? 'trade_license'
             : d.name === 'TIN Certificate' ? 'tin'
             : d.name === 'VAT Registration' ? 'vat'
             : d.name === 'Owner NID Photo' ? 'nid'
             : 'other',
      docName: d.name,
      status: d.status || 'pending',
      fileUrl: d.fileUrl || '',
    })),
  };

  const res = await request<Record<string, unknown>>(
    'PATCH',
    `/api/v1/admin/wholesalers/${encodeURIComponent(id)}`,
    { auth: true, body: payload },
  );

  if (!res.ok) {
    type ErrorResponse = { error?: { message?: string }; message?: string };
    const errObj = res.data as ErrorResponse | undefined;
    const errMsg = errObj?.error?.message ?? errObj?.message ?? `Failed to update wholesaler profile (HTTP ${res.status})`;
    throw new Error(errMsg);
  }

  // PATCH only returns {"data": "updated"} — fetch the full profile after update
  return getWholesaler(id);
}

/**
 * Approve a wholesaler.
 * POST /api/v1/admin/wholesalers/{id}/approve
 * Returns {"data": "approved"} — fetch fresh profile after action.
 */
export async function approveWholesaler(
  id: string,
  reviewedBy: string,
): Promise<Wholesaler> {
  await request<Record<string, unknown>>(
    'POST',
    `/api/v1/admin/wholesalers/${encodeURIComponent(id)}/approve`,
    { auth: true, body: { reviewedBy } },
  );
  return getWholesaler(id);
}

/**
 * Reject a wholesaler.
 * POST /api/v1/admin/wholesalers/{id}/reject
 */
export async function rejectWholesaler(
  id: string,
  reviewedBy: string,
  reason: string,
): Promise<Wholesaler> {
  await request<Record<string, unknown>>(
    'POST',
    `/api/v1/admin/wholesalers/${encodeURIComponent(id)}/reject`,
    { auth: true, body: { reviewedBy, reason } },
  );
  return getWholesaler(id);
}

/**
 * Suspend a wholesaler.
 * POST /api/v1/admin/wholesalers/{id}/suspend
 */
export async function suspendWholesaler(
  id: string,
  reviewedBy: string,
  reason: string,
): Promise<Wholesaler> {
  await request<Record<string, unknown>>(
    'POST',
    `/api/v1/admin/wholesalers/${encodeURIComponent(id)}/suspend`,
    { auth: true, body: { reviewedBy, reason } },
  );
  return getWholesaler(id);
}

/**
 * Unsuspend (activate) a wholesaler.
 * POST /api/v1/admin/wholesalers/{id}/unsuspend
 */
export async function unsuspendWholesaler(
  id: string,
  reviewedBy: string,
): Promise<Wholesaler> {
  await request<Record<string, unknown>>(
    'POST',
    `/api/v1/admin/wholesalers/${encodeURIComponent(id)}/unsuspend`,
    { auth: true, body: { reviewedBy } },
  );
  return getWholesaler(id);
}

/**
 * Request resubmission from a wholesaler.
 * POST /api/v1/admin/wholesalers/{id}/request-resubmit
 */
export async function requestResubmitWholesaler(
  id: string,
  reviewedBy: string,
  reason: string,
): Promise<Wholesaler> {
  await request<Record<string, unknown>>(
    'POST',
    `/api/v1/admin/wholesalers/${encodeURIComponent(id)}/request-resubmit`,
    { auth: true, body: { reviewedBy, reason } },
  );
  return getWholesaler(id);
}