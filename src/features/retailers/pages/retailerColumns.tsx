/**
 * Retailer table columns. Columns are data, so they live apart from the page.
 */
import { Text, Identifier, StatusBadge, EmptyValue, formatDate, Money } from '@/src/components/data';
import type { Column } from '@/src/components/data';
import type { Retailer } from '../schemas/retailerSchema';

export type RetailerRow = Record<string, unknown> & Retailer;

export const retailerColumns: Column<RetailerRow>[] = [
  {
    key: 'shopName',
    header: 'Shop',
    sortBy: (r) => r.shopName,
    render: (r) => (
      <div className="min-w-0">
        <Text variant="strong">{r.shopName}</Text>
        <Text as="span" variant="caption" className="block truncate">
          {r.name}
        </Text>
      </div>
    ),
  },
  { key: 'phone', header: 'Mobile', render: (r) => <Identifier value={r.phone} /> },
  {
    key: 'district',
    header: 'District',
    sortBy: (r) => r.district ?? '',
    // `district` is `omitempty` server-side, so it is absent rather than empty.
    // EmptyValue says "not recorded"; a blank cell says nothing at all.
    render: (r) => (r.district ? <Text>{r.district}</Text> : <EmptyValue />),
  },
  {
    key: 'category',
    header: 'Category',
    sortBy: (r) => r.category ?? '',
    render: (r) => (r.category ? <Text>{r.category}</Text> : <EmptyValue />),
  },
  {
    key: 'createdBy',
    header: 'Added by',
    sortBy: (r) => r.createdByName ?? r.createdBy ?? '',
    /*
     * Who put this shop on the platform, and — when it was staff — which member
     * of staff.
     *
     * This column replaced "Credit", which rendered `creditScore`. The comment
     * there described it as "server-computed and read-only". It is read-only;
     * it is NOT computed. `credit_score` appears in three places in the backend,
     * all reads, so every retailer has sat at the default 50 since the table was
     * created. A constant presented as a measurement, in a row of real figures,
     * is worse than an absent column.
     *
     * "Added by" answers something an operator actually asks. A shop that signed
     * itself up typed its own phone number and its own trade licence; a shop an
     * operator created was transcribed from a phone call. Those rows deserve
     * different amounts of trust, and the name says who to ask.
     */
    render: (r) => {
      if (r.createdBy === 'ADMIN') {
        return r.createdByName ? (
          <Text>{r.createdByName}</Text>
        ) : (
          // Created by staff before migration 093 recorded which. Honest about
          // the gap rather than showing a blank that reads as self-registered.
          <Text variant="secondary">Staff (not recorded)</Text>
        );
      }
      if (r.createdBy === 'SELF') return <Text variant="secondary">Self-registered</Text>;
      // Predates the column entirely.
      return <EmptyValue reason="Not recorded" />;
    },
  },
  {
    key: 'gmv',
    header: 'GMV',
    // Right-aligned with tabular figures so the digits line up down the column —
    // a money column that does not is unreadable at a glance.
    align: 'right',
    render: (r) => <Money amount={r.gmv} />,
  },
  {
    key: 'status',
    header: 'Status',
    sortBy: (r) => r.status,
    render: (r) => <StatusBadge status={r.status} />,
  },
  {
    key: 'createdAt',
    header: 'Joined',
    sortBy: (r) => r.createdAt,
    render: (r) => (
      <Text as="span" variant="secondary">
        <time dateTime={r.createdAt}>{formatDate(r.createdAt)}</time>
      </Text>
    ),
  },
];
