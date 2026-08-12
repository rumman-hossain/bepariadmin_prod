import { Input } from '@/src/components/controls';
import { Text } from '@/src/components/data';
import { PasswordField } from '@/src/components/auth/PasswordField';
import { AnalyticalDetails } from './AnalyticalDetails';
import type { Assessment } from '../schemas/retailerSchema';
import { CategoryPicker } from './CategoryPicker';
import { AddressesSection } from './form/AddressesSection';
import { FinancialSection } from './form/FinancialSection';
import { DocumentsSection } from './form/DocumentsSection';
import type { PendingDoc } from '../hooks/useRetailerAssets';
import type { RetailerDocument } from '../schemas/retailerSchema';
import { splitCategories } from '../utils/splitCategories';

/**
 * The retailer form — used by both Add and Edit.
 *
 * One component rather than two, because the only difference between creating a
 * retailer and correcting one is the password field. Two forms would drift: the
 * edit screen would quietly lose a field somebody added to create, and nobody
 * would notice until an operator could not fix a phone number.
 */

/** A credential shown but not offered for editing. */
function ReadOnlyField({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <Text variant="caption">{label}</Text>
      <Text>{value || '—'}</Text>
      <Text variant="caption">{hint}</Text>
    </div>
  );
}

/**
 * A bank account and a mobile wallet on the form.
 *
 * `_key` is a client-side identity for rows that have no server id yet —
 * `useDefaultableList` assigns it so React can keep a half-typed row stable
 * while its siblings are added and removed around it. Index keys would make the
 * text you are typing jump to another card when one above it is deleted.
 */
export interface RetailerAddress {
  id?: string;
  _key?: string;
  addressType: string;
  division?: string;
  district: string;
  postalCode?: string;
  addressLine: string;
  isDefault?: boolean;
}

export interface RetailerBank {
  id?: string;
  _key?: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  branch?: string;
  routing?: string;
  isDefault?: boolean;
}

export interface RetailerWallet {
  id?: string;
  _key?: string;
  walletType: string;
  accountNumber: string;
  isDefault?: boolean;
}

export interface RetailerFormValues extends Assessment {
  name: string;
  shopName: string;
  phone: string;
  email: string;
  district: string;
  category: string;
  password?: string;
  addresses: RetailerAddress[];
  bankDetailsList: RetailerBank[];
  digitalWallets: RetailerWallet[];
}

export interface RetailerFormProps {
  values: RetailerFormValues;
  errors: Partial<Record<keyof RetailerFormValues, string>>;
  onChange: (patch: Partial<RetailerFormValues>) => void;
  /** Create shows a password field; edit does not — resetting is its own action. */
  mode: 'create' | 'edit';

  /*
   * Documents are owned by the PAGE, not this component.
   *
   * The upload draft has to outlive a re-render and be readable at submit — the
   * create call names it — so it belongs to whoever owns the submit. Holding it
   * here would mean the form knew about an id the page has to send.
   */
  pendingDocs: Record<string, PendingDoc>;
  onDocSelected: (
    key: string,
    purpose: string,
    position: number,
    imageOnly?: boolean,
  ) => (e: React.ChangeEvent<HTMLInputElement>) => void;
  missingRequired: string[];
  showMissingDocs?: boolean;
  existingDocs?: RetailerDocument[];
}

