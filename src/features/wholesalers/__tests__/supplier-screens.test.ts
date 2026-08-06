import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * The screens, asserted where a unit test cannot reach.
 *
 * These read source. That is a blunt instrument and it is used deliberately for
 * three things whose failure mode is silence:
 *
 *   - a column that quietly goes back to being a subtitle;
 *   - a credential field that quietly disappears from the form;
 *   - a draft id that quietly stops being sent, which turns the server's
 *     document requirement into a refusal of every onboarding.
 *
 * Each is one line to delete and nothing else in the suite would notice.
 * `TestTheChecksCanFail` at the bottom proves the reading works.
 */

function source(...parts: string[]): string {
  return readFileSync(resolve(__dirname, '..', ...parts), 'utf8');
}

describe('the supplier list', () => {
  /*
   * The columns moved out of ListPage.tsx into supplierColumns.tsx when the
   * screen was rebuilt, and these three read the wrong file for a while — they
   * failed on a change that was correct, which is exactly how a source-reading
   * guard teaches people to edit the test.
   *
   * They are now RENDERED instead. `column-rendering.test.tsx` builds each cell
   * with real data and reads the output, which is both stronger and immune to
   * the file moving again.
   */
  const columns = source('pages', 'supplierColumns.tsx');

  it('gives the supplier code a column of its own', () => {
    expect(columns).toContain("key: 'code'");
    expect(columns).toContain("header: 'Code'");
  });

  it('does not also show the code under the company name', () => {
    // Twice is worse than nowhere: the operator has to work out whether the two
    // are the same field.
    const companyColumn = columns.slice(
      columns.indexOf("key: 'company'"),
      columns.indexOf("key: 'code'"),
    );
    expect(companyColumn).not.toContain('w.code');
  });
});

describe('the login credentials section', () => {
  /*
   * What the section CONTAINS is asserted by rendering it —
   * credentials-section.test.tsx. Two mutants walked past the source-level
   * version that used to live here: one binding the mobile input to
   * `values.email`, one deleting the field from the JSX while leaving its
   * definition above. Both left every grepped string in the file.
   *
   * What is left here is the one thing a render cannot see: that the field does
   * not ALSO exist somewhere else.
   */
  const basics = source('components', 'form', 'BasicInfoSection.tsx');

  it('is the ONLY place the number is edited', () => {
    /*
     * Two inputs bound to `values.mobile` would be two controls for one column,
     * and the second one edited wins for reasons invisible on screen. Rendering
     * one section can never prove the absence of a field in another.
     */
    expect(basics).not.toContain("setField('mobile'");
    // The control, not the prose. `/Mobile Number/i` was the first version and
    // it matched the COMMENT explaining that the field had moved — a guard that
    // fails on its own explanation is a guard nobody will keep.
    expect(basics).not.toContain('id="mobile"');
  });
});

describe('what the create call sends', () => {
  const api = source('api', 'wholesalerApi.ts');
  const createPayload = api.slice(api.indexOf('const fullPayload'));

  it('sends the upload draft id', () => {
    // Without it the server has nothing to validate the four required documents
    // against, and every onboarding is refused.
    expect(createPayload).toContain('uploadDraftId');
  });

  it('no longer sends a document list the page composed', () => {
    /*
     * The server used to store `{docType, docName, fileUrl}` verbatim, so
     * "all four documents are required" would have been a check on the
     * browser's claim about itself. Leaving the field in place while the server
     * ignores it is worse than removing it: somebody keeps filling it in.
     */
    expect(createPayload).not.toContain('docTypeFromName');
  });

  it('still sends the phone, which is now a credential and not a note', () => {
    expect(createPayload).toContain('phone: dto.mobile');
  });
});

