import type { z } from 'zod';

/** Flatten Zod issues to dot-path keys for nested form fields */
export function zodIssuesToFieldErrors(
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

export function validateWholesalerForm<T>(
  schema: z.ZodSchema<T>,
  values: T,
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
