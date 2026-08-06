import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Page, PageHeader } from '@/src/components/layout/primitives';
import { Button } from '@/src/components/controls';
import { Text } from '@/src/components/data';
import { Alert } from '@/src/components/feedback';
import { useToast } from '@/src/components/feedback/useToast';
import { RetailerForm } from '../components/RetailerForm';
import { useRetailerForm, EMPTY_RETAILER_FORM } from '../hooks/useRetailerForm';
import { useRetailerAssets } from '../hooks/useRetailerAssets';
import { useRetailerNavigation } from '../hooks/useRetailerNavigation';
import {
  useRetailerDetail,
  useUpdateRetailer,
  useRefreshRetailerDetail,
} from '../hooks/useRetailers';
import type { RetailerUpdate } from '../schemas/retailerSchema';
import { toEditablePayload } from '../utils/editablePayload';
import { saveRetailerChildren } from '../hooks/useSaveRetailerChildren';
import { districtFromAddresses } from '../utils/districtFromAddresses';

/**
 * Correcting a shop's details.
 *
 * Reuses `RetailerForm` with `mode="edit"` — the same component as Add, which is
 * why it takes a mode at all. Two forms would drift: the edit screen would
 * quietly lose a field somebody added to create, and nobody would notice until
 * an operator could not fix something.
 *
 * # Phone and email are shown, not edited
 *
 * They are the sign-in credentials. Changing a phone means rewriting its hash
 * and ending every session, or the shop keeps a live session on a credential
 * that no longer identifies it. That is its own deliberate action, not a side
 * effect of fixing a spelling — so they render as read-only rows here and the
 * server does not bind them either.
 *
 * The screen used to SEND both and the server dropped them silently, returning
 * a 200 and a success toast over a change that never happened. Showing them as
 * text is the honest version: the screen no longer offers what it cannot do.
 */

export function EditPage() {
  const { id = '' } = useParams();
  const { goToDetail } = useRetailerNavigation();
  const { data: retailer, isPending, error } = useRetailerDetail(id || null);
  const { values, errors, setField, validate, toPayload } = useRetailerForm();
  // draftId matters here as much as it does on create. It was destructured away,
  // so a document uploaded from this screen went into a draft nothing ever
  // claimed: the slot said "done" and the file was bound to no shop at all.
  const { draftId, pendingDocs, onFileSelected, missingRequired } = useRetailerAssets();
  const update = useUpdateRetailer();
  // Passed to saveRetailerChildren so the refetch happens after the documents
  // attach, not after the PATCH — see the comment on that parameter.
  const refreshDetail = useRefreshRetailerDetail(id);
  const toast = useToast();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(false);

  /*
   * Prefill once the row arrives.
   *
   * Keyed on the retailer's id rather than the object: TanStack hands back a
   * new object reference on every refetch, and depending on the object would
   * overwrite whatever the operator had typed each time the cache refreshed —
   * losing their edits mid-sentence.
   */
  useEffect(() => {
    if (!retailer) return;
    setField({
      ...EMPTY_RETAILER_FORM,
      name: retailer.name,
      shopName: retailer.shopName,
      phone: retailer.phone,
      email: retailer.email ?? '',
      district: retailer.district ?? '',
      category: retailer.category ?? '',
      locationRanking: retailer.locationRanking ?? '',
      estimatedMonthlySale: retailer.estimatedMonthlySale ?? '',
      shopType: retailer.shopType ?? '',
      shopDecorType: retailer.shopDecorType ?? '',
      // `undefined`, not `''`. These three are numbers on the form type, and an
      // empty string here would be a string in a number field — the exact
      // "absent vs zero" confusion the optional typing exists to prevent.
      yearsInBusiness: retailer.yearsInBusiness ?? undefined,
      latitude: retailer.latitude ?? undefined,
      longitude: retailer.longitude ?? undefined,

      /*
       * The collections, which were NOT being prefilled at all.
       *
       * The server has returned all three since migration 090; the client
       * schema simply never parsed `addresses`, and none of them were loaded
       * here. So Edit opened with three empty sections for a shop that had
       * accounts and an address on file — and because each PUT replaces the
       * whole set, adding one row would have deleted everything the operator
       * could not see.
       *
       * It matters more now that `district` is derived from these: an edit that
       * could not see the addresses would derive an empty district and file the
       * shop under nothing.
       */
      addresses: retailer.addresses ?? [],
      bankDetailsList: retailer.bankDetails ?? [],
      digitalWallets: retailer.mobileWallets ?? [],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retailer?.id]);

  if (isPending) return <Text variant="secondary">Loading…</Text>;
  if (error || !retailer) {
    return (
      <Alert tone="bad" title="This retailer could not be loaded">
        {error instanceof Error ? error.message : 'Try again, or go back to the list.'}
      </Alert>
    );
  }

  const handleSubmit = async () => {
    setSubmitError(null);
    if (!validate()) {
      setShowSummary(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setShowSummary(false);

    // phone and email are stripped before sending — see toEditablePayload for
    // why, and editablePayload.test.ts for the assertion that they are.
    const editable = toEditablePayload({
      ...(toPayload() as Record<string, unknown>),
      // Same reasoning as create: the district is derived from the default
      // address rather than typed. On edit it must be RE-derived, or moving a
      // shop to a new district would update the address and leave the retailer
      // row filed under the old one.
      district: districtFromAddresses(values.addresses),
    });

    try {
      await update.mutateAsync({ id, input: editable as unknown as RetailerUpdate });

      // The collections do NOT go through PATCH — the Go UpdateRetailerRequest
      // does not bind them, so sending them there would be silently ignored.
      // They have their own endpoints, and edit must call them or a corrected
      // bank account would appear to save and would not.
      // draftId is passed HERE and nowhere on create: create claims its own
      // draft inside the insert transaction, this screen has no such moment.
      //
      // refreshDetail runs LAST, inside saveRetailerChildren. The mutation above
      // already invalidated the detail, and that invalidation lands before the
      // documents attach — so without this the vault would be built from rows
      // the attach then deleted, and View would 404 on ids that no longer exist.
      const failed = await saveRetailerChildren(id, values, draftId, refreshDetail);
      if (failed.length > 0) {
        toast.error(`Saved — ${failed.join(' and ')} not saved`, 'Try again from this screen.');
        return;
      }

      toast.success('Saved', `${values.shopName} has been updated.`);
      goToDetail(id);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'The changes could not be saved');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <Page>
      <PageHeader
        title={`Edit ${retailer.shopName}`}
        subtitle="Everything except the sign-in phone and email."
        onBack={() => goToDetail(id)}
      />

      {submitError && (
        <Alert tone="bad" title="The changes were not saved">
          {submitError}
        </Alert>
      )}

      {showSummary && (
        <Alert tone="warn" title="Some details need fixing">
          {Object.keys(errors).length === 1
            ? 'One field needs attention — it is marked below.'
            : `${Object.keys(errors).length} fields need attention — they are marked below.`}
        </Alert>
      )}


      <RetailerForm
        mode="edit"
        values={values}
        errors={errors}
        onChange={setField}
        pendingDocs={pendingDocs}
        onDocSelected={onFileSelected}
        missingRequired={missingRequired}
        existingDocs={retailer.documents}
      />

      <div className="flex flex-wrap gap-3">
        <Button onClick={handleSubmit} loading={update.isPending}>
          Save changes
        </Button>
        <Button variant="secondary" onClick={() => goToDetail(id)} disabled={update.isPending}>
          Cancel
        </Button>
      </div>
    </Page>
  );
}