describe('a slot that says PDF must accept a PDF', () => {
  /*
   * MEASURED ON DEV, and the reason this exists.
   *
   * Every certificate slot rendered "PDF or high-res Image format" and then
   * refused a PDF with "Upload failed. Please try again." — advice that cannot
   * work, because trying again with the same file fails identically. The upload
   * declared `mediaType: 'image'`, so `rejectionReason` rejected it in the
   * browser and no request was ever made.
   *
   * Two PNGs reached `/uploads/drafts`; the trade licence PDF produced nothing.
   *
   * It is worse now that all four are mandatory: trade licences, TIN and VAT
   * certificates are normally scans, so a form that requires what it refuses
   * cannot be completed at all.
   */
  const hook = source('hooks', 'useWholesalerAssets.ts');
  const section = source('components', 'form', 'DocumentsSection.tsx');

  it('uploads the certificates as documents, not as images', () => {
    const docHandler = hook.slice(hook.indexOf('const onDocSelected'));
    expect(docHandler).toContain("mediaType: 'document'");
    expect(docHandler).not.toContain("mediaType: 'image'");
  });

  it('still uploads the LOGO as an image', () => {
    // A company logo genuinely is a picture. Offering a PDF there just moves
    // the rejection to the server.
    const logoHandler = hook.slice(hook.indexOf('const onLogoSelected'), hook.indexOf('const onDocSelected'));
    expect(logoHandler).toContain("mediaType: 'image'");
  });

  it('offers exactly what the validator accepts in the file picker', () => {
    // The slot's default is `image/*,application/pdf` — much wider. It offers
    // HEIC, GIF, TIFF and BMP, each refused the instant the dialog closes.
    expect(section).toContain("acceptAttribute('document')");
  });
});

describe('the upload hook is instantiated once', () => {
  it('comes from the form context, not from each section', () => {
    /*
     * It used to be called separately in BasicInfoSection and DocumentsSection.
     * The hook's own comment says "one draft shared by the logo and every
     * document" — with two instances that was simply untrue, and each held its
     * own draft id.
     *
     * It matters now: the create call sends ONE draft id, and whichever
     * instance the screen happened to read from would be missing half the files.
     */
    for (const file of ['BasicInfoSection.tsx', 'DocumentsSection.tsx']) {
      const s = source('components', 'form', file);
      expect(s, `${file} calls useWholesalerAssets directly`).not.toContain('useWholesalerAssets(');
    }
    expect(source('components', 'form', 'context.tsx')).toContain('useWholesalerAssets(values, setField)');
  });
});

describe('the checks can fail', () => {
  // A guard that cannot fail reads as coverage.
  it('does not find things that are absent', () => {
    const list = source('pages', 'ListPage.tsx');
    expect(list).not.toContain("key: 'a-column-that-does-not-exist'");
    expect(list).not.toContain('header: Supplier code');
  });

  it('reads a file that genuinely exists', () => {
    expect(source('pages', 'ListPage.tsx').length).toBeGreaterThan(500);
  });
});

describe('the supplier documents view', () => {
  /*
   * You asked for the supplier vault to look like the retailer's, with a
   * download button. The way that goes wrong later is not a broken screen — it
   * is a SECOND vault, copied and then edited, so the two answer differently to
   * "what does a document that is still saving look like". The server's retailer
   * and supplier document rules had already drifted apart that way once.
   *
   * # These read the whole FEATURE, not one file
   *
   * They used to read `DetailsPage.tsx` by name, and broke the day the vault
   * moved into `SupplierPaperworkPanel.tsx` — a change that was correct. That
   * is the third time a source-reading guard here has failed on a good change,
   * and re-pointing it at the new filename would only move the trap.
   *
   * "Exactly one vault somewhere under features/wholesalers" is both what is
   * actually meant and immune to the file moving again.
   */
  const featureDir = resolve(__dirname, '..');

  /** Every .ts/.tsx under the supplier feature, tests excluded. */
  function featureSources(): { path: string; text: string }[] {
    const out: { path: string; text: string }[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = resolve(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name !== '__tests__') walk(full);
        } else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) {
          out.push({ path: full, text: readFileSync(full, 'utf8') });
        }
      }
    };
    walk(featureDir);
    return out;
  }

  const renderers = featureSources().filter((f) => f.text.includes('<DocumentVault'));

  it('renders the SHARED vault, exactly once', () => {
    expect(renderers, 'no DocumentVault rendered anywhere in the supplier feature').toHaveLength(1);
    expect(renderers[0].text).toContain("from '@/src/components/documents/DocumentVault'");
  });

  it('no longer renders the read-only DocumentList', () => {
    // DocumentList shows names and statuses and offers no way to open anything,
    // which is what the supplier screen had.
    for (const f of featureSources()) {
      expect(f.text, `${f.path} renders DocumentList`).not.toContain('<DocumentList');
    }
  });

  it('points the vault at the supplier endpoint', () => {
    // The endpoint is the ONE thing the two vaults differ by. Passing the
    // retailer fetcher would 404 on every supplier document, in a way that
    // reads as missing files rather than as a wrong URL.
    expect(renderers[0].text).toContain('fetchUrl={getWholesalerDocumentUrl}');
    expect(renderers[0].text).not.toContain('getRetailerDocumentUrl');
  });

  it('labels rows from the same list the upload form renders', () => {
    // A certificate must not be called one thing when it is uploaded and
    // another when it is read back.
    expect(renderers[0].text).toContain('REQUIRED_DOC_SLOTS');
  });
});

