import React, { useState } from 'react';
import { cn } from '@/src/design-system/utils/cn';

export interface AvatarProps {
  /** Used for the fallback initials and as the image alt text. */
  name: string;
  src?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  /** Square with a small radius — right for company logos, wrong for people. */
  square?: boolean;
  className?: string;
}

const SIZES = {
  xs: 'h-5 w-5 text-2xs',
  sm: 'h-7 w-7 text-xs',
  md: 'h-9 w-9 text-sm',
  lg: 'h-12 w-12 text-base',
} as const;

/** "Karim Traders Ltd" → "KT". Two initials at most; more is unreadable small. */
function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

export const Avatar: React.FC<AvatarProps> = ({ name, src, size = 'md', square, className }) => {
  const [failed, setFailed] = useState(false);
  const showImage = src && !failed;

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden select-none',
        'bg-brass-wash font-semibold text-brass',
        square ? 'rounded-sm' : 'rounded-full',
        SIZES[size],
        className,
      )}
    >
      {showImage ? (
        <img
          src={src}
          alt={name}
          // Falls back to initials rather than a broken-image glyph. Wholesaler
          // logos come from signed GCS URLs that expire, so this happens.
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <span aria-hidden="true">{initials(name)}</span>
      )}
    </span>
  );
};


