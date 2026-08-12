/**
 * Whether the sidebar should start open, given the viewport width.
 *
 * Lives beside AppLayout rather than inside it because a file that exports both
 * a component and a plain function loses Fast Refresh for the whole module —
 * `react-refresh/only-export-components`. Editing the layout would then reload
 * the page instead of patching the component, which quietly costs every future
 * edit to that screen.
 *
 * Tested on its own, which was already the reason it was exported. Rendering
 * AppLayout to assert one boolean drags in the router's data APIs and the theme
 * provider, and a test that heavy tends to be deleted the first time it breaks
 * for an unrelated reason.
 *
 * `>=`, matching Sidebar's `closeOnMobile` which closes below 1024. Two
 * components disagreeing by a pixel is how a drawer ends up open on the one
 * width nobody checks.
 */
export const DOCKED_FROM = 1024;

export function sidebarStartsOpen(viewportWidth: number): boolean {
  return viewportWidth >= DOCKED_FROM;
}
