import React from 'react';
import { Button } from '@/src/components/controls';
import { FormErrorSummary } from '@/src/components/forms/Form';
import { Stack } from '@/src/components/layout/primitives';
import type { WholesalerFormData } from '../schemas/wholesalerSchema';

import { WholesalerFormProvider } from './form/context';
import { CredentialsSection } from './form/CredentialsSection';
import { BasicInfoSection } from './form/BasicInfoSection';
import { AddressesSection } from './form/AddressesSection';
import { FinancialSection } from './form/FinancialSection';
import { DocumentsSection } from './form/DocumentsSection';

export interface WholesalerFormProps {
  mode: 'create' | 'edit';
  values: WholesalerFormData;
  errors: Record<string, string>;
  isSubmitting: boolean;
  setField: <K extends keyof WholesalerFormData>(field: K, value: WholesalerFormData[K]) => void;
  showValidationBanner: boolean;
  onDismissValidationBanner: () => void;
  onCancel: () => void;
  submitLabel: string;
  onPrimaryAction: () => void;
  /** Rendered beside Login Credentials on edit — e.g. the password reset card. */
  credentialsAside?: React.ReactNode;
}

/**
 * The supplier form.
 *
 * Was a single 608-line function: one `return` containing five `FormSection`
 * blocks, forty-odd fields, three collection editors and an upload slot. It is
 * now a composition of five sections, each in its own file.
 *
 * The sections read `values`, `setField` and the error resolver from context
 * rather than props. That is a deliberate choice for this case and not a
 * general one: the consumers are all descendants of one form and the value
 * changes on every keystroke anyway, so threading five props two levels deep
 * would add noise without saving a single re-render. The state itself still
 * lives in `useWholesalerForm`, owned by the screen that owns the submit —
 * context distributes it, it does not hold it.
 */
export function WholesalerForm({
  mode,
  values,
  errors,
  isSubmitting,
  setField,
  showValidationBanner,
  onDismissValidationBanner,
  onCancel,
  submitLabel,
  onPrimaryAction,
  credentialsAside,
}: WholesalerFormProps) {
  return (
    <WholesalerFormProvider
      values={values}
      errors={errors}
      setField={setField}
      isSubmitting={isSubmitting}
      mode={mode}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onPrimaryAction();
        }}
      >
        <Stack gap="xl" className="pb-12">
          {showValidationBanner && (
            <FormErrorSummary errors={errors} onDismiss={onDismissValidationBanner} />
          )}

          <CredentialsSection aside={credentialsAside} />
          <BasicInfoSection />
          <AddressesSection />
          <FinancialSection />
          <DocumentsSection />

          <div className="flex justify-end gap-3 border-t border-rule-subtle pt-4">
            <Button variant="secondary" onClick={onCancel} type="button" disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {submitLabel}
            </Button>
          </div>
        </Stack>
      </form>
    </WholesalerFormProvider>
  );
}
