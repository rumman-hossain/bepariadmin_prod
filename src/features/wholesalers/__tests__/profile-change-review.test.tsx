// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { ProfileChangeReviewPanel } from '../components/ProfileChangeReviewPanel';

vi.mock('../api/wholesalerApi', () => ({
  reviewWholesalerProfileChange: vi.fn(),
}));

afterEach(cleanup);

/**
 * THE QUEUE OF SUPPLIER-PROPOSED CHANGES, AND WHAT AN OPERATOR IS SHOWN.
 *
 * A supplier can edit their own address and payout accounts from the app. The
 * edit changes nothing: a `pending` row is filed beside the live one and money
 * keeps going to the account already approved. This panel is the only place that
 * decision can be made, so the failure that matters is not an ugly card — it is
 * showing the wrong "current" value beside a proposal, because that is what an
 * operator compares against before approving where money goes.
 */

const bank = (over: Record<string, unknown>) => ({
  id: 'b1', bankName: 'EBL', accountNumber: '435353653', accountName: 'X Man', ...over,
});

describe('only a pending entry raises a decision', () => {
  it('renders nothing at all when everything is settled', () => {
    const { container } = render(
      <ProfileChangeReviewPanel
        wholesalerId="w1"
        addresses={[]}
        bankAccounts={[bank({ status: 'approved' })]}
        wallets={[]}
        onReviewed={() => {}}
      />,
    );
    /*
     * Not an empty "no pending changes" card. This screen already carries the
     * supplier's whole record, and a permanent empty box would sit on every
     * supplier who has never submitted anything.
     */
    expect(container.firstChild).toBeNull();
  });

  it('raises one decision for a pending entry', () => {
    render(
      <ProfileChangeReviewPanel
        wholesalerId="w1"
        addresses={[]}
        bankAccounts={[bank({ status: 'approved' }), bank({ id: 'b2', accountNumber: '999888777', status: 'pending' })]}
        wallets={[]}
        onReviewed={() => {}}
      />,
    );
    expect(screen.getByText(/Requested changes \(1\)/)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Approve/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Reject/i })).toBeTruthy();
  });
});

describe('the operator sees what it would replace', () => {
  it('pairs a change with the entry it NAMES, not with whichever came first', () => {
    render(
      <ProfileChangeReviewPanel
        wholesalerId="w1"
        addresses={[]}
        bankAccounts={[
          bank({ id: 'b1', status: 'approved', accountNumber: '111111111' }),
          bank({ id: 'b2', status: 'approved', accountNumber: '222222222' }),
          // A change to the SECOND account.
          bank({ id: 'b3', status: 'pending', accountNumber: '222222223', supersedesId: 'b2' }),
        ]}
        wallets={[]}
        onReviewed={() => {}}
      />,
    );
    /*
     * The old code paired the pending row with "the approved one" — which with
     * two accounts on file is whichever came first. An operator would have
     * compared the proposal against an account nobody was changing, and
     * approved on that basis.
     */
    expect(screen.getByText(/222222222/)).toBeTruthy();  // the entry it replaces
    expect(screen.getByText(/222222223/)).toBeTruthy();  // the proposal
    expect(screen.queryByText(/111111111/)).toBeNull();  // the untouched account
  });

  it('never shows a REMOVED row as the current one', () => {
    render(
      <ProfileChangeReviewPanel
        wholesalerId="w1"
        addresses={[]}
        bankAccounts={[
          // The audit trail of a change settled a month ago.
          bank({ id: 'b0', status: 'removed', accountNumber: '111111111' }),
          bank({ id: 'b1', status: 'approved', accountNumber: '222222222' }),
          bank({ id: 'b2', status: 'pending', accountNumber: '333333333', supersedesId: 'b1' }),
        ]}
        wallets={[]}
        onReviewed={() => {}}
      />,
    );
    expect(screen.queryByText(/111111111/)).toBeNull();
    expect(screen.getByText(/222222222/)).toBeTruthy();
  });

  it('says an ADDITION replaces nothing, rather than showing a dash', () => {
    render(
      <ProfileChangeReviewPanel
        wholesalerId="w1"
        addresses={[]}
        bankAccounts={[
          bank({ id: 'b1', status: 'approved', accountNumber: '111111111' }),
          // No supersedesId — the supplier is ADDING a second account.
          bank({ id: 'b2', status: 'pending', accountNumber: '999999999' }),
        ]}
        wallets={[]}
        onReviewed={() => {}}
      />,
    );
    /*
     * An operator who read "Currently —" as "there is nothing on file" might
     * approve believing this was the only account. Saying it outright is the
     * difference between adding an account and replacing one.
     */
    expect(screen.getByText(/added alongside the existing ones/i)).toBeTruthy();
    expect(screen.getByText(/999999999/)).toBeTruthy();
  });

  it('raises a decision for EVERY waiting change, not one per kind', () => {
    render(
      <ProfileChangeReviewPanel
        wholesalerId="w1"
        addresses={[]}
        bankAccounts={[
          bank({ id: 'b1', status: 'approved', accountNumber: '111111111' }),
          bank({ id: 'b2', status: 'pending', accountNumber: '222222222', supersedesId: 'b1' }),
          bank({ id: 'b3', status: 'pending', accountNumber: '333333333' }),
        ]}
        wallets={[]}
        onReviewed={() => {}}
      />,
    );
    // A replacement and an addition are two separate decisions.
    expect(screen.getByText(/Requested changes \(2\)/)).toBeTruthy();
  });
});

describe('all three kinds are reviewable', () => {
  it('raises a decision for an address, a bank account and a wallet at once', () => {
    render(
      <ProfileChangeReviewPanel
        wholesalerId="w1"
        addresses={[{ id: 'a1', status: 'pending', addressLine: 'House 15', district: 'Dhaka' }]}
        bankAccounts={[bank({ id: 'b2', status: 'pending' })]}
        wallets={[{ id: 'k1', status: 'pending', walletType: 'bkash', accountNumber: '01654654454' }]}
        onReviewed={() => {}}
      />,
    );
    // Three independent decisions: the server keeps a separate pending slot per
    // kind, so one waiting bank change must not hide a waiting address change.
    expect(screen.getByText(/Requested changes \(3\)/)).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /Approve/i })).toHaveLength(3);
  });
});
