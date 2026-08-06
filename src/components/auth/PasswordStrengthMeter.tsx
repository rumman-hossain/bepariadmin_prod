import { useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { scorePassword, type StrengthLevel } from '@/src/auth/passwordHasher';
import { cn } from '@/src/design-system/utils/cn';

interface PasswordStrengthMeterProps {
  password: string;
  /** Hide until the user has typed something. Default true. */
  className?: string;
}

const SEGMENTS = 4;

/**
 * Colour by level.
 *
 * Only two hues, not a rainbow: anything short of "strong" is amber, and
 * "strong" or better is green. A five-colour gradient invites people to aim for
 * orange and stop, whereas a binary read — not there yet / there — matches the
 * decision the user is actually making.
 */
const TONE: Record<StrengthLevel, { bar: string; text: string; label: string }> = {
  'very-weak': { bar: 'bg-bad', text: 'text-bad', label: 'Very weak' },
  weak: { bar: 'bg-bad', text: 'text-bad', label: 'Weak' },
  fair: { bar: 'bg-warn', text: 'text-warn', label: 'Fair' },
  strong: { bar: 'bg-ok', text: 'text-ok', label: 'Strong' },
  excellent: { bar: 'bg-ok', text: 'text-ok', label: 'Excellent' },
};

/**
 * Strength feedback under a password field.
 *
 * The scoring is in `nextgen-password`, shared with the mobile app. What this
 * adds is the presentation decision: the meter announces politely rather than
 * assertively, so a screen reader is not interrupted on every keystroke, and it
 * shows at most two suggestions so the hint stays a hint.
 */
export function PasswordStrengthMeter({
  password,
  className,
}: PasswordStrengthMeterProps) {
  const strength = useMemo(() => scorePassword(password), [password]);

  if (!password) return null;

  const tone = TONE[strength.level];

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-1" aria-hidden="true">
          {Array.from({ length: SEGMENTS }, (_, i) => (
            <span
              key={i}
              className={cn(
                'h-1 flex-1 rounded-full transition-colors duration-200',
                i < strength.score ? tone.bar : 'bg-rule-subtle',
              )}
            />
          ))}
        </div>
        <span className={cn('shrink-0 text-2xs font-semibold', tone.text)}>{tone.label}</span>
      </div>

      {/*
       * One live region for the whole component, polite. Marking each change
       * assertive would make a screen reader re-read the strength on every
       * keystroke, which is unusable while typing a password.
       */}
      <div aria-live="polite" className="space-y-1">
        <p className="sr-only">
          Password strength: {tone.label}, roughly {strength.bits} bits of entropy.
        </p>

        {strength.warning && (
          <p className="flex items-start gap-1.5 text-2xs text-warn">
            <AlertTriangle className="mt-px h-3 w-3 shrink-0" aria-hidden="true" />
            {strength.warning}
          </p>
        )}

        {strength.suggestions.map((suggestion) => (
          <p key={suggestion} className="text-2xs text-ink-2">
            {suggestion}
          </p>
        ))}
      </div>
    </div>
  );
}
