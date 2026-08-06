import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { Input } from '@/src/components/controls';
import { FormSection } from '@/src/components/forms/FormSection';
import { FormField } from '@/src/components/forms/FormField';
import { useWholesalerFormContext } from './useWholesalerFormContext';

/**
 * How the supplier signs in.
 *
 * # Both credentials live here now
 *
 * This section showed the email alone, while the mobile number sat two sections
 * up labelled "Mobile Number" beside the owner's name — so nothing on screen
 * said the number was a way in, and an operator could reasonably read it as a
 * contact detail to call.
 *
 * It is a credential: the login query matches `phone_hash = $1 OR email = $2`,
 * and either one gets the supplier into the app. Both belong in the section
 * headed Login Credentials, which is the only place a reader looks to answer
 * "what does this account sign in with".
 *
 * The field is MOVED, not copied. Two inputs bound to `values.mobile` would be
 * two controls for one column, and the second one to be edited wins for reasons
 * invisible on screen.
 *
 * # Create and edit differ enough to branch
 *
 * Creating sets an initial password; editing offers a reset card instead and
 * must never prefill one.
 */
export function CredentialsSection({ aside }: { aside?: React.ReactNode }) {
  const { values, setField, fieldError, mode } = useWholesalerFormContext();

  const emailField = (
    <FormField label="Login Email" htmlFor="email" required error={fieldError('email')}>
      <Input
        id="email"
        type="email"
        placeholder="e.g. supplier@domain.com"
        value={values.email}
        onChange={(e) => setField('email', e.target.value)}
      />
    </FormField>
  );

  const phoneField = (
    <FormField label="Login Mobile" htmlFor="mobile" required error={fieldError('mobile')}>
      <Input
        id="mobile"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="e.g. 01712345678"
        value={values.mobile}
        onChange={(e) => setField('mobile', e.target.value)}
        /*
         * Said plainly, because the number used to look like a contact detail.
         * The server now refuses a create without it, so an operator who skips
         * it learns why here rather than from a rejected submit.
         *
         * On `Input` rather than `FormField`: the control already renders a
         * hint, wired to itself with aria-describedby. Adding a second hint slot
         * one level up would give the screen two places to put the same sentence
         * and one of them would be unannounced.
         */
        hint="They can sign in with this number, or with the email above."
      />
    </FormField>
  );

  return aside ? (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-start">
      <FormSection icon={ShieldAlert} title="Login Credentials">
        <div className="grid grid-cols-1 gap-5">
          {emailField}
          {phoneField}
        </div>
      </FormSection>
      <div className="min-w-0">{aside}</div>
    </div>
  ) : (
    <FormSection icon={ShieldAlert} title="Login Credentials">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {emailField}
        {phoneField}
        {mode === 'create' && (
          <FormField label="Password" htmlFor="password" required error={fieldError('password')}>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="Enter a secure password (min 8 characters)"
              value={values.password || ''}
              onChange={(e) => setField('password', e.target.value)}
            />
          </FormField>
        )}
      </div>
    </FormSection>
  );
}
