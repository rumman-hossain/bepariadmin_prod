import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { cn } from '@/src/design-system/utils/cn';
import { CREATABLE_ROLES, createStaff } from '../api/staffCreateApi';

/**
 * A NEW STAFF ACCOUNT.
 *
 * `POST /auth/admin/create-staff` has existed for a long time with no way to
 * reach it: every colleague on this console was created with curl or by hand in
 * SQL. The Settings screen could list an account, change its role and disable
 * it, and could not make one.
 *
 * # A route, not a dialog
 *
 * Six fields including a password. A dialog that loses a half-typed password to
 * a stray click outside it is a small cruelty, and this form is not something
 * you do casually beside something else.
 *
 * # The role picker is the screen
 *
 * A `<select>` of five words would ask the operator to already know what
 * "operations" can reach. Each role is a card carrying what it actually does,
 * because choosing wrongly here is either a colleague who cannot work or one
 * who can see the cash book.
 *
 * `super_admin` is not offered, and the server refuses it too.
 *
 * # The password never leaves as plaintext
 *
 * Hashed client-side with the same PBKDF2 the sign-in form uses, through the
 * same shared policy — so a password this screen accepts is one the login
 * screen will accept back.
 */

function RoleCard({
  role,
  label,
  hint,
  selected,
  onSelect,
}: {
  role: StaffRole;
  label: string;
  hint: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        'flex w-full flex-col gap-1 rounded-xl border p-3 text-left transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rule-focus',
        selected
          ? 'border-brass bg-brass-wash'
          : 'border-rule bg-sheet hover:border-ink-4 hover:bg-sheet-hover',
      )}
    >
      <span className={cn('text-sm font-semibold', selected ? 'text-brass' : 'text-ink')}>
        {label}
      </span>
      <span className="text-2xs leading-snug text-ink-2">{hint}</span>
      {/* The stored value, for anyone matching this against the database or a
          log line. Small, because it is a reference and not the choice. */}
      <span className="font-mono text-2xs text-ink-4">{role}</span>
    </button>
  );
}

export function StaffCreatePage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const canCreate = hasRole(user?.role, SUPER_ADMIN_ONLY);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [role, setRole] = useState<StaffRole | null>(null);
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
  if (!canCreate) {
    return (
      <Page>
        <PageHeader title="New staff account" onBack={() => navigate('/settings?tab=access')} />
        <Alert tone="warn" title="Only a super admin can create staff accounts">
          Ask one of them to add this person, or to change your role first.
        </Alert>
      </Page>
    );
  }

  const policy = validatePassword(password);
  const mismatch = confirm.length > 0 && confirm !== password;
  const ready =
    name.trim().length > 1 &&
    email.trim().length > 3 &&
    mobile.trim().length > 0 &&
    role !== null &&
    policy.valid &&
    confirm === password;

  const submit = async () => {
    if (!role) return;
    setFailure(null);
    setSaving(true);
    try {
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
          (err instanceof Error ? err.message : 'The account could not be created'),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Page>
      <PageHeader
        title="New staff account"
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
            <Text variant="secondary">
              Pick the narrowest one that lets them do their job. A super admin can
              change it later.
            </Text>
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {CREATABLE_ROLES.map((r) => (
                <RoleCard
                  key={r.value}
                  role={r.value}
                  label={r.label}
                  hint={r.hint}
                  selected={role === r.value}
                  onSelect={() => setRole(r.value)}
                />
              ))}
            </div>
          </Stack>
        </Panel>

        <Panel title="Their first password">
          <Stack gap="md">
            <Text variant="secondary">
              Give it to them directly, and ask them to change it from their profile
              once they are in.
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
            {saving ? 'Creating…' : 'Create account'}
          </Button>
        </Row>
      </Stack>
    </Page>
  );
}
