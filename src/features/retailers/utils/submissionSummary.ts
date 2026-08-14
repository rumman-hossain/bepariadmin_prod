/**
 * WHY THE FORM REFUSED TO SUBMIT, IN A SENTENCE THE OPERATOR CAN ACT ON.
 *
 * `CreatePage` blocks a submit for two different reasons — invalid fields, and
 * required documents that were never uploaded — and it used to describe both
 * with a count of the FIELDS alone:
 *
 *     `${Object.keys(errors).length} fields need attention`
 *
 * When every field was valid and only the NID was missing, that rendered
 * literally as "0 fields need attention — they are marked below", at the top of
 * the page, immediately after scrolling the operator there. Nothing was marked,
 * because nothing was wrong with the fields; the real reason sat further down in
 * the Documents section, out of view.
 *
 * From the operator's side that is a button that does nothing: no request is
 * sent, and the page says there is nothing to fix. "Adding a retailer has no
 * effect" is a fair description of it.
 *
 * A count is only honest when it counts everything the form is refusing over.
 */

/**
 * Describes why a submit was refused.
 *
 * @param fieldErrorCount how many form fields are invalid
 * @param missingDocuments labels of required documents not yet uploaded
 */
export function submissionSummary(fieldErrorCount: number, missingDocuments: string[]): string {
  const fields =
    fieldErrorCount === 1
      ? 'One field needs attention'
      : fieldErrorCount > 1
        ? `${fieldErrorCount} fields need attention`
        : '';

  /*
   * Named, not counted. "2 documents are missing" sends the operator hunting
   * through the slots; "Owner NID and Trade Licence" tells them what to attach.
   */
  const docs =
    missingDocuments.length > 0
      ? `${missingDocuments.join(' and ')} ${
          missingDocuments.length === 1 ? 'still needs' : 'still need'
        } to be uploaded`
      : '';

  if (fields && docs) return `${fields}, and ${docs}. Both are marked below.`;
  if (docs) return `${docs} — see Documents Upload below.`;
  if (fields) return `${fields} — marked below.`;

  /*
   * Defensive, and it should never render: the summary is only shown when
   * something blocked the submit. Saying "nothing" would be the same lie the
   * zero-count produced, so it names the state instead.
   */
  return 'The form could not be submitted. Please review the details below.';
}
