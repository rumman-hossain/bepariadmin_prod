import React from 'react';

interface AuthShellProps {
  /** Sits above the card. Use for a step title like "Check your email". */
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  /** Rendered under the card — a back link, a support note. */
  footer?: React.ReactNode;
}

/**
 * The frame around every unauthenticated screen.
 *
 * The same wordmark-plus-card markup was written out three times — twice in the
 * router and once in `ProtectedRoute` — each with its own hard-coded greys, so
 * the session-restore screen and the login screen were subtly different sizes.
 *
 * ## One column, at every width
 *
 * The card was 380px and read as a phone screen stretched into a browser. It is
 * 440px now with real hierarchy — a larger heading, a full-width submit, more
 * generous spacing — which is what makes it look like software rather than a
 * form someone dropped on a page.
 *
 * A previous revision of this file rendered a two-column layout with a Bengali
 * ledger motif and the wordmark খাতা. **That was wrong and it is gone.** "Khata"
 * was an internal codename for the colour tokens; it is not this product's
 * identity, and putting it on the sign-in screen branded the console as
 * something it is not. The only names here are BepariBD and Admin Control
 * Tower, which are the product's own.
 *
 * The shell owns the viewport rather than being centred by a parent, so every
 * auth route gets the same frame whether or not the router remembers to wrap
 * it — `/forgot-password` and `/reset-password` previously did not, and
 * rendered edge-to-edge with no card at all.
 */
export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-paper px-4 py-10">
      <div className="w-full max-w-[440px]">
        <div className="mb-7 flex flex-col items-center gap-2.5">
          <div className="flex items-center gap-2.5">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-md bg-brass text-base font-bold text-brass-content"
              aria-hidden="true"
            >
              B
            </span>
            <span className="text-2xl font-semibold tracking-tight text-ink">BepariBD</span>
          </div>
          <p className="text-sm text-ink-3">Admin Control Tower</p>
        </div>

        <div className="rounded-xl border border-rule bg-sheet px-6 py-7 sm:px-8 sm:py-8">
          {(title || subtitle) && (
            <div className="mb-6">
              {title && <h1 className="text-lg font-semibold text-ink">{title}</h1>}
              {subtitle && <p className="mt-1 text-sm text-ink-2">{subtitle}</p>}
            </div>
          )}
          {children}
        </div>

        {footer && <div className="mt-5 text-center text-sm text-ink-2">{footer}</div>}
      </div>
    </div>
  );
}
