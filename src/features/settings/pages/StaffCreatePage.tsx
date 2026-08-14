import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { Page, PageHeader, Panel, Stack, Row } from '@/src/components/layout/primitives';
import { Button, Input } from '@/src/components/controls';
import { Alert } from '@/src/components/feedback';
import { Text } from '@/src/components/data';
import { PasswordField } from '@/src/components/auth/PasswordField';
import { hashPassword, hashErrorMessage, validatePassword } from '@/src/auth/passwordHasher';
import { useAuth } from '@/src/hooks/useAuth';
import { useToast } from '@/src/components/feedback';
import { hasRole, SUPER_ADMIN_ONLY, type StaffRole } from '@/src/auth/roles';
import { createStaff } from '../api/staffCreateApi';
import { useStaff, useUpdateStaff, useSetStaffPassword } from '../hooks/useSettings';


/**
 * ONE SCREEN FOR CREATING AND FOR EDITING A STAFF ACCOUNT.
 *
 * The same form, because it is the same information — and an operator who has
 * learned where the fields are should not have to learn again to correct one.
 * The route decides which it is: `/settings/staff/new` creates,
 * `/settings/staff/:id/edit` edits.
 *
 * # What differs, and why only these
 *
 *   WHO MAY BE HERE.  Creating is super-admin only, as the server has always
 *                     enforced. EDITING is wider by instruction: an admin may
 *                     edit anyone except a super admin, which is exactly the
 *                     rule internal/settings/authority.go applies server-side.
 *
 *   THE PASSWORD.     On create it is required — the account needs one. On edit
 *                     it is a RESET and therefore optional: left blank, the
 *                     current password stands. Filled in, every session that
 *                     account holds ends immediately, which is usually the point.
 */
