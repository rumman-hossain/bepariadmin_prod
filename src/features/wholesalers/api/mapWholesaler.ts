/**
 * Server payload → the `Wholesaler` the console renders.
 *
 * Lifted out of `wholesalerApi.ts`, which was doing three unrelated jobs in one
 * 414-line file: this mapping, payload building, and ten thin HTTP wrappers.
 * The mapping is the part with actual decisions in it — status vocabulary,
 * document type inference, the commission default — and the part that already
 * had its own test file.
 */

import type { Wholesaler } from '@/src/types/domain';
import type { WholesalerProfilePayload } from '../schemas/wholesalerApiSchema';
import { DEFAULT_COMMISSION_RATE } from '../constants';

export function docTypeFromName(name: string): string {
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

/**
 * Normalises whatever the server sent into an ISO string.
 *
 * NOT a display formatter, despite having been called `formatDate` — which is
 * the exact name the six real date formatters were consolidated under, so
 * reading it as one sends you hunting for a locale that was never here.
 */
function toIsoString(value: unknown): string | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  return undefined;
}

/** Strip client-only preview URLs before sending to API */
export function sanitizeLogoUrlForApi(url: string | undefined): string {
  if (!url) return '';
  if (url.startsWith('data:')) return '';
  if (url.startsWith('mock-gcs://')) return '';
  return url;
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
    id: (d.id as string) || '',
    docType: (d.docType as string) || '',
    name: (d.docName as string) || '',
    date: toIsoString(d.createdAt),
    status: (d.status as string) || 'Pending',
    /*
     * `hasFile`, not `fileUrl`.
     *
     * The response no longer carries the object path — it named
     * `uploads/<draft>/<file>` for every certificate, publishing the bucket
     * layout the document proxy exists to hide. A boolean is all a screen needs
     * to decide whether to offer View and Download.
     */
    hasFile: d.hasFile === true,
  }));

  return {
    id: p.id as string,
    code: (p.code as string) || undefined,
    companyName: ((p.companyName ?? p.shopName ?? p.name) as string) || '',
    category: categoryStr,
    location: locationDistrict,
    status: mapStatus((p.status as string) || 'INIT'),
    createdAt: toIsoString(p.createdAt),

    /*
     * The three the list draws with. Read defensively because a server older
     * than these fields omits them entirely, and an undefined count rendered as
     * a quartet would draw four EMPTY slots — a supplier with complete paperwork
     * shown as having none.
     */
    documentsOnFile: typeof p.documentsOnFile === 'number' ? p.documentsOnFile : undefined,
    hasProducts: typeof p.hasProducts === 'boolean' ? p.hasProducts : undefined,
    createdBy: p.createdBy === 'ADMIN' ? 'ADMIN' : p.createdBy === 'SELF' ? 'SELF' : undefined,
    deletedAt: typeof p.deletedAt === 'string' ? p.deletedAt : undefined,
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
