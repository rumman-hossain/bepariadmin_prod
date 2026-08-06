/**
 * The shop assessment — what a field agent records after standing in the shop.
 *
 * Location on the goli, size, how it is kept, roughly what it turns over. This
 * is judgement, not measurement, and the screens say so: every assessment
 * carries who made it and when.
 *
 * # Codes are stored, labels are rendered
 *
 * The prototype puts the display string in the value —
 * `<option value="Main Goli (5 star)">`. That looks harmless and is not: the
 * wording ends up in every row, so changing "5 star" to anything else becomes a
 * data migration, `ORDER BY location_ranking` sorts alphabetically rather than
 * by how prime the position is, and a Bengali translation cannot happen without
 * rewriting the table.
 *
 * The database stores `main_goli`. This file is the only place the English
 * wording exists.
 */

export interface AssessmentOption {
  /** Stored in the database. Matches the CHECK constraint in migration 093. */
  value: string;
  /** Shown to the operator. Free to change without touching a row. */
  label: string;
}

/**
 * How prime the shop's position is.
 *
 * "Goli" (গলি) is the lane a market runs along; a shop on the main goli catches
 * the footfall and one three turns off it does not. The prototype rendered these
 * as 5/4/3 stars, which reads as a rating somebody computed. They are a
 * position, so they are described as one.
 *
 * Ordered best-first on purpose — the dropdown reads as a scale.
 */
export const LOCATION_RANKING: readonly AssessmentOption[] = [
  { value: 'main_goli', label: 'Main goli — prime position' },
  { value: 'near_main_goli', label: 'Near the main goli' },
  { value: 'far_from_main_goli', label: 'Away from the main goli' },
] as const;

/** Rough trading volume, as judged on the visit. Deliberately banded, not a figure. */
export const MONTHLY_SALE: readonly AssessmentOption[] = [
  { value: 'excellent', label: 'Excellent' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
] as const;

export const SHOP_TYPE: readonly AssessmentOption[] = [
  { value: 'big', label: 'Big' },
  { value: 'medium', label: 'Medium' },
  { value: 'small', label: 'Small' },
] as const;

/** How well the shop is kept. A proxy for how much the owner invests in it. */
export const SHOP_DECOR: readonly AssessmentOption[] = [
  { value: 'very_nice', label: 'Very nice' },
  { value: 'nice', label: 'Nice' },
  { value: 'less_nice', label: 'Plain' },
] as const;

/**
 * The code sets, written down in one place beside the constraints they mirror.
 *
 * `users.retailers` has a CHECK for each of these. When a migration widens one,
 * this is what has to change with it — and a test asserts the lists match, so
 * the two cannot drift silently.
 */
export const ASSESSMENT_CODES = {
  locationRanking: LOCATION_RANKING.map((o) => o.value),
  estimatedMonthlySale: MONTHLY_SALE.map((o) => o.value),
  shopType: SHOP_TYPE.map((o) => o.value),
  shopDecorType: SHOP_DECOR.map((o) => o.value),
} as const;

/**
 * Renders a stored code as its label.
 *
 * An unrecognised code renders as ITSELF, not as blank. The server is ahead of
 * the console more often than the reverse, and a code this build has never heard
 * of should look visibly odd — a reason to go and look — rather than disappear
 * into an empty cell that reads as "never assessed".
 *
 * An absent value renders as empty string, which is the caller's cue to show
 * "Not assessed yet" instead.
 */
export function assessmentLabel(
  options: readonly AssessmentOption[],
  value: string | null | undefined,
): string {
  if (!value) return '';
  return options.find((o) => o.value === value)?.label ?? value;
}
