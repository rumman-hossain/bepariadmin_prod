/**
 * The districts of Bangladesh.
 *
 * Moved out of the wholesaler form's context file: nothing about a list of
 * districts is wholesaler-specific, and the retailer address section needs the
 * same one. Two copies would drift the first time a district was corrected or
 * added to one of them — the same reasoning that moved `useCategoryOptions` and
 * `useDefaultableList` up here.
 *
 * Not exhaustive: sixteen of the sixty-four, the ones the platform actually
 * trades in. Stated so nobody assumes a missing district is a bug rather than a
 * decision — when trade expands, this is the one place to add to.
 */
export const DISTRICT_OPTIONS = [
  'Dhaka', 'Chittagong', 'Sylhet', 'Rajshahi', 'Khulna', 'Barisal', 'Rangpur', 'Mymensingh',
  'Comilla', 'Narayanganj', 'Gazipur', 'Bogra', 'Jessore', "Cox's Bazar", 'Feni', 'Noakhali',
] as const;
