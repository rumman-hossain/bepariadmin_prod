/**
 * Add / Edit Product — the six-step wizard, for both.
 *
 * ONE FLOW, NOT TWO. Edit briefly had a sectioned single page here on the
 * argument that correcting one field should not cost six steps. In use that was
 * wrong: operators know this wizard from the supplier app, and two shapes for
 * one job is worse than a longer path through a familiar one. Add and edit
 * differ in exactly two things — the title, and the label on the final button.
 *
 * THE PAGE OWNS ITS SCROLLING. The route carries `handle: { fullBleed: true }`,
 * so the shell's `<main>` supplies neither padding nor scroll. This page fills
 * that region and hands the whole height to the wizard, which lays out as a
 * fixed header, a fixed step bar, one scrolling middle and a fixed footer —
 * structurally what `AddProductFlow.tsx` does in the wholesale app.
 *
 * What this replaced fought the shell instead: `-m-6 md:-m-8` to cancel padding
 * it missed by 8px, `min-h-full` inside an auto-height scroller, and a
 * `sticky top-0` header that stuck below `<main>`'s padding so content scrolled
 * up into the strip above it. Hence "header has gap", "cannot see the top
 * header", "scroll is broken" — three symptoms, one cause.
 *
 * NO APPROVE BUTTON. It used to sit in this header. Approving is a judgement
 * about a product, not a change to one, and it belongs on the detail page
 * beside the review checklist and the reason dialogs — where the rest of the
 * lifecycle already lives.
 */
import { useNavigate } from 'react-router-dom';
import { AddProductFlow } from '../components/AddProductFlow';
import { PRODUCT_ROUTES } from '../../routes';

export function AddProductPage() {
  const navigate = useNavigate();
  return (
    // h-full, not min-h-full: `<main>` is a bounded, non-scrolling region under
    // fullBleed, so the wizard can size its own scroller against a real height.
    // `min-h-full` would let this grow past the region and take the scroll with
    // it, which is the bug this replaces.
    <div className="h-full min-h-0">
      {/* `isEditMode` is derived inside the flow from the route param, so the
          mode is not passed down twice. */}
      <AddProductFlow onBack={() => navigate(PRODUCT_ROUTES.LIST)} />
    </div>
  );
}
