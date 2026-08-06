/**
 * Layout primitives — the composition layer.
 *
 * These are the parts that were missing, and their absence is why building a
 * new screen meant writing `div`s: 9 page roots with 5 different rhythms, 33
 * grids in ~14 recipes, 11 hand-rolled section headings, 35 ad-hoc flex rows.
 *
 * Everything here is on the Indigo & Jute token set and is guarded against
 * reaching back to the legacy tokens (`guard:no-legacy-tokens`).
 */
export { GAP, GAP_X, GAP_Y, type Gap } from './spacing';
export { Stack, Row, type StackProps, type RowProps } from './Stack';
export { Grid, Columns, type GridCols, type GridProps, type ColumnsProps } from './Grid';
export {
  Page,
  Section,
  Toolbar,
  Separator,
  type PageProps,
  type SectionProps,
  type ToolbarProps,
  type SeparatorProps,
} from './Page';
export { Panel, type PanelProps } from './Panel';
export { PageHeader, type PageHeaderProps } from './PageHeader';
