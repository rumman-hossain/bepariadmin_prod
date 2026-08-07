/**
 * Data-display primitives.
 *
 * On the Indigo & Jute token set and guarded against reaching back to the
 * legacy tokens. Each of these consolidates a pattern that had drifted into
 * several rival implementations — see the individual docstrings for what and
 * how many.
 */
export {
  formatMoney,
  formatDate,
  formatDateTime,
  formatTime,
  formatAge,
  type FormatMoneyOptions,
} from './format';
export { Text, type TextProps, type TextVariant } from './Text';
export { Money, type MoneyProps } from './Money';
export {
  EmptyValue,
  Identifier,
  Badge,
  type EmptyValueProps,
  type IdentifierProps,
  type BadgeProps,
  type BadgeTone,
} from './Value';
export {
  DescriptionList,
  StatTile,
  StatGrid,
  type DetailItem,
  type DescriptionListProps,
  type StatTileProps,
  type StatGridProps,
} from './DescriptionList';
export { Timeline, type TimelineEvent, type TimelineProps } from './Timeline';
export {
  DataTable,
  type Column,
  type DataTableProps,
  type SortState,
  type SortDirection,
} from './DataTable';
export { StatusBadge, type StatusBadgeProps } from './StatusBadge';
export { statusTone, type StatusTone } from './status';
export { Avatar, type AvatarProps } from './Avatar';
export { Pagination, type PaginationProps } from './Pagination';
export { SearchFilterBar } from './SearchFilterBar';