export function StaffCreatePage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const { id: editingId } = useParams<{ id: string }>();
  const isEdit = Boolean(editingId);

  /*
   * Creating stays super-admin only. Editing follows the server's rule: a super
   * admin reaches anyone, an admin reaches anyone who is not a super admin. The
   * target's role is only known once the list has loaded, so the check below
   * waits for it rather than guessing.
   */
  const staff = useStaff();
  const target = staff.data?.find((a) => a.id === editingId);
  const canCreate = hasRole(user?.role, SUPER_ADMIN_ONLY);
  const canEdit =
    user?.role === 'super_admin' ||
    (user?.role === 'admin' && target?.role !== 'super_admin');
  const allowed = isEdit ? canEdit : canCreate;

  const updateStaffM = useUpdateStaff();
  const setPasswordM = useSetStaffPassword();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');

  /*
   * Seeded from the account being edited, once, keyed on its id — so a second
   * account opened after a first does not inherit the first one's values.
   */
  const [seeded, setSeeded] = useState<string | null>(null);
  if (target && seeded !== target.id) {
    setSeeded(target.id);
    setName(target.name ?? '');
    setEmail(target.email ?? '');
    // Seeded now that the list carries it — an empty box after a successful save
    // is what made the save look like it had failed.
    setMobile(target.phone ?? '');
  }
  /*
   * Fixed, not chosen — see the panel below. `admin` is the only role this form
   * can produce, so it is a constant rather than a piece of state nobody sets.
   */
  const role: StaffRole = 'admin';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  /*
   * Shown rather than hidden.
   *
   * The route is guarded and the server is SuperAdminOnly, so this is the case
   * where somebody typed the URL or followed a stale link. Saying which role is
   * needed beats a blank page or a silent redirect that looks like a bug.
   */
  if (!allowed) {
    return (
      <Page>
        <PageHeader title={isEdit ? 'Edit staff account' : 'New staff account'} onBack={() => navigate('/settings?tab=access')} />
        <Alert tone="warn" title="Only a super admin can create staff accounts">
          Ask one of them to add this person, or to change your role first.
        </Alert>
      </Page>
    );
  }

  const policy = validatePassword(password);
  const mismatch = confirm.length > 0 && confirm !== password;
  /*
   * On EDIT the password is optional — blank means "leave it alone" — so it only
   * has to satisfy the policy when something was actually typed. Requiring it
   * would make correcting a spelling mistake also a forced password reset, which
   * signs the person out of every device for no reason.
   *
   * The mobile is likewise not re-demanded on edit: the list does not carry it,
   * so an empty box means unchanged rather than "erase it".
   */
  const wantsPassword = password.length > 0 || confirm.length > 0;
  const passwordOk = isEdit
    ? (!wantsPassword || (policy.valid && confirm === password))
    : (policy.valid && confirm === password);
  const ready =
    name.trim().length > 1 &&
    email.trim().length > 3 &&
    (isEdit || mobile.trim().length > 0) &&
    passwordOk;

  const submit = async () => {
    setFailure(null);
    setSaving(true);
    try {
      if (isEdit && editingId) {
        await updateStaffM.mutateAsync({
          id: editingId,
          name: name.trim(),
          email: email.trim(),
          phone: mobile.trim(),
        });
        /*
         * The password is a SECOND call, and deliberately after the details.
         * It ends every session that account holds, so doing it first would sign
         * the person out and then risk failing to save the change that mattered.
         */
        if (wantsPassword) {
          const passwordHash = await hashPassword(password);
          await setPasswordM.mutateAsync({ id: editingId, passwordHash });
        }
        toast.success(
          'Account updated',
          wantsPassword
            ? `${name.trim()} has been signed out everywhere and will need the new password.`
            : `${name.trim()}'s details were saved.`,
        );
        navigate('/settings?tab=access');
        return;
      }

      // Client-side, like every other password path here. The server argon2ids
      // whatever it receives; it never sees the plaintext.
      const passwordHash = await hashPassword(password);
      const created = await createStaff({
        name: name.trim(),
        email: email.trim(),
        mobile: mobile.trim(),
        role,
        passwordHash,
      });
      toast.success(
        'Account created',
        `${created.name} can sign in with ${created.email}.`,
      );
      navigate('/settings?tab=access');
    } catch (err) {
      // A hashing failure is a different problem from a rejected request, and
      // "update your browser" is not advice a 409 should produce.
      setFailure(
        hashErrorMessage(err) ??
          (err instanceof Error
            ? err.message
            : isEdit
              ? 'The account could not be saved'
              : 'The account could not be created'),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Page>
      <PageHeader
        title={isEdit ? 'Edit staff account' : 'New staff account'}
        subtitle="They can sign in as soon as you save this."
        onBack={() => navigate('/settings?tab=access')}
      />

      <Stack gap="lg">
        <Panel title="Who they are">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              placeholder="Their name as colleagues will know it"
            />
            <Input
              label="Sign-in email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@bepari-bd.com"
            />
            <div className="flex flex-col gap-1">
              <Input
                label="Mobile"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="01711000000"
                inputMode="tel"
              />
              {/*
                Required by the server, and — since 000106 — actually stored.
                Worth saying what it buys, because until now this field was
                demanded and thrown away.
              */}
              <Text variant="caption">
                They can sign in with this as well as the email, and codes go here by SMS.
              </Text>
            </div>
          </div>
        </Panel>

        <Panel title="What they can reach">
          <Stack gap="md">
            {/*
              NO CHOICE, BECAUSE THERE IS ONLY ONE.
              
              This offered seven roles. The platform now runs on two — one super
              admin and one admin — and both are singletons enforced by a unique
              index (migration 000117). A super admin cannot be created from a
              form at all; the server has always refused it, on the grounds that
              the most privileged tier should not be mintable.
              
              So the only account this form can produce is an admin, and asking
              which role to use would be a question with one answer whose other
              options all fail.
            */}
            <Text variant="secondary">
              This creates an <strong>Admin</strong> — suppliers, retailers and the
              catalogue, but not the books. There can be only one, so if an admin
              already exists you will need to remove that account first.
            </Text>
          </Stack>
        </Panel>

        <Panel title={isEdit ? 'Reset their password' : 'Their first password'}>
          <Stack gap="md">
            <Text variant="secondary">
              {isEdit
                ? 'Leave both boxes empty to keep the current password. Setting one signs them out on every device, which is usually the reason for doing it.'
                : 'Give it to them directly, and ask them to change it from their profile once they are in.'}
            </Text>
            <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
              {/* `allowGenerate`, which is exactly the case it exists for: an
                  admin setting a password on somebody else's behalf. */}
              <PasswordField
                label="Password"
                value={password}
                onChange={setPassword}
                allowGenerate
                autoComplete="new-password"
              />
              <PasswordField
                label="Confirm password"
                value={confirm}
                onChange={setConfirm}
                showStrength={false}
                autoComplete="new-password"
                error={mismatch ? 'The two passwords do not match' : undefined}
              />
            </div>
          </Stack>
        </Panel>

        {failure && <Alert tone="bad" title={failure} />}

        <Row gap="sm" className="justify-end">
          <Button
            variant="secondary"
            size="md"
            onClick={() => navigate('/settings?tab=access')}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            iconLeft={UserPlus}
            disabled={!ready || saving}
            onClick={() => void submit()}
          >
            {saving ? (isEdit ? 'Saving…' : 'Creating…') : (isEdit ? 'Save changes' : 'Create account')}
          </Button>
        </Row>
      </Stack>
    </Page>
  );
}
