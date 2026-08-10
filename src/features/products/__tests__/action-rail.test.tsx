// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { ProductActionRail } from '../components/ProductActionRail';
import {
  deriveProductState,
  LEGAL_VERBS,
  PRODUCT_STATES,
  type ProductState,
} from '../types/adminProduct';

/**
 * The rail must offer exactly what the server will accept.
 *
 * `LEGAL_VERBS` is a MIRROR of the transition table in
 * `internal/product/lifecycle.go`. A mirror that drifts is worse than no
 * mirror: the screen offers Approve on a PUBLIC product, the operator presses
 * it, and the server refuses — so the console has taught them that its buttons
 * are guesses.
 *
 * These tests pin the mirror against the table as written in Go:
 *
 *   approve   PENDING          → APPROVED
 *   reject    PENDING          → REJECTED   (reason)
 *   publish   APPROVED         → PUBLIC     (>= 1 image)
 *   takeDown  DRAFT | PENDING | REJECTED | APPROVED | PUBLIC → PRIVATE (reason)
 */

const noop = () => {};

function renderRail(state: ProductState | '', imageCount = 3) {
  return render(
    <ProductActionRail
      state={state}
      imageCount={imageCount}
      onApprove={noop}
      onReject={noop}
      onPublish={noop}
      onTakeDown={noop}
      onEdit={noop}
    />,
  );
}

afterEach(cleanup);

describe('the legal-verb table mirrors the server', () => {
  it('allows approve and reject from PENDING only', () => {
    for (const s of PRODUCT_STATES) {
      expect([s, LEGAL_VERBS[s].includes('approve')]).toEqual([s, s === 'PENDING']);
      expect([s, LEGAL_VERBS[s].includes('reject')]).toEqual([s, s === 'PENDING']);
    }
  });

  it('allows publish from APPROVED only', () => {
    for (const s of PRODUCT_STATES) {
      expect([s, LEGAL_VERBS[s].includes('publish')]).toEqual([s, s === 'APPROVED']);
    }
  });

  it('allows take-down from every live state, and not from REMOVED', () => {
    for (const s of PRODUCT_STATES) {
      expect([s, LEGAL_VERBS[s].includes('takeDown')]).toEqual([s, s !== 'REMOVED']);
    }
  });
});

describe('the rail renders only the legal verbs', () => {
  it('offers Approve and Reject when pending', () => {
    renderRail('PENDING');
    expect(screen.getByRole('button', { name: /approve/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /reject/i })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^publish$/i })).toBeNull();
  });

  it('never offers Approve on a product that is already live', () => {
    renderRail('PUBLIC');
    expect(screen.queryByRole('button', { name: /approve/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /reject/i })).toBeNull();
    // Take down is the one thing left to do to a live product.
    expect(screen.getByRole('button', { name: /take down/i })).toBeTruthy();
  });

  it('offers Publish once approved', () => {
    renderRail('APPROVED');
    expect(screen.getByRole('button', { name: /publish/i })).toBeTruthy();
  });

  it('leaves a removed product with no lifecycle action at all', () => {
    renderRail('REMOVED');
    for (const name of [/approve/i, /reject/i, /publish/i, /take down/i]) {
      expect(screen.queryByRole('button', { name })).toBeNull();
    }
    // Edit stays: it is not a lifecycle verb.
    expect(screen.getByRole('button', { name: /edit product/i })).toBeTruthy();
  });

  it('states the verdict being asked for rather than only listing buttons', () => {
    renderRail('PENDING');
    expect(screen.getByText(/needs your review/i)).toBeTruthy();
  });
});

describe('the publish gate is stated, not hidden', () => {
  it('disables Publish and gives the reason when there are no images', () => {
    renderRail('APPROVED', 0);

    const publish = screen.getByRole('button', { name: /publish/i }) as HTMLButtonElement;
    // Disabled, NOT absent. A missing button answers "why can't I publish?"
    // with silence; a disabled one answers with the thing to go and fix.
    expect(publish.disabled).toBe(true);
    expect(screen.getByText(/needs at least one image/i)).toBeTruthy();
  });

  it('enables Publish and says the gate is clear when images exist', () => {
    renderRail('APPROVED', 5);

    const publish = screen.getByRole('button', { name: /publish/i }) as HTMLButtonElement;
    expect(publish.disabled).toBe(false);
    expect(screen.getByText(/gate clear/i)).toBeTruthy();
  });
});

describe('deriving the state from a detail product', () => {
  /*
   * The detail route returns the DISPLAY vocabulary — `mapProduct` has already
   * turned `pending_review` into `'Pending Approval'` — so this has to read
   * both. It historically has.
   */
  it.each([
    ['Pending Approval', 'Private', 'PENDING'],
    ['pending_review', 'private', 'PENDING'],
    ['Draft', 'Private', 'DRAFT'],
    ['Rejected', 'Private', 'REJECTED'],
  ])('maps %s to %s', (status, visibility, expected) => {
    expect(deriveProductState(status, visibility)).toBe(expected);
  });

  /*
   * The one pair that shares a status column. Getting this wrong shows a live
   * product as merely approved, and offers Publish on something already public.
   */
  it('parts APPROVED from PUBLIC on visibility alone', () => {
    expect(deriveProductState('Approved', 'Private')).toBe('APPROVED');
    expect(deriveProductState('Approved', 'Public')).toBe('PUBLIC');
  });

  it('reports REMOVED regardless of status when deleted', () => {
    expect(deriveProductState('Approved', 'Public', true)).toBe('REMOVED');
  });

  it('returns empty for a status it does not recognise, rather than guessing', () => {
    // Folding an unknown into DRAFT would render it as something an operator
    // can act on. The server returns "" here for the same reason.
    expect(deriveProductState('teleported', 'Public')).toBe('');
  });
});

describe('delete, which had a mutation and no button', () => {
  /*
   * `useDeleteProduct` sat in queries.ts with no caller anywhere in the app.
   * The bulk bar offers Approve and Reject only, and nothing else in the
   * console could remove a product — deleting the two QA products created while
   * testing required calling DELETE /api/v1/products/{id} by hand.
   */
  const withDelete = (state: ProductState | '', onDelete?: () => void) =>
    render(
      <ProductActionRail
        state={state}
        imageCount={3}
        onApprove={noop}
        onReject={noop}
        onPublish={noop}
        onTakeDown={noop}
        onEdit={noop}
        onDelete={onDelete}
      />,
    );

  const deleteButton = () => screen.queryByRole('button', { name: /delete product/i });

  it.each(['DRAFT', 'PENDING', 'APPROVED', 'PUBLIC', 'REJECTED'] as ProductState[])(
    'offers delete on a %s product',
    (state) => {
      withDelete(state, noop);
      expect(deleteButton()).not.toBeNull();
    },
  );

  it('does NOT offer delete on an already-removed product', () => {
    /*
     * The endpoint soft-deletes — that is what the Removed tab is, and why
     * order history still resolves. A Delete button on a removed product would
     * promise a second, harder deletion that nothing performs.
     */
    withDelete('REMOVED', noop);
    expect(deleteButton()).toBeNull();
  });

  it('renders no delete button at all when the caller supplies no handler', () => {
    // A button that does nothing is worse than an absent one.
    withDelete('PENDING');
    expect(deleteButton()).toBeNull();
  });
});
