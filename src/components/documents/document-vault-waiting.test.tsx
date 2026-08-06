// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';

/**
 * WHAT THE OPERATOR SEES while a document is still being saved.
 *
 * The retry itself is covered in utils/openDocument.test.ts. This is the other
 * half — the half this project keeps forgetting: that the screen actually USES
 * it, and words the result as a wait rather than an accusation.
 *
 * Every previous version of this bug had a tested rule and an untested call
 * site. A guard on the helper alone would pass while the vault still called the
 * api directly and still said "Resource not found".
 */

const openDocumentUrl = vi.fn();
vi.mock('./openDocument', async (importOriginal) => {
  // The real module for the failure shape and the sentence, so a change to
  // either breaks this test rather than sliding past a hand-written copy.
  const actual = await importOriginal<typeof import('./openDocument')>();
  return { ...actual, openDocumentUrl: (...args: unknown[]) => openDocumentUrl(...args) };
});

const { DocumentVault } = await import('./DocumentVault');
const { STILL_SAVING_MESSAGE } = await import('./openDocument');

const DOC = { id: 'doc-1', docType: 'tin', hasFile: true };

/**
 * The vault serves two screens now, so the endpoint and the labels are props.
 * `fetchUrl` here is a stub that must never be reached — every test mocks
 * `openDocumentUrl`, and a call arriving at this instead would mean the
 * component bypassed the retry entirely.
 */
const fetchUrl = vi.fn(async () => {
  throw new Error('the vault called the api directly, bypassing openDocumentUrl');
});

function vaultProps(documents: { id: string; docType: string; hasFile: boolean }[]) {
  return {
    subjectId: 'ret-1',
    documents,
    fetchUrl,
    labelFor: (t: string) => t.toUpperCase(),
    emptyLabel: 'No documents on file yet.',
  };
}

beforeEach(() => {
  openDocumentUrl.mockReset();
  vi.stubGlobal('open', vi.fn());
});
afterEach(cleanup);

function pressView() {
  render(<DocumentVault {...vaultProps([DOC])} />);
  fireEvent.click(screen.getByRole('button', { name: /view/i }));
}

describe('the vault while a document is settling', () => {
  it('goes through openDocumentUrl, not straight at the api', async () => {
    // The call site. Without this the retry exists and nothing reaches it.
    openDocumentUrl.mockResolvedValue('/api/v1/doc/tok');

    pressView();

    await waitFor(() => expect(openDocumentUrl).toHaveBeenCalledWith(fetchUrl, 'ret-1', 'doc-1'));
  });

  it('opens the document at our own domain when it resolves', async () => {
    openDocumentUrl.mockResolvedValue('/api/v1/doc/tok');

    pressView();

    await waitFor(() =>
      expect(window.open).toHaveBeenCalledWith('/api/v1/doc/tok', '_blank', 'noopener,noreferrer'),
    );
  });

  it('says it is still saving, and does NOT say it could not be opened', async () => {
    /*
     * The exact wording that sent an operator looking for a lost file. A
     * document mid-save is a wait; the alarm belongs to a real refusal.
     */
    openDocumentUrl.mockRejectedValue(
      Object.assign(new Error(STILL_SAVING_MESSAGE), { stillSaving: true }),
    );

    pressView();

    await screen.findByText(/still saving that document/i);
    expect(screen.getByText(STILL_SAVING_MESSAGE)).toBeTruthy();
    expect(screen.queryByText(/could not open that document/i)).toBeNull();
  });

  it('still raises a real refusal as an error', async () => {
    // The distinction has to cut both ways, or "still saving" becomes the one
    // message for everything and means nothing.
    openDocumentUrl.mockRejectedValue(
      Object.assign(new Error('You do not have permission to open this document.'), {
        stillSaving: false,
      }),
    );

    pressView();

    await screen.findByText(/could not open that document/i);
    expect(screen.getByText(/permission/i)).toBeTruthy();
    expect(screen.queryByText(/still saving/i)).toBeNull();
  });

  it('clears the previous message when View is pressed again', async () => {
    // Otherwise a stale warning sits over a document that has since opened.
    openDocumentUrl.mockRejectedValueOnce(
      Object.assign(new Error(STILL_SAVING_MESSAGE), { stillSaving: true }),
    );
    render(<DocumentVault {...vaultProps([DOC])} />);
    fireEvent.click(screen.getByRole('button', { name: /view/i }));
    await screen.findByText(/still saving that document/i);

    openDocumentUrl.mockResolvedValueOnce('/api/v1/doc/tok');
    fireEvent.click(screen.getByRole('button', { name: /view/i }));

    await waitFor(() => expect(screen.queryByText(/still saving that document/i)).toBeNull());
  });

  it('offers no View at all for a document with no file', async () => {
    // A row the server says has no bytes is genuinely absent, and it must not
    // be dressed up as something that might still be arriving.
    const withoutFile = { ...DOC, hasFile: false };
    render(<DocumentVault {...vaultProps([withoutFile])} />);

    expect(screen.queryByRole('button', { name: /view/i })).toBeNull();
  });
});

