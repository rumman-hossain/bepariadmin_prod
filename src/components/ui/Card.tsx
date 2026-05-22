import React from 'react';
import { cn } from '@/src/design-system/utils/cn';

// ─── Types ───────────────────────────────────────────────

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  action?: React.ReactNode;
  /** Glass variant with backdrop-blur (Apple-style) */
  glass?: boolean;
  /** Remove border and shadow for minimal look */
  flat?: boolean;
  /** Padding preset */
  pad?: 'sm' | 'md' | 'lg';
}

// ─── Padding map ─────────────────────────────────────────

const PADDING: Record<NonNullable<CardProps['pad']>, string> = {
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
};

// ─── Card Component ──────────────────────────────────────

export const Card: React.FC<CardProps> = ({
  children,
  className,
  title,
  action,
  glass = true,
  flat = false,
  pad = 'lg',
}) => {
  return (
    <div
      className={cn(
        // Surface
        // Glass or solid surface
        glass
          ? 'bg-surface-glass backdrop-blur-xl dark:bg-surface-glass'
          : 'bg-surface-primary',
        // Shape
        'rounded-3xl',
        // Border (unless flat)
        !flat && 'border border-border-subtle',
        // Shadow (unless flat)
        !flat && 'shadow-card',
        // Spacing
        PADDING[pad],
        // User override
        className,
      )}
    >
      {/* Header */}
      {(title || action) && (
        <div className="flex items-center justify-between mb-5">
          {title && (
              <h3 className="text-[20px] font-bold leading-tight text-text-default">
              {title}
            </h3>
          )}
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}

      {/* Body */}
      {children}
    </div>
  );
};