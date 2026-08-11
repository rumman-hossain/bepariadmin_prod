import type { AuthUser } from '../types/auth';

/**
 * `/auth/me`'s payload → the user object the whole app reads.
 *
 * ONE COPY, and the reason is a bug that reached dev.
 *
 * There were two identical-looking versions — one in `AuthContext.tsx` for
 * sign-in and for an explicit refresh, one in `sessionRestore.ts` for the
 * bootstrap that runs on every page load. Adding `secondaryEmail` to the first
 * and not the second produced a profile field that saved correctly, returned
 * correctly in the PATCH response, showed correctly until the tab was
 * reloaded — and then came back blank. The save looked like it had silently
 * failed; the write was perfectly fine.
 *
 * The two are far apart in the tree and each looks complete on its own, which
 * is exactly the shape of drift nobody notices. `ROLE_LABEL` had already done
 * the same thing in this codebase, with a role that read "Unknown role" for
 * months.
 *
 * A test asserts this is the only definition.
 */
export function mapUser(me: Record<string, unknown>): AuthUser {
  return {
    id: me.id as string,
    name: (me.name as string) || '',
    email: (me.email as string) || '',
    role: (me.role as string) || '',
    phone: (me.phone as string) || undefined,
    secondaryEmail: (me.secondaryEmail as string) || undefined,
    shopName: (me.shopName as string) || undefined,
    logoUrl: (me.logoUrl as string) || undefined,
    code: (me.code as string) || undefined,
    emailVerified: (me.emailVerified as boolean) !== false,
  };
}
