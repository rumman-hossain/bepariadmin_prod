import type { z } from 'zod';

/** Flatten Zod issues to dot-path keys for nested form fields */
function zodIssuesToFieldErrors(
  issues: { path: PropertyKey[]; message: string }[],
): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join('.');
    if (key && !fieldErrors[key]) {
      fieldErrors[key] = issue.message;
    }
  }
  return fieldErrors;
}

/**
 * `values` is `unknown` on purpose.
 *
 * It used to be typed as the schema's OUTPUT type, which is backwards: the
 * whole point of validating is that you do not yet know the value conforms.
 * Requiring the output type also made the function unusable from the form,
 * which holds input-shaped data (defaults not yet applied).
 *
 * `safeParse` accepts `unknown` anyway, so this is both more honest and more
 * permissive without losing anything.
 */
export function validateWholesalerForm(
  schema: z.ZodType,
  values: unknown,
): { success: true } | { success: false; errors: Record<string, string> } {
  const result = schema.safeParse(values);
  if (result.success) {
    return { success: true };
  }
  return {
    success: false,
    errors: zodIssuesToFieldErrors(result.error.issues),
  };
}
