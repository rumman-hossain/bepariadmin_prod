import React from 'react';
import { cn } from '@/src/design-system/utils/cn';

interface FormFieldProps {
  label: string;
  htmlFor?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function FormField({ label, htmlFor, error, required, children, className }: FormFieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label
        htmlFor={htmlFor}
        className="text-sm font-bold text-text-default"
      >
        {label}
        {required && <span className="text-semantic-danger ml-0.5">*</span>}
      </label>
      {children}
      {error && (
        <p role="alert" className="text-sm text-semantic-danger">
          {error}
        </p>
      )}
    </div>
  );
}