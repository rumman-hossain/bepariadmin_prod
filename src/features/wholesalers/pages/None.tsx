/**
 * Nothing recorded — said in words, never as an empty cell.
 *
 * Split out of supplierDetailSections.tsx, which exports section-building
 * FUNCTIONS rather than components. A module that mixes the two loses Fast
 * Refresh entirely (`react-refresh/only-export-components`), and the supplier
 * detail screen is exactly the kind of dense page where losing hot reload is
 * felt on every edit.
 */
export function None({ children = 'Not added' }: { children?: string }) {
  return <span className="italic text-ink-3">{children}</span>;
}
