import { useState } from 'react';
import { Page, PageHeader } from '@/src/components/layout/primitives';
import { Button } from '@/src/components/controls';
import { Alert } from '@/src/components/feedback';
import { useToast } from '@/src/components/feedback/useToast';
import { RetailerForm } from '../components/RetailerForm';
import { useRetailerForm } from '../hooks/useRetailerForm';
import { useRetailerAssets } from '../hooks/useRetailerAssets';
import { useRetailerNavigation } from '../hooks/useRetailerNavigation';
import { useCreateRetailer } from '../hooks/useRetailers';
import { saveRetailerChildren } from '../hooks/useSaveRetailerChildren';
import { districtFromAddresses } from '../utils/districtFromAddresses';
import type { RetailerUpdate } from '../schemas/retailerSchema';

/**
 * Onboard retailer — a screen with an address, not a dialog.
 *
 * The prototype does this in a modal. Wrong container for the job: the form has
 * four sections, a password and an assessment, and a modal gives it a scrollbar
 * inside a scrollbar, nothing to link to, and no way back from a mis-click on
 * the backdrop. `/retailers/new` can be bookmarked, reloaded and shared.
 */
export function CreatePage() {
  const { goToList, goToDetail } = useRetailerNavigation();
  const { values, errors, setField, setErrors, validate, toPayload } = useRetailerForm();
  const { draftId, pendingDocs, onFileSelected, missingRequired } = useRetailerAssets();
  const create = useCreateRetailer();
  const toast = useToast();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(false);

  const handleSubmit = async () => {
    setSubmitError(null);

    /*
     * Everything at once, not the first problem.
     *
     * An earlier version returned as soon as the password was missing, so an
     * operator submitting an empty form was told only that — fixed it, pressed
     * Create, and was then told about the shop name. Four round trips to learn
     * four things the form already knew on the first press.
     */
    const fieldsOk = validate();
    const passwordMissing = !values.password;
    // The server refuses a create without NID and trade licence. Checking here
    // too means the operator is told before the round trip, and told about both
    // at once rather than one per attempt.
    const docsMissing = missingRequired.length > 0;
    if (passwordMissing) {
      setErrors((e) => ({ ...e, password: 'Set a password so the shop can sign in' }));
    }

    if (!fieldsOk || passwordMissing || docsMissing) {
      setShowSummary(true);
      // The summary is at the top; the invalid field may be below the fold.
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setShowSummary(false);

    try {
      const created = await create.mutateAsync({
        ...(toPayload() as unknown as RetailerUpdate),
        // The district is no longer typed into a field of its own — it comes
        // from the default address, which was picked from the canonical list.
        // Without this the column is empty and the shop is invisible to the
        // list screen's district filter.
        district: districtFromAddresses(values.addresses),
        // Non-null is safe here and only here: `passwordMissing` above returns
        // before reaching this line, so a blank password cannot arrive.
        password: values.password!,
        // Names the draft the documents were uploaded into. The server claims
        // it in the same transaction that creates the shop.
        uploadDraftId: draftId ?? undefined,
      });
      // Addresses, banks and wallets each need their own PUT, keyed by an id
      // that only exists now. Failures are NAMED rather than thrown: the shop
      // is already created, and "could not create" would send the operator back
      // to press Create again — straight into "phone already registered".
      const failed = await saveRetailerChildren(created.id, values);
      if (failed.length > 0) {
        toast.error(
          `Shop created — ${failed.join(' and ')} not saved`,
          'Add them from the Edit screen.',
        );
        goToDetail(created.id);
        return;
      }

      // "can now sign in" was true and incomplete: a new shop registers as
      // PENDING and cannot order until somebody approves it. An operator who
      // does not know approval is required will not go looking for it, and the
      // shop will sit unable to buy with nothing explaining why.
      toast.success(
        'Registered — awaiting approval',
        `${values.shopName} can sign in and browse, but cannot order until you approve them.`,
      );
      goToDetail(created.id);
    } catch (err) {
      // The server's own message, when it sent one — it names the thing to fix
      // ("that phone number is already registered"), which a generic sentence
      // throws away.
      setSubmitError(err instanceof Error ? err.message : 'The retailer could not be created');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <Page>
      <PageHeader
        title="Onboard retailer"
        subtitle="Creates the account and its login. The shop can change everything afterwards."
      />

      {submitError && (
        <Alert tone="bad" title="The retailer was not created">
          {submitError}
        </Alert>
      )}

      {showSummary && (
        <Alert tone="warn" title="Some details need fixing">
          {/*
            Counted, and every one of them marked on its own field below. A
            summary that says "some fields are invalid" without saying how many
            leaves the operator scrolling to find out.
          */}
          {Object.keys(errors).length === 1
            ? 'One field needs attention — it is marked below.'
            : `${Object.keys(errors).length} fields need attention — they are marked below.`}
        </Alert>
      )}

      {/*
        A REAL <form>, because there is a password inside it.

        The fields sat in bare divs with the submit wired to an onClick, and
        Chrome says so on every visit: "Password field is not contained in a
        form". That warning is about behaviour, not tidiness — outside a form a
        browser cannot tell which fields belong to the credential, so password
        managers neither offer to generate one nor save what was set, and
        pressing Enter in any field does nothing at all.

        `noValidate` because `handleSubmit` already reports EVERY problem at
        once, deliberately. Native validation would pre-empt it with a bubble on
        the first invalid field and undo that.
      */}
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void handleSubmit();
        }}
        className="contents"
      >
        <RetailerForm
          mode="create"
          values={values}
          errors={errors}
          onChange={setField}
          pendingDocs={pendingDocs}
          onDocSelected={onFileSelected}
          missingRequired={missingRequired}
          showMissingDocs={showSummary}
        />

        <div className="flex flex-wrap gap-3">
          <Button type="submit" loading={create.isPending}>
            Onboard retailer
          </Button>
          {/*
            Explicitly `type="button"`. Inside a form the default is `submit`,
            so Cancel would create the retailer it was pressed to avoid.
          */}
          <Button type="button" variant="secondary" onClick={goToList} disabled={create.isPending}>
            Cancel
          </Button>
        </div>
      </form>
    </Page>
  );
}