export function RetailerForm({
  values,
  errors,
  onChange,
  mode,
  pendingDocs,
  onDocSelected,
  missingRequired,
  showMissingDocs,
  existingDocs,
}: RetailerFormProps) {
  return (
    <div className="flex max-w-form flex-col gap-8">
      <section className="flex flex-col gap-4" aria-labelledby="shop-heading">
        <h2 id="shop-heading" className="text-md font-semibold text-ink">
          The shop
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Shop name"
            value={values.shopName}
            onChange={(e) => onChange({ shopName: e.target.value })}
            error={errors.shopName}
            required
          />
          <Input
            label="Owner name"
            value={values.name}
            onChange={(e) => onChange({ name: e.target.value })}
            error={errors.name}
            required
          />
          {/*
            Phone and email are the SIGN-IN CREDENTIALS, and editing them is a
            different job from correcting a shop name: it means rewriting the
            phone hash and ending every session, or the shop keeps a live
            session on a credential that no longer identifies it. The server
            does not bind either field on PATCH, so on edit they are shown and
            not offered.

            Rendered here rather than as a separate block on the edit screen so
            one component owns the field and decides how to present it. Two
            renderings would put phone on screen twice the first time somebody
            forgot which screen showed which.
          */}
          {mode === 'edit' ? (
            <>
              <ReadOnlyField
                label="Phone"
                value={values.phone}
                hint="How they sign in. Not editable — changing it would end every session."
              />
              <ReadOnlyField
                label="Email"
                value={values.email}
                hint="Also a sign-in credential, and fixed for the same reason."
              />
            </>
          ) : (
            <>
          <Input
            label="Phone"
            value={values.phone}
            onChange={(e) => onChange({ phone: e.target.value })}
            error={errors.phone}
            identifier
            inputMode="tel"
            /*
             * "e.g." carries real weight here. `identifier` sets the mono face,
             * which renders the placeholder heavy enough to read as a filled
             * value — on screen a bare "01712345678" is hard to tell from a
             * number somebody already typed, and a required field that looks
             * complete is a field that gets skipped. The prefix makes it
             * unambiguously an example, matching "e.g. 7" further down.
             */
            placeholder="e.g. 01712345678"
            hint="They can sign in with this number."
            required
          />
          <Input
            label="Email"
            type="email"
            value={values.email}
            onChange={(e) => onChange({ email: e.target.value })}
            error={errors.email}
            placeholder="Optional"
            hint="Only needed if they want to sign in by email."
          />
            </>
          )}
        </div>
      </section>

      {/*
        "Where it is" is gone, and with it the free-text District field.

        It asked for the district twice: once here, and again — as a proper
        picker, against the canonical list — on every address below. Two answers
        to one question is two chances to disagree, and the free-text one always
        loses: "Dhaka " and "dhaka" both filed a shop somewhere the district
        filter could not find it.

        `district` on the retailer row is still populated. CreatePage and
        EditPage derive it from the default address (see districtFromAddresses),
        so the column and the list filter keep working from the answer that was
        actually validated.
      */}
      <section className="flex flex-col gap-4" aria-labelledby="trade-heading">
        <h2 id="trade-heading" className="text-md font-semibold text-ink">
          What they sell
        </h2>
        <CategoryPicker
          value={splitCategories(values.category)}
          onChange={(next) => onChange({ category: next.join(', ') })}
          error={errors.category}
        />
      </section>

      {mode === 'create' && (
        <section className="flex flex-col gap-3" aria-labelledby="access-heading">
          <div>
            <h2 id="access-heading" className="text-md font-semibold text-ink">
              Access
            </h2>
            {/*
              Said plainly, because an operator typing somebody else's password
              deserves to know what happens to it. The hashing is real — see
              createRetailer — and this is not reassurance about work not done.
            */}
            <Text variant="caption">
              Hashed in this browser before it is sent. Nobody on the server, and nothing in a log,
              ever sees what you type.
            </Text>
          </div>
          <PasswordField
            label="Password"
            value={values.password ?? ''}
            onChange={(v) => onChange({ password: v })}
            error={errors.password}
            showStrength
            /*
             * Generate and copy, which PasswordField keeps off by default. Its
             * own docstring names this as the case it is for: an admin setting a
             * password FOR SOMEONE ELSE. Copy is paired with it deliberately —
             * an operator who generates sixteen characters and then retypes them
             * from the screen into a message gets one of them wrong.
             */
            allowGenerate
          />
          <Text variant="caption">
            Tell the shop out of band. This is the only time it is shown — you cannot read it back
            afterwards, only set a new one.
          </Text>
        </section>
      )}

      <AddressesSection
        addresses={values.addresses ?? []}
        onChange={(next) => onChange({ addresses: next })}
      />

      <FinancialSection
        banks={values.bankDetailsList ?? []}
        wallets={values.digitalWallets ?? []}
        onBanksChange={(next) => onChange({ bankDetailsList: next })}
        onWalletsChange={(next) => onChange({ digitalWallets: next })}
      />

      {/*
        Assessment BEFORE the documents.

        It used to sit last, after the uploads. Everything above it is typed;
        the uploads are the one section that has to finish over the network, and
        burying an optional typed section underneath meant an operator either
        waited on uploads to reach it or scrolled past it and never filled it
        in. Typed work now runs uninterrupted from top to bottom, and the
        uploads end the form.
      */}
      <AnalyticalDetails
        values={values}
        errors={errors}
        onChange={(patch) => onChange(patch)}
      />

      <DocumentsSection
        pendingDocs={pendingDocs}
        onFileSelected={onDocSelected}
        missingRequired={missingRequired}
        showMissing={showMissingDocs}
        existing={existingDocs}
      />
    </div>
  );
}
