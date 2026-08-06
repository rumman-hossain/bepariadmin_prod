/**
 * Status → the colour token its rule is drawn in.
 *
 * One definition, read by the stat strip, the table row and the detail header.
 * Three copies of "pending is amber" is how one of them ends up disagreeing,
 * and the whole point of the rule is that the same colour means the same state
 * wherever it appears.
 *
 * In its own file rather than beside the strip: a component module that also
 * exports a constant breaks fast refresh for the whole file, and this constant
 * is shared precisely because it is not one component's business.
 */
export const STATUS_RULE: Record<string, string> = {
  active: 'bg-ok',
  pending: 'bg-warn',
  // Deliberately different from suspended. They are different facts — one
  // traded and lost access, the other never traded — and only one of them can
  // be deleted permanently, so they must not look the same at a glance.
  suspended: 'bg-bad',
  rejected: 'bg-ink-3',
};
