import { useCallback, useState } from 'react';
import { retailerUpdateSchema } from '../schemas/retailerSchema';
import type { RetailerFormValues } from '../components/RetailerForm';

export const EMPTY_RETAILER_FORM: RetailerFormValues = {
  name: '',
  shopName: '',
  phone: '',
  email: '',
  district: '',
  category: '',
  password: '',
  addresses: [],
  bankDetailsList: [],
  digitalWallets: [],
};

/**
 * Form state, validation and the one thing this hook exists to get right:
 * turning a form full of empty strings into a payload that says "absent".
 */
export function useRetailerForm(initial: RetailerFormValues = EMPTY_RETAILER_FORM) {
  const [values, setValues] = useState<RetailerFormValues>(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof RetailerFormValues, string>>>({});

  const setField = useCallback((patch: Partial<RetailerFormValues>) => {
    setValues((v) => ({ ...v, ...patch }));
    // Clear only the errors for fields being edited. Wiping the whole map on
    // every keystroke makes a validation summary flicker away while somebody is
    // still reading it.
    setErrors((e) => {
      const next = { ...e };
      for (const k of Object.keys(patch)) delete next[k as keyof RetailerFormValues];
      return next;
    });
  }, []);

  /**
   * An untouched optional field is ABSENT, not an empty string.
   *
   * A `<select>` nobody opened submits `''`, and a `''` sent to the server for
   * `location_ranking` fails the CHECK constraint — which allows three codes and
   * not the empty string. Stripping them here is what lets the whole assessment
   * section be genuinely optional rather than all-or-nothing.
   */
  const toPayload = useCallback(() => {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(values)) {
      if (v === '' || v === undefined || v === null) continue;
      out[k] = v;
    }
    return out;
  }, [values]);

  const validate = useCallback((): boolean => {
    /*
     * Validates the RAW values, not the stripped payload.
     *
     * These are two different jobs and conflating them produced unreadable
     * copy. `toPayload` removes empty strings so the server sees "absent"
     * rather than `''` — correct for the wire. But validating that output means
     * a required field arrives as `undefined`, which trips Zod's TYPE check
     * before it ever reaches `.min(1, 'Shop name is required')`. The operator
     * was shown "Invalid input: expected string, received undefined" against
     * seven fields at once.
     *
     * The form's own state has `''` for an untouched field, which is exactly
     * what the friendly messages are written for.
     */
    const parsed = retailerUpdateSchema.safeParse(values);
    if (parsed.success) {
      setErrors({});
      return true;
    }
    const next: Partial<Record<keyof RetailerFormValues, string>> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof RetailerFormValues | undefined;
      // First message per field. A field with three failures shows the first,
      // which is the one to fix; listing all three is noise.
      if (key && !next[key]) next[key] = issue.message;
    }
    setErrors(next);
    return false;
    // `values`, not `toPayload` — and the difference is a real bug, not a lint
    // preference. When validate stopped reading the stripped payload and started
    // reading raw state, the dependency array was left behind, so this closure
    // kept an older `values` and would have validated what the operator typed
    // one keystroke ago. The React Compiler refused to compile it, which is the
    // only reason it was caught before it shipped.
  }, [values]);

  return { values, errors, setField, setErrors, validate, toPayload };
}