/*
 * THE EDIT SCREEN BINDING ITS DRAFT used to be asserted here, by reading
 * `useWholesalerForm.ts` for the literal `values.id && values.uploadDraftId`.
 *
 * It has moved to `hooks/saveOrdering.test.tsx`, which RUNS the hook. The
 * source check went stale the moment the condition was split so the refresh
 * could sit beside the attach — it failed on a change that was correct, which
 * is the failure mode that teaches people to edit the test. The behavioural
 * version covers strictly more: that the attach happens on edit and not on
 * create, and that the refetch follows it rather than racing it.
 */

describe('restoring a supplier does not promise it can sign in', () => {
  /*
   * MEASURED ON DEV. Restoring QA Verify Store — a REJECTED supplier — said
   * "is back in the directory and can sign in". It cannot: rejected and
   * suspended accounts are both refused at the door by `signin_decision.go`,
   * and those two statuses are most of what ever gets removed in the first
   * place, since the server only allows removing a suspended or rejected one.
   *
   * Restore undoes the REMOVAL and nothing else — the status returns exactly as
   * it was. An operator who reads that sentence and tells a supplier to try
   * logging in has been sent to make a phone call that fails.
   */
  const detail = source('pages', 'DetailsPage.tsx');
  const restore = detail.slice(detail.indexOf('const doRestore'), detail.indexOf('const handleReasonConfirm'));

  it('says what restoring actually did', () => {
    expect(restore).toContain('back in the directory');
  });

  it('claims nothing about signing in', () => {
    // The prose above it explains the mistake, so the check reads the toast
    // call only — a guard that fails on its own explanation is one nobody keeps.
    const toastCall = restore.slice(restore.indexOf("toast.success("));
    expect(toastCall).not.toContain('can sign in');
  });
});

describe('the reset-password card cannot block the profile form', () => {
  /*
   * MEASURED ON DEV, and it made the whole edit screen unusable.
   *
   * This card renders INSIDE the profile form, and Save Changes is a
   * `type="submit"` button. Its two password inputs carried `required`, so the
   * browser refused every submit and focused an empty password field with a
   * native "Please fill out this field." tooltip.
   *
   * The result: an operator correcting an address could not save at all unless
   * they also set a new password — and the app said nothing, because no request
   * was ever made and no application-level validation had failed. Pressing Save
   * produced silence.
   *
   * Nothing is lost by removing it. Resetting a password is a separate action
   * with its own button, and that button is already disabled until both fields
   * are filled.
   */
  const card = source('components', 'ResetWholesalerPasswordCard.tsx');

  it('does not mark its inputs required', () => {
    // A bare `required` prop on a line of its own is what the JSX had.
    expect(card).not.toMatch(/^\s+required$/m);
  });

  it('still refuses to reset with an empty or half-filled pair', () => {
    // The rule survives, on the button that owns it.
    expect(card).toContain('!newPassword || !confirmPassword');
  });
});
