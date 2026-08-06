// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useWholesalerForm } from './useWholesalerForm';
import type { WholesalerFormData } from '../schemas/wholesalerSchema';
import { REQUIRED_DOCUMENT_NAMES } from '../constants/documents';

/**
 * SAVING A SUPPLIER EDIT: what happens, and in what order.
 *
 * The live bug, measured on dev against WHL-00009. Replace the VAT certificate,
 * press Save, press View — "Still saving that document", every time, until the
 * page was reloaded by hand.
 *
 * Three requests leave the browser on a save: the PATCH, the document attach,
 * and the refetch of the supplier. The attach REPLACES documents by `doc_type`
 * — the server deletes the old row and inserts a new one, so a replaced
 * certificate comes back with a NEW id. Refetching when the PATCH resolved put
 * the OLD ids back into the vault, and View then asked for a document that had
 * just been deleted.
 *
 * The network log said it plainly: detail refetches at requests 496 and 497,
 * attach at 498.
 *
 * This is the retailer's Z-1 fix, which was never carried across. So the test
 * asserts the ORDER rather than the presence of a refresh — a refresh in the
 * wrong place IS the bug — and it drives the REAL `queries.ts`, because the
 * premature invalidation lived there, in `useUpdateWholesaler.onSuccess`, not
 * in the form.
 */

vi.mock('../api/wholesalerApi', () => ({
  createWholesaler: vi.fn(),
  updateWholesaler: vi.fn(),
  attachWholesalerDocuments: vi.fn(),
  listWholesalers: vi.fn(),
  getWholesaler: vi.fn(),
  updateWholesalerMargin: vi.fn(),
  approveWholesaler: vi.fn(),
  rejectWholesaler: vi.fn(),
  suspendWholesaler: vi.fn(),
  unsuspendWholesaler: vi.fn(),
  requestResubmitWholesaler: vi.fn(),
}));

import {
  createWholesaler,
  updateWholesaler,
  attachWholesalerDocuments,
} from '../api/wholesalerApi';

/** A supplier the schema accepts, so validation never masks an ordering bug. */
const EXISTING: Partial<WholesalerFormData> = {
  id: 'whl-9',
  companyName: 'Elegant Apparel Ltd',
  ownerName: 'Mohammad Ali',
  mobile: '01712345678',
  email: 'supplier@example.com',
  categories: ['Gents Textile'],
  addresses: [
    {
      addressType: 'primary',
      district: 'Dhaka',
      postalCode: '1205',
      addressLine: 'Shop 12, New Market',
      isDefault: true,
    },
  ],
  bankDetailsList: [],
  digitalWallets: [],
  documents: [],
  uploadDraftId: 'draft-9',
};

let events: string[];
let detailRefetchSettled: boolean;

/**
 * Renders the hook against a real QueryClient with `invalidateQueries` observed.
 *
 * The detail invalidation resolves LATE on purpose: `invalidateQueries` only
 * marks a query stale and starts a refetch, so a caller that discards its
 * promise waits for nothing. Resolving after a tick is what makes "awaited"
 * mean something.
 */
function renderForm(initialData: Partial<WholesalerFormData>) {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });

  vi.spyOn(qc, 'invalidateQueries').mockImplementation(((filters?: { queryKey?: unknown[] }) => {
    const key = JSON.stringify(filters?.queryKey ?? []);
    const isDetail = key.includes('whl-9');
    events.push(isDetail ? 'refresh:detail' : 'refresh:list');
    if (!isDetail) return Promise.resolve();
    return new Promise<void>((resolve) =>
      setTimeout(() => {
        detailRefetchSettled = true;
        resolve();
      }, 5),
    );
  }) as QueryClient['invalidateQueries']);

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );

  return renderHook(
    () =>
      useWholesalerForm({
        initialData,
        onSuccess: async () => {
          events.push('onSuccess');
        },
      }),
    { wrapper },
  );
}

beforeEach(() => {
  events = [];
  detailRefetchSettled = false;

  vi.mocked(updateWholesaler)
    .mockReset()
    .mockImplementation(async () => {
      events.push('patch');
      return { id: 'whl-9' } as never;
    });
  vi.mocked(createWholesaler)
    .mockReset()
    .mockImplementation(async () => {
      events.push('post');
      return { id: 'whl-new' } as never;
    });
  vi.mocked(attachWholesalerDocuments)
    .mockReset()
    .mockImplementation(async () => {
      events.push('attach');
    });
});

describe('editing a supplier that has a file waiting in a draft', () => {
  it('refreshes the supplier AFTER the attach, never before', async () => {
    const { result } = renderForm(EXISTING);

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(events.indexOf('attach'), 'the documents were never attached').toBeGreaterThan(-1);
    expect(
      events.indexOf('refresh:detail'),
      'the supplier was never refetched, so the vault keeps whatever it had',
    ).toBeGreaterThan(-1);
    expect(
      events.indexOf('refresh:detail') > events.indexOf('attach'),
      `the detail refetched before the attach — the vault holds document ids the ` +
        `attach deleted, and View 404s. Order was: ${events.join(' → ')}`,
    ).toBe(true);
  });

  it('never refetches the detail between the PATCH and the attach', async () => {
    /*
     * The pointed version. `useUpdateWholesaler.onSuccess` invalidated the
     * detail the moment the PATCH returned — that call, not a missing one, is
     * what produced the stale ids. Asserting only "the last refresh is late"
     * would let it back in.
     */
    const { result } = renderForm(EXISTING);

    await act(async () => {
      await result.current.handleSubmit();
    });

    const between = events.slice(events.indexOf('patch'), events.indexOf('attach'));
    expect(
      between.includes('refresh:detail'),
      `a refetch was fired before the attach: ${events.join(' → ')}`,
    ).toBe(false);
  });

  it('waits for the refetch to finish before onSuccess navigates', async () => {
    /*
     * The first retailer fix looked right and changed nothing, because the
     * refresh promise was discarded: the screen navigated to the detail page
     * while the refetch was still in flight, and the vault rendered the stale
     * cache anyway.
     */
    const { result } = renderForm(EXISTING);

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(
      detailRefetchSettled,
      'handleSubmit returned before the refetch finished — the refresh is fired and forgotten',
    ).toBe(true);
    expect(events[events.length - 1]).toBe('onSuccess');
  });

  it('still refreshes when no file was picked', async () => {
    // A save that only corrects an address changes the row too. The update
    // mutation no longer refreshes the detail itself, so nothing else would.
    const { result } = renderForm({ ...EXISTING, uploadDraftId: undefined });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(attachWholesalerDocuments).not.toHaveBeenCalled();
    expect(events).toContain('refresh:detail');
  });

  it('the list is refreshed too, or the table shows the old company name', async () => {
    const { result } = renderForm(EXISTING);

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(events).toContain('refresh:list');
  });
});

describe('onboarding a supplier', () => {
  it('does not attach again — create claims its draft inside the insert', async () => {
    /*
     * Create passes the draft id in the body and the server claims it in the
     * same transaction as the insert. Attaching afterwards would re-claim a
     * draft that is already bound, and the server refuses that.
     */
    const { result } = renderForm({
      ...EXISTING,
      id: undefined,
      password: 'Kh@taProxy2026Xy',
      // Onboarding refuses without all four; that rule has its own tests.
      documents: REQUIRED_DOCUMENT_NAMES.map((name) => ({
        name,
        status: 'pending',
        fileUrl: `uploads/draft-9/${name}`,
      })),
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(events).toContain('post');
    expect(attachWholesalerDocuments).not.toHaveBeenCalled();
  });
});
