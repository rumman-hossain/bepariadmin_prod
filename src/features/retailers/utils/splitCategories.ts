/**
 * The stored `category` is a comma-joined string; the picker works in a list.
 *
 * Trims and drops blanks, so "Fashion, , FMCG" and a trailing comma both come
 * back as two clean categories rather than three with an empty one that the
 * picker would then try to match against nothing.
 *
 * Split out of RetailerForm.tsx: a file exporting both a component and a plain
 * function loses Fast Refresh for the whole module
 * (`react-refresh/only-export-components`), which would make every edit to the
 * retailer form reload the page instead of patching it. It already had its own
 * tests, so it was only ever sharing the file by habit.
 */
export function splitCategories(joined: string): string[] {
  return joined
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean);
}
