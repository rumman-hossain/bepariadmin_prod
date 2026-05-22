import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind classes without conflicts.
 * Later classes override earlier ones (same as Tailwind behavior).
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}