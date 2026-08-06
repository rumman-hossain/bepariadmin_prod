/**
 * Which lifecycle controls a shop's status earns.
 *
 * Extracted from the detail header so the rule can be read in one place and
 * tested without rendering a page that needs a router, a query client and four
 * mutations. The header renders what this returns and decides nothing itself.
 *
 * The rule, entire:
 *
 *   pending    Approve · Reject          — an application awaiting a decision
 *   active     Suspend                   — trading; stopping it is the only lever
 *   suspended  Restore access · Delete   — delete HIDES, keeping the history
 *   rejected   Delete permanently        — destroys, and only if it left nothing
 *
 * Delete is ABSENT for active and pending rather than present-and-refusing. A
 * button that exists only to say no teaches an operator to stop reading buttons,
 * and the intermediate step — suspend, or reject — is what makes the decision
 * deliberate rather than a mis-click away from the row they meant to open.
 */
export interface LifecycleAffordance {
  /** The filled button: the decision this status is waiting for. */
  primary: 'approve' | 'restore' | null;
  canReject: boolean;
  canSuspend: boolean;
  canDelete: boolean;
  /** Whether deleting destroys the row or merely hides it. */
  deleteIsPermanent: boolean;
}

/**
 * Nothing destructive, and nothing at all.
 *
 * The fail-closed answer, named so callers who mean it can say so instead of
 * reaching the default branch through a status that does not exist.
 */
export const NO_LIFECYCLE_AFFORDANCE: LifecycleAffordance = {
  primary: null,
  canReject: false,
  canSuspend: false,
  canDelete: false,
  deleteIsPermanent: false,
};

export function lifecycleFor(status: string): LifecycleAffordance {
  switch (status) {
    case 'pending':
      return {
        primary: 'approve',
        canReject: true,
        canSuspend: false,
        // Reject first. Deleting an application nobody has ruled on would
        // discard the decision along with the row.
        canDelete: false,
        deleteIsPermanent: false,
      };
    case 'suspended':
      return {
        primary: 'restore',
        canReject: false,
        canSuspend: false,
        canDelete: true,
        // SOFT. A suspended shop has almost always traded, and its orders and
        // payments are not ours to erase.
        deleteIsPermanent: false,
      };
    case 'rejected':
      return {
        primary: null,
        canReject: false,
        canSuspend: false,
        canDelete: true,
        // HARD, and the server still refuses if the shop left anything behind.
        deleteIsPermanent: true,
      };
    case 'active':
      return {
        primary: null,
        canReject: false,
        canSuspend: true,
        canDelete: false,
        deleteIsPermanent: false,
      };
    default:
      /*
       * An unknown status offers NOTHING destructive.
       *
       * A state added to the database and not handled here must not fall
       * through to a delete button. Fail closed: the operator sees the read-only
       * screen and somebody adds the case deliberately.
       */
      return NO_LIFECYCLE_AFFORDANCE;
  }
}
