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
  CreateWholesalerDTO,
  UpdateWholesalerDTO,
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
  const primaryAddress =
    (profile.addresses as Record<string, unknown>[] | undefined)?.find(
      (a) =>
        (a as Record<string, unknown>).isDefault ||
        (a as Record<string, unknown>).addressType === 'primary',
    ) ?? (profile.addresses as Record<string, unknown>[] | undefined)?.[0];

  const primaryBank =
    (profile.bankDetails as Record<string, unknown>[] | undefined)?.find(
      (b) => (b as Record<string, unknown>).isDefault,
    ) ?? (profile.bankDetails as Record<string, unknown>[] | undefined)?.[0];

  const primaryBkash =
    (profile.bkashWallets as Record<string, unknown>[] | undefined)?.find(
      (w) => (w as Record<string, unknown>).isDefault,
    ) ?? (profile.bkashWallets as Record<string, unknown>[] | undefined)?.[0];

  return {
    id: profile.id as string,
    companyName: (profile.companyName ?? profile.name) as string,
    category: (profile.category as string) || '',
    location:
      ((primaryAddress as Record<string, unknown> | undefined)
        ?.district as string) || 'Dhaka',
    status: mapStatus((profile.status as string) || 'INIT'),
    acceptanceRate: 100,
    dispatchSpeed: '24h',
    riskScore: undefined,
    createdAt: (profile.createdAt as string) || undefined,
    ownerName: (profile.name as string) || '',
    mobile: (profile.phone as string) || '',
    email: (profile.email as string) || undefined,
    address:
      ((primaryAddress as Record<string, unknown> | undefined)
        ?.addressLine as string) || undefined,
    bkash:
      ((primaryBkash as Record<string, unknown> | undefined)
        ?.accountNumber as string) || undefined,
    commissionRate: (profile.margin as number) || undefined,
    bankDetails: primaryBank
      ? {
          bankName: (primaryBank as Record<string, unknown>).bankName as string,
          accountName: (primaryBank as Record<string, unknown>)
            .accountName as string,
          accountNumber: (primaryBank as Record<string, unknown>)
            .accountNumber as string,
          branch:
            ((primaryBank as Record<string, unknown>).branch as string) || '',
          routing:
            ((primaryBank as Record<string, unknown>).routing as string) || '',
        }
      : undefined,
    documents: (
      (profile.documents as Record<string, unknown>[] | undefined) ?? []
    ).map((d: Record<string, unknown>) => ({
      name: (d.docName as string) || '',
      date: (d.createdAt as string) || '',
      status: (d.status as string) || 'Pending',
    })),
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
      return 'Active';
    case 'REVIEW':
      return 'Review';
    case 'SUSPENDED':
    default:
      return 'Suspended';
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
    : ((data as unknown as Record<string, unknown>)?.wholesalers as Record<string, unknown>[]) ?? [];

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
  return mapProfileToWholesaler(res.data as Record<string, unknown>);
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
export async function createWholesaler(
  dto: CreateWholesalerDTO,
): Promise<Wholesaler> {
  // Step 1: Create auth account
  // Hash password client-side with PBKDF2-SHA256 (matching mobile app)
  // so admin-created wholesalers have the same hash chain as self-registered ones:
  // stored = Argon2id(PBKDF2(plaintext)) — login works from both admin & mobile.
  const passwordHash = await hashPassword(dto.password, dto.email.toLowerCase().trim());

  const createRes = await request<Record<string, unknown>>(
    'POST',
    '/api/v1/auth/admin/create-wholesaler',
    {
      auth: true,
      body: {
        email: dto.email,
        password_hash: passwordHash,
      },
    },
  );

  const created =
    (createRes.data as Record<string, unknown>) ??
    (createRes as unknown as Record<string, unknown>);
  const wholesalerId = created.id as string;

  // Step 2: Update profile with full details via PATCH
  const profilePayload: Record<string, unknown> = {
    name: dto.name,
    shopName: dto.shopName,
    companyName: dto.shopName,
    category: dto.category,
    bkashWallets: dto.bkashNumber
      ? [
          {
            walletType: 'bkash',
            accountNumber: dto.bkashNumber,
            isDefault: true,
          },
        ]
      : [],
  };

  const profileRes = await request<Record<string, unknown>>(
    'PATCH',
    `/api/v1/admin/wholesalers/${encodeURIComponent(wholesalerId)}`,
    {
      auth: true,
      body: profilePayload,
    },
  );

  return mapProfileToWholesaler(
    (profileRes.data ?? profileRes) as Record<string, unknown>,
  );
}

/**
 * Update an existing wholesaler.
 * PATCH /api/v1/admin/wholesalers/{id}
 */
export async function updateWholesaler(
  id: string,
  dto: UpdateWholesalerDTO,
): Promise<Wholesaler> {
  const payload: Record<string, unknown> = {};
  if (dto.name !== undefined) payload.name = dto.name;
  if (dto.shopName !== undefined) payload.shopName = dto.shopName;
  if (dto.category !== undefined) payload.category = dto.category;
  if (dto.bkashNumber !== undefined) {
    payload.bkashWallets = [
      {
        walletType: 'bkash',
        accountNumber: dto.bkashNumber,
        isDefault: true,
      },
    ];
  }

  const res = await request<Record<string, unknown>>(
    'PATCH',
    `/api/v1/admin/wholesalers/${encodeURIComponent(id)}`,
    {
      auth: true,
      body: payload,
    },
  );

  return mapProfileToWholesaler(
    (res.data ?? res) as Record<string, unknown>,
  );
}

/**
 * Approve a wholesaler.
 * POST /api/v1/admin/wholesalers/{id}/approve
 */
export async function approveWholesaler(
  id: string,
  reviewedBy: string,
): Promise<Wholesaler> {
  const res = await request<Record<string, unknown>>(
    'POST',
    `/api/v1/admin/wholesalers/${encodeURIComponent(id)}/approve`,
    {
      auth: true,
      body: { reviewedBy },
    },
  );
  return mapProfileToWholesaler(
    (res.data ?? res) as Record<string, unknown>,
  );
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
  const res = await request<Record<string, unknown>>(
    'POST',
    `/api/v1/admin/wholesalers/${encodeURIComponent(id)}/reject`,
    {
      auth: true,
      body: { reviewedBy, reason },
    },
  );
  return mapProfileToWholesaler(
    (res.data ?? res) as Record<string, unknown>,
  );
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
  const res = await request<Record<string, unknown>>(
    'POST',
    `/api/v1/admin/wholesalers/${encodeURIComponent(id)}/suspend`,
    {
      auth: true,
      body: { reviewedBy, reason },
    },
  );
  return mapProfileToWholesaler(
    (res.data ?? res) as Record<string, unknown>,
  );
}

/**
 * Unsuspend (activate) a wholesaler.
 * POST /api/v1/admin/wholesalers/{id}/unsuspend
 */
export async function unsuspendWholesaler(
  id: string,
  reviewedBy: string,
): Promise<Wholesaler> {
  const res = await request<Record<string, unknown>>(
    'POST',
    `/api/v1/admin/wholesalers/${encodeURIComponent(id)}/unsuspend`,
    {
      auth: true,
      body: { reviewedBy },
    },
  );
  return mapProfileToWholesaler(
    (res.data ?? res) as Record<string, unknown>,
  );
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
  const res = await request<Record<string, unknown>>(
    'POST',
    `/api/v1/admin/wholesalers/${encodeURIComponent(id)}/request-resubmit`,
    {
      auth: true,
      body: { reviewedBy, reason },
    },
  );
  return mapProfileToWholesaler(
    (res.data ?? res) as Record<string, unknown>,
  );
}