/**
 * DOWNLOAD, on both vaults.
 *
 * The same link serves both: `?download=1` asks the proxy for
 * `Content-Disposition: attachment` instead of `inline`. The flag is on the
 * request rather than baked into the token because an attachment is never
 * rendered — choosing it can only make the response more inert, so it needs no
 * second token and no second round trip.
 */
describe('downloading', () => {
  it('asks for the same document with ?download=1', async () => {
    openDocumentUrl.mockResolvedValue('/api/v1/doc/tok');

    render(<DocumentVault {...vaultProps([DOC])} />);
    fireEvent.click(screen.getByRole('button', { name: /download/i }));

    await waitFor(() =>
      expect(window.open).toHaveBeenCalledWith(
        '/api/v1/doc/tok?download=1',
        '_blank',
        'noopener,noreferrer',
      ),
    );
  });

  it('View does NOT ask for a download', async () => {
    // The two buttons must not collapse into one behaviour: an operator
    // verifying paperwork wants it on screen, not in their downloads folder.
    openDocumentUrl.mockResolvedValue('/api/v1/doc/tok');

    render(<DocumentVault {...vaultProps([DOC])} />);
    fireEvent.click(screen.getByRole('button', { name: /view/i }));

    await waitFor(() =>
      expect(window.open).toHaveBeenCalledWith('/api/v1/doc/tok', '_blank', 'noopener,noreferrer'),
    );
  });

  it('goes through the same retry, so a settling document is not called missing', async () => {
    // Download had no reason to be the one path that accuses a file of being
    // gone while it is still being written.
    openDocumentUrl.mockRejectedValue(
      Object.assign(new Error(STILL_SAVING_MESSAGE), { stillSaving: true }),
    );

    render(<DocumentVault {...vaultProps([DOC])} />);
    fireEvent.click(screen.getByRole('button', { name: /download/i }));

    await screen.findByText(/still saving that document/i);
  });

  it('offers neither button for a document with no file', () => {
    render(<DocumentVault {...vaultProps([{ ...DOC, hasFile: false }])} />);

    expect(screen.queryByRole('button', { name: /view/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /download/i })).toBeNull();
  });

  it('disables the other button while one is working', async () => {
    /*
     * Both go through the same ten-minute token mint. Letting an operator press
     * Download while View is still resolving would open two tabs from two
     * different tokens for one click each — confusing, and it doubles a request
     * that costs an IAM SignBlob.
     */
    let release: (url: string) => void = () => {};
    openDocumentUrl.mockReturnValue(new Promise<string>((r) => { release = r; }));

    render(<DocumentVault {...vaultProps([DOC])} />);
    fireEvent.click(screen.getByRole('button', { name: /view/i }));

    await waitFor(() =>
      expect((screen.getByRole('button', { name: /download/i }) as HTMLButtonElement).disabled).toBe(true),
    );

    release('/api/v1/doc/tok');
    await waitFor(() =>
      expect((screen.getByRole('button', { name: /download/i }) as HTMLButtonElement).disabled).toBe(false),
    );
  });
});

/**
 * ICONS, WITH THEIR NAMES INTACT.
 *
 * The words came off the buttons because this vault renders in a 257px column —
 * two labelled buttons took ~230px of it, so certificate names wrapped one word
 * per line and the controls landed on top of the caption.
 *
 * The risk in that change is the obvious one: an icon-only control with no
 * accessible name is announced as "button", and a sighted operator has nothing
 * to hover. Every test above finds these by `name: /view/i`, so they would all
 * keep passing on a control whose name came from nowhere but its own icon —
 * which is why the naming is asserted here, explicitly, from both directions.
 */
