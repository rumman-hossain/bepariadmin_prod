import { Building, MapPin, Package, Smartphone, UserCheck, Image as ImageIcon } from 'lucide-react';
import { Text } from '@/src/components/data';
import type { Wholesaler } from '@/src/types/domain';

/**
 * The supplier record, as data.
 *
 * Lifted out of `DetailsPage.tsx`, where roughly 200 lines of `sections`
 * arrays sat between the mutation handlers and the JSX — the same move
 * `productColumns.tsx` made for the product table. Reading the page meant
 * scrolling past the contents of two cards to find the layout.
 *
 * These describe WHAT the record contains. Where the cards sit is the page's
 * business, and how a row is drawn is `EntityDetailsCard`'s.
 */

function logoDisplayUrl(logoUrl?: string): string | null {
  if (!logoUrl || logoUrl.startsWith('data:') || logoUrl.startsWith('mock-gcs://')) return null;
  if (logoUrl.startsWith('gs://')) {
    return `https://storage.googleapis.com/${logoUrl.replace('gs://', '')}`;
  }
  return logoUrl;
}

/** Nothing recorded — said in words, never as an empty cell. */
function None({ children = 'Not added' }: { children?: string }) {
  return <span className="italic text-ink-3">{children}</span>;
}

export function businessProfileSections(w: Wholesaler) {
  const logo = logoDisplayUrl(w.logoUrl);

  return [
    {
      icon: Building,
      title: 'Supplier code',
      content: (
        <Text variant="strong" className="font-identifier">
          {w.code?.trim() || '—'}
        </Text>
      ),
    },
    {
      /*
       * WHO PUT THIS RECORD HERE.
       *
       * A supplier who signed themselves up typed their own trade licence
       * number; one an operator created was transcribed from a phone call.
       * Those two records deserve different amounts of scepticism when the
       * paperwork is being checked, and until now the detail screen did not
       * say which it was looking at — only the list column did.
       */
      icon: UserCheck,
      title: 'Added by',
      content:
        w.createdBy === 'ADMIN' ? (
          <span className="text-sm text-ink">An admin, from the console</span>
        ) : (
          <span className="text-sm text-ink">Self-registered through the app</span>
        ),
    },
    {
      icon: Smartphone,
      title: 'Contact',
      content: (
        <>
          <span className="font-identifier text-sm">{w.mobile || '—'}</span>
          <br />
          <Text variant="caption">{w.email || '—'}</Text>
        </>
      ),
    },
    {
      icon: MapPin,
      title: 'Location',
      content: w.location ? (
        <span className="text-sm font-medium">{w.location}</span>
      ) : (
        <None>Not specified</None>
      ),
    },
    {
      icon: Package,
      title: 'Business categories',
      content: w.category ? (
        <div className="mt-1 flex flex-wrap gap-1.5">
          {w.category.split(',').map((c, i) => (
            <span
              key={i}
              className="rounded-md border border-brass/20 bg-brass-wash px-2 py-0.5 text-2xs font-semibold uppercase tracking-wider text-brass"
            >
              {c.trim()}
            </span>
          ))}
        </div>
      ) : (
        <None>None specified</None>
      ),
    },
    {
      icon: MapPin,
      title: 'Addresses',
      content:
        w.addresses && w.addresses.length > 0 ? (
          <div className="mt-1 space-y-2">
            {w.addresses.map((a, i) => (
              <div key={i} className="flex flex-col gap-0.5 rounded-xl border bg-sheet-2 p-2.5">
                <Text as="div" variant="label" className="flex items-center justify-between">
                  <span>{a.addressType} address</span>
                  {a.isDefault && (
                    <span className="rounded bg-ok-wash px-1.5 font-bold text-ok">Default</span>
                  )}
                </Text>
                <div className="text-xs font-bold">{a.addressLine}</div>
                <div className="text-2xs text-ink-3">
                  {a.district} - {a.postalCode}
                </div>
              </div>
            ))}
          </div>
        ) : (
          w.address || <None />
        ),
    },
    {
      // A picture on the profile, not a document with a verification state —
      // which is why it is here and not in the paperwork panel.
      icon: ImageIcon,
      title: 'Company logo',
      content: logo ? (
        <img
          src={logo}
          alt="Company logo"
          className="h-14 w-14 rounded-xl border object-cover shadow-sm"
        />
      ) : (
        <None />
      ),
    },
  ];
}

export function financialSections(w: Wholesaler) {
  return [
    {
      icon: Building,
      title: 'Bank accounts',
      content:
        w.bankDetailsList && w.bankDetailsList.length > 0 ? (
          <div className="mt-1 space-y-2">
            {w.bankDetailsList.map((b, i) => (
              <div key={i} className="rounded-md border border-rule-subtle bg-sheet-2 p-2.5">
                <div className="text-xs font-medium text-ink">{b.bankName}</div>
                <div className="font-identifier text-xs text-ink-2">{b.accountNumber}</div>
              </div>
            ))}
          </div>
        ) : (
          <None>No bank account on file</None>
        ),
    },
    {
      icon: Smartphone,
      title: 'Mobile wallets',
      content:
        w.digitalWallets && w.digitalWallets.length > 0 ? (
          <div className="mt-1 space-y-2">
            {w.digitalWallets.map((wallet, i) => (
              <div key={i} className="rounded-md border border-rule-subtle bg-sheet-2 p-2.5">
                <span className="font-identifier text-xs font-medium text-ink">
                  {wallet.accountNumber}
                </span>
                <Text variant="label" className="ml-2">
                  {wallet.walletType}
                </Text>
              </div>
            ))}
          </div>
        ) : (
          <None>No mobile wallets</None>
        ),
    },
  ];
}
