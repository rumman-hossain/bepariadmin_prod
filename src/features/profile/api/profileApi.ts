import { z } from 'zod';
import { request } from '@/src/api/client';
import { API_V1 } from '@/src/utils/constants';

/*
 * A staff member's own details.
 *
 * Built from API_V1 rather than a bare path, like every other module here:
 * Firebase Hosting rewrites only `/api/**` to Cloud Run and serves index.html
 * for anything else, so an unprefixed path returns 200 carrying the SPA's own
 * HTML and the caller parses a web page as JSON. Nothing 404s and nothing
 * reaches the backend logs. Guard G17 rejects an unprefixed path.
 */

export const profileSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.string(),
  status: z.string().optional().default(''),
  phone: z.string().optional().default(''),
  /**
   * A CONTACT address, not a credential.
   *
   * Saved unverified, and the server neither signs anybody in with it nor sends
   * a password reset to it — see migration 000106. The screen says so out loud,
   * because an operator who believes otherwise will rely on it in exactly the
   * moment it does not work.
   */
  secondaryEmail: z.string().optional().default(''),
});
export type Profile = z.infer<typeof profileSchema>;

export interface ProfileEdit {
  name: string;
  phone: string;
  secondaryEmail: string;
}

/**
 * Save the fields a person owns about themselves.
 *
 * No id in the body, deliberately: the server takes the subject from the access
 * token. Sending one would be ignored, and having one in the type would invite
 * a future caller to believe it meant something.
 */
export async function updateProfile(edit: ProfileEdit): Promise<Profile> {
  const res = await request<unknown>('PATCH', `${API_V1}/auth/me`, {
    auth: true,
    body: { ...edit },
  });
  if (!res.ok) {
    // The server's own words. Each refusal here names something actionable —
    // a number already in use, a number that is not a Bangladeshi mobile — and
    // flattening them to "could not save" sends the operator looking blindly.
    const detail = (res.data as { error?: { message?: string } } | undefined)?.error?.message;
    throw new Error(detail ?? 'Your details could not be saved');
  }
  const parsed = z.object({ data: profileSchema }).safeParse(res.data);
  if (!parsed.success) throw new Error('The server replied in an unexpected shape');
  return parsed.data.data;
}
