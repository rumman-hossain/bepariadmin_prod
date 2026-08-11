import { useState } from 'react';
import { AtSign, Phone, ShieldCheck } from 'lucide-react';
import { Page, PageHeader, Panel, Stack, Row } from '@/src/components/layout/primitives';
import { Button, Input } from '@/src/components/controls';
import { Alert } from '@/src/components/feedback';
import { Text, StatusBadge } from '@/src/components/data';
import { ChangePasswordForm } from '@/src/components/auth/ChangePasswordForm';
import { useAuth } from '@/src/hooks/useAuth';
import { useToast } from '@/src/components/feedback';
import { asStaffRole, ROLE_LABEL } from '@/src/auth/roles';
import { updateProfile } from '../api/profileApi';

/**
 * YOUR OWN DETAILS.
 *
 * There was no such screen. `GET /auth/me` existed and nothing could write to
 * it, so a staff member's name and mobile were fixed at whatever a super admin
 * typed when the account was made — changeable only by someone with database
 * access. Changing your password meant finding a key icon in the header.
 *
 * # What is stated rather than editable
 *
 * Role and status appear as badges. They are decisions made ABOUT somebody, not
 * by them, and a field that let a viewer set their own role to super_admin
 * would be the shortest privilege escalation in the system. The server refuses
 * either way — `PATCH /auth/me` has no role or status in its request type — but
 * a screen should not offer a control that will be ignored.
 *
 * The primary email is the same case for a different reason: it is the
 * identifier the account signs in with, and changing it without a verification
 * round-trip is how somebody locks themselves out at 2am.
 *
 * # The caption under the secondary email is load-bearing
 *
 * It is a contact address. Nothing signs in with it and no password reset goes
 * to it. An operator who assumes otherwise will rely on it in exactly the
 * moment it does not work, so the screen says so plainly instead of leaving the
 * field to imply a recovery route it does not provide.
 */

/** A labelled value that cannot be edited, alongside the fields that can. */
function Fixed({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof AtSign;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Text as="p" variant="label">
        {label}
      </Text>
      {/*
        Rendered as a bordered row rather than a disabled <input>. A greyed-out
        field invites clicking, and a control that ignores the click is a worse
        answer than a value that never looked like one.
      */}
      <div className="flex items-center gap-2 rounded-lg border border-rule bg-sheet-2 px-3 py-2">
        <Icon className="h-4 w-4 shrink-0 text-ink-3" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate text-sm text-ink">{value || '—'}</span>
      </div>
      <Text variant="caption">{hint}</Text>
    </div>
  );
}

export function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const toast = useToast();

  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [secondaryEmail, setSecondaryEmail] = useState(user?.secondaryEmail ?? '');
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  if (!user) {
    // Reachable only in the instant between a session ending and the redirect.
    return (
      <Page>
        <PageHeader title="Your profile" />
        <Alert tone="warn" title="You are not signed in" />
      </Page>
    );
  }

  const role = asStaffRole(user.role);
  const trimmed = {
    name: name.trim(),
    phone: phone.trim(),
    secondaryEmail: secondaryEmail.trim(),
  };

  /*
   * Dirty rather than always-enabled. Saving an unchanged form still writes a
   * row and still bumps updated_at, which makes the audit trail claim an edit
   * that never happened.
   */
  const dirty =
    trimmed.name !== (user.name ?? '') ||
    trimmed.phone !== (user.phone ?? '') ||
    trimmed.secondaryEmail !== (user.secondaryEmail ?? '');

  const save = async () => {
    setFailure(null);
    setSaving(true);
    try {
      await updateProfile(trimmed);
      // The header shows this name; without the refresh it keeps the old one
      // and the save reads as having failed.
      await refreshUser();
      toast.success('Saved', 'Your details are up to date.');
    } catch (err) {
      setFailure(err instanceof Error ? err.message : 'Your details could not be saved');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Page>
      <PageHeader
        title="Your profile"
        subtitle="Your name and how the team reaches you."
      />

      <Stack gap="lg">
        <Panel title="Who you are">
          <Stack gap="md">
            <Row gap="md" className="items-center">
              <span
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brass-wash text-base font-semibold text-brass"
                aria-hidden="true"
              >
                {initials(user.name || user.email)}
              </span>
              <div className="flex min-w-0 flex-col gap-1">
                <Row gap="sm" className="flex-wrap items-center">
                  {/* Named, not shown raw: an unrecognised role reads as a bug
                      rather than as a string nobody has a label for. */}
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-rule bg-sheet-2 px-2.5 py-1 text-2xs font-semibold text-ink-2">
                    <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                    {role ? ROLE_LABEL[role] : 'Unknown role'}
                  </span>
                  <StatusBadge status={user.emailVerified ? 'active' : 'pending'} />
                </Row>
                <Text variant="caption">
                  Your role decides what you can reach. Only a super admin can change it.
                </Text>
              </div>
            </Row>

            <div className="max-w-sm">
              <Input
                label="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={120}
                placeholder="Your name as colleagues know it"
              />
            </div>
          </Stack>
        </Panel>

        <Panel title="How we reach you">
          <Stack gap="md">
            <div className="grid gap-4 sm:grid-cols-2">
              <Fixed
                label="Sign-in email"
                value={user.email}
                hint="This is how you sign in, so it cannot be changed here."
                icon={AtSign}
              />

              <div className="flex flex-col gap-1">
                <Input
                  label="Mobile"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01711000000"
                  inputMode="tel"
                />
                <Text variant="caption">
                  You can sign in with this and receive codes by SMS. Leave it empty to
                  use only your email.
                </Text>
              </div>
            </div>

            <div className="max-w-md">
              <Input
                label="Secondary email"
                type="email"
                value={secondaryEmail}
                onChange={(e) => setSecondaryEmail(e.target.value)}
                placeholder="you@example.com"
              />
              {/*
                Said plainly, and it matters. The field looks exactly like a
                recovery address, and somebody who believes it is one will find
                out otherwise on the day they are locked out.
              */}
              <Text variant="caption">
                A contact address only — it cannot sign you in and cannot receive a
                password reset.
              </Text>
            </div>

            {failure && <Alert tone="bad" title={failure} />}

            <Row gap="sm" className="justify-end">
              <Button
                variant="primary"
                size="md"
                iconLeft={Phone}
                disabled={!dirty || saving || trimmed.name.length === 0}
                onClick={() => void save()}
              >
                {saving ? 'Saving…' : 'Save changes'}
              </Button>
            </Row>
          </Stack>
        </Panel>

        {/*
          Inline, not behind the header's key icon.

          The control still exists up there and still works — this is where
          somebody looks for it. A password is part of your account, and putting
          it on the account page costs nothing: the form is the same component,
          already written and already tested.
        */}
        <Panel title="Password">
          <ChangePasswordForm
            onSuccess={() =>
              toast.success('Password changed', 'Use your new password next time you sign in.')
            }
          />
        </Panel>
      </Stack>
    </Page>
  );
}

/** Up to two letters, matching the header badge so they read as the same person. */
function initials(from: string): string {
  const parts = from.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