describe('the two controls are icons', () => {
  function controls() {
    render(<DocumentVault {...vaultProps([DOC])} />);
    return {
      view: screen.getByRole('button', { name: 'View' }),
      download: screen.getByRole('button', { name: 'Download' }),
    };
  }

  it('print no text', () => {
    // The whole reason for the change. A label rendered inside the button is
    // what made the row too wide to fit its column.
    const { view, download } = controls();

    expect(view.textContent?.trim()).toBe('');
    expect(download.textContent?.trim()).toBe('');
  });

  it('are still named, so they are usable without sight', () => {
    const { view, download } = controls();

    expect(view.getAttribute('aria-label')).toBe('View');
    expect(download.getAttribute('aria-label')).toBe('Download');
  });

  it('are still named on hover, so a mouse user can tell them apart', () => {
    // `title` is the only thing left saying which icon is which once the words
    // are gone. Dropping it makes the pair a guess.
    const { view, download } = controls();

    expect(view.getAttribute('title')).toBe('View');
    expect(download.getAttribute('title')).toBe('Download');
  });
});

/**
 * WHAT THE CAPTION SAYS.
 *
 * A pending document used to read "Uploaded · nobody has checked it yet". The
 * sentence went because it wrapped to three lines in a narrow column to explain
 * something the row already carries — but the DISTINCTION it explained has to
 * survive it. A reviewer needs to be able to tell, at a glance, a certificate
 * somebody has approved from one nobody has looked at, and if both rows read
 * the same the vault stops answering the only question it is opened for.
 */
describe('checked and unchecked', () => {
  it('says only "Uploaded" for a document nobody has verified', () => {
    render(<DocumentVault {...vaultProps([DOC])} />);

    expect(screen.getByText('Uploaded')).toBeTruthy();
    expect(screen.queryByText(/nobody has checked/i)).toBeNull();
  });

  it('names the verifier once somebody has', () => {
    render(
      <DocumentVault
        {...vaultProps([])}
        documents={[{ ...DOC, verifiedByName: 'Rahim Uddin', verifiedAt: '2026-05-20T00:00:00Z' }]}
      />,
    );

    expect(screen.getByText(/Verified by Rahim Uddin/)).toBeTruthy();
    expect(screen.queryByText('Uploaded')).toBeNull();
  });

  it('a document with no file says so, and is not called uploaded', () => {
    render(<DocumentVault {...vaultProps([{ ...DOC, hasFile: false }])} />);

    expect(screen.getByText('Not provided')).toBeTruthy();
    expect(screen.queryByText('Uploaded')).toBeNull();
  });
});

/**
 * AND THE ROW CANNOT OVERLAP ITSELF.
 *
 * jsdom has no layout, so this cannot measure. What it CAN do is assert the
 * rule that makes overlap impossible: the row wraps, and the text column has a
 * floor. Without both, a control that does not shrink squeezes the name to zero
 * and the words render underneath it — which is exactly what shipped.
 */
describe('the row at any width', () => {
  it('wraps rather than crushing the name', () => {
    render(<DocumentVault {...vaultProps([DOC])} />);
    const row = screen.getByText('TIN').closest('div')!.parentElement!;

    expect(row.className, `the row does not wrap: ${row.className}`).toContain('flex-wrap');
  });

  it('gives the name a width it cannot be squeezed below', () => {
    render(<DocumentVault {...vaultProps([DOC])} />);
    const name = screen.getByText('TIN').closest('div')!;

    expect(name.className, `the name column has no floor: ${name.className}`).toMatch(/min-w-\[/);
  });

  it('and a floor the narrowest real column can actually meet', () => {
    /*
     * The mistake this exists for. The floor was set to 9rem — WIDER than the
     * space the supplier detail column leaves:
     *
     *   255 total − 32 padding − 14 lock − 12 gap − 12 gap − 68 icons = 117px
     *
     * A floor of 144px cannot fit in 117, so the row wrapped on every single
     * render and the icons sat on their own line. The rule was doing its job;
     * the number made it fire permanently. jsdom cannot measure, so the bound
     * is asserted against the arithmetic above.
     */
    render(<DocumentVault {...vaultProps([DOC])} />);
    const name = screen.getByText('TIN').closest('div')!;

    const floor = name.className.match(/min-w-\[([\d.]+)rem\]/);
    expect(floor, `the floor is not a rem value: ${name.className}`).not.toBeNull();

    const px = Number(floor![1]) * 16;
    expect(
      px,
      `a ${px}px floor cannot fit the 117px the narrowest column leaves, so the ` +
        'row wraps on every render',
    ).toBeLessThanOrEqual(117);
  });
});
