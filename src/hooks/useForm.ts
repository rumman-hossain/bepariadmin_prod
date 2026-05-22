import { useState, useCallback } from 'react';
import type { z } from 'zod';

interface UseFormOptions<T> {
  initialValues: T;
  schema: z.ZodSchema<T>;
  onSubmit: (values: T) => void | Promise<void>;
}

interface UseFormReturn<T> {
  values: T;
  errors: Record<string, string>;
  isSubmitting: boolean;
  setField: <K extends keyof T>(field: K, value: T[K]) => void;
  setFields: (partial: Partial<T>) => void;
  validate: () => boolean;
  handleSubmit: (e?: React.FormEvent) => Promise<void>;
  reset: () => void;
}

export function useForm<T extends Record<string, unknown>>({
  initialValues,
  schema,
  onSubmit,
}: UseFormOptions<T>): UseFormReturn<T> {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setField = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field as string];
      return next;
    });
  }, []);

  const setFields = useCallback((partial: Partial<T>) => {
    setValues((prev) => ({ ...prev, ...partial }));
  }, []);

  const validate = useCallback((): boolean => {
    const result = schema.safeParse(values);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of (result as { error: { issues: { path: (string | number)[]; message: string }[] } }).error.issues) {
        const key = issue.path[0] as string;
        if (!fieldErrors[key]) {
          fieldErrors[key] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return false;
    }
    setErrors({});
    return true;
  }, [values, schema]);

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      await onSubmit(values);
    } finally {
      setIsSubmitting(false);
    }
  }, [values, validate, onSubmit]);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
  }, [initialValues]);

  return {
    values,
    errors,
    isSubmitting,
    setField,
    setFields,
    validate,
    handleSubmit,
    reset,
  };
}