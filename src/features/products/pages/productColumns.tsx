/**
 * The product table's columns.
 *
 * Lifted out of `ProductListPage`, where `buildColumns` was 112 lines of
 * formatting, status mapping and row actions sitting above the component that
 * used it — so reading the page meant scrolling past the table definition to
 * find the page. Columns are data; they belong in their own module.
 */
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/src/components/controls';
import { Text, Money } from '@/src/components/data';
import { StatusBadge } from '@/src/components/data/StatusBadge';
import type { Product } from '../types';

export type ProductRow = Record<string, unknown> & {
  id: string;
  name: string;
  sku: string;
  category: string;
  basePrice: number;
  sellingPrice: number | undefined;
  stock: number;
  status: string;
  visibility: string;
  product: Product;
};

export function buildColumns(
  onEdit: (id: string) => void,
  onDelete: (id: string) => void,
) {
  return [
    {
      key: 'name',
      header: 'Name',
      className: '',
      render: (row: ProductRow) => (
        <div className="min-w-0">
          <p className="font-medium text-ink truncate" title={row.name}>
            {row.name}
          </p>
          <Text as="p" variant="caption">{row.sku}</Text>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      className: '',
      render: (row: ProductRow) => (
        <Text variant="secondary">{row.category}</Text>
      ),
    },
    {
      key: 'basePrice',
      header: 'Base Price',
      className: 'text-right',
      render: (row: ProductRow) => <Money amount={row.basePrice} />,
    },
    {
      key: 'sellingPrice',
      header: 'Selling',
      className: 'text-right',
      render: (row: ProductRow) => <Money amount={row.sellingPrice ?? 0} />,
    },
    {
      key: 'stock',
      header: 'Stock',
      className: 'text-center',
      render: (row: ProductRow) => {
        const available = row.stock;
        return (
          <span
            className={`text-sm font-medium tabular-nums ${
              available <= 5
                ? 'text-bad'
                : available <= 20
                  ? 'text-warn'
                  : 'text-ink'
            }`}
          >
            {available}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      className: 'text-center',
      render: (row: ProductRow) => <StatusBadge status={row.status} />,
    },
    {
      key: 'visibility',
      header: 'Visibility',
      className: 'text-center',
      render: (row: ProductRow) => (
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            row.visibility === 'Public'
              ? 'bg-ok-wash text-ok'
              : 'bg-mute-wash text-mute'
          }`}
        >
          {row.visibility}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-center w-[80px]',
      render: (row: ProductRow) => (
        <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            iconLeft={Pencil}
            aria-label="Edit product"
            onClick={() => onEdit(row.id)}
          >
            {''}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            iconLeft={Trash2}
            aria-label="Delete product"
            className="text-bad hover:bg-bad-wash"
            onClick={() => onDelete(row.id)}
          >
            {''}
          </Button>
        </div>
      ),
    },
  ];
}
