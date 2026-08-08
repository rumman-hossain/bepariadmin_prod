import { Loader2 } from 'lucide-react';
import { Text } from '@/src/components/data';

interface BlockingOverlayProps {
  open: boolean;
  title: string;
  /** One line. Say what not to do, or how long it will take. */
  detail?: string;
}

/**
 * Full-screen busy state for a write that must not be interrupted.
 *
 * Two hand-rolled copies existed, on the supplier create and edit screens, with
 * different colours, different radii and different copy. Both also carried
 * `aria-hidden="true"` on the outer element — which hid the very status text
 * they existed to convey, so a screen-reader user got a silent, unexplained
 * freeze. This announces politely instead.
 *
 * Reserve it for writes where a mid-flight reload would leave inconsistent
 * state. Ordinary saves should use a button's own loading state and leave the
 * rest of the page usable.
 */
export function BlockingOverlay({ open, title, detail }: BlockingOverlayProps) {
  if (!open) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-(--z-modal) flex items-center justify-center bg-sheet-inverse/50 backdrop-blur-sm"
    >
      <div className="mx-4 flex max-w-sm flex-col items-center gap-3 rounded-lg border border-rule bg-sheet px-8 py-7 text-center shadow-modal">
        <Loader2 className="h-8 w-8 animate-spin text-brass" aria-hidden="true" />
        <p className="text-md font-semibold text-ink">{title}</p>
        {detail && <Text as="p" variant="secondary">{detail}</Text>}
      </div>
    </div>
  );
}
