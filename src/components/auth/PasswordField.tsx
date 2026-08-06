import { useId, useState } from 'react';
import { Check, Copy, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { generatePassword } from '@/src/auth/passwordHasher';
import { Input, type InputProps } from '@/src/components/controls';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';
import { cn } from '@/src/design-system/utils/cn';

export interface PasswordFieldProps extends Omit<InputProps, 'type' | 'value' | 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  /** Show the strength meter. Default true. */
  showStrength?: boolean;
  /** Offer generate and copy. Default false — only for admin-set flows. */
  allowGenerate?: boolean;
}

/**
 * A password input with strength feedback, and optionally a generator.
 *
 * `allowGenerate` is off by default and belongs only where an admin is setting
 * a password *for someone else* — creating a supplier account, or resetting
 * one. Offering "generate" on a change-your-own-password form would hand people
 * a string they cannot memorise and must therefore write down.
 *
 * Copy is deliberately paired with generate: an admin who generates a 16-
 * character password and then retypes it from the screen into an email will get
 * it wrong, and the supplier is the one locked out.
 */
export function PasswordField({
  value,
  onChange,
  showStrength = true,
  allowGenerate = false,
  className,
  ...inputProps
}: PasswordFieldProps) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  /*
   * Reveal.
   *
   * Every use of this field is an admin typing or generating a password FOR
   * SOMEONE ELSE, which they then have to read off the screen and pass on. With
   * no way to see it, a generated sixteen-character string can only be copied
   * blind and a typed one cannot be checked at all — and this is the single
   * moment the value is ever visible, since it is hashed in the browser and
   * cannot be read back afterwards.
   *
   * Starts hidden. Someone else may be looking at the screen, and the default
   * should be the safe one.
   */
  const [revealed, setRevealed] = useState(false);
  const statusId = useId();

  const handleGenerate = () => {
    onChange(generatePassword());
    setCopied(false);
    setCopyFailed(false);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setCopyFailed(false);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access is refused outside a secure context and in some
      // embedded browsers. Say so rather than showing a tick that lied.
      setCopyFailed(true);
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      <Input
        // The ONLY thing the toggle changes. `text` is what makes a password
        // manager offer to save the field, which is a deliberate side effect
        // here: this is an admin setting somebody else's credential, and
        // storing it in their own manager is not what anyone wants. Left as-is
        // because suppressing it would mean fighting the browser over a field
        // the operator has explicitly chosen to reveal.
        type={revealed ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        fullWidth
        {...inputProps}
      />

      <div className="flex flex-wrap items-center gap-3">
        {/*
          Always offered, with or without the generator. Typing a password for
          somebody else and being unable to check it is how a shop is handed a
          credential with a typo in it — and the value cannot be read back
          later, so the mistake surfaces as "they cannot sign in".
        */}
        <button
          type="button"
          onClick={() => setRevealed((r) => !r)}
          aria-pressed={revealed}
          aria-describedby={statusId}
          className="flex items-center gap-1.5 rounded-sm text-2xs font-medium text-ink-2 transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-rule-focus"
        >
          {revealed ? (
            <EyeOff className="h-3 w-3" aria-hidden="true" />
          ) : (
            <Eye className="h-3 w-3" aria-hidden="true" />
          )}
          {revealed ? 'Hide' : 'Show'}
        </button>
        <span id={statusId} aria-live="polite" className="sr-only">
          {revealed ? 'Password is visible on screen' : 'Password is hidden'}
        </span>

        {allowGenerate && (
          <>
          <button
            type="button"
            onClick={handleGenerate}
            className="flex items-center gap-1.5 rounded-sm text-2xs font-medium text-brass transition-colors hover:text-brass-lift focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-rule-focus"
          >
            <RefreshCw className="h-3 w-3" aria-hidden="true" />
            Generate a strong password
          </button>

          {value && (
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 rounded-sm text-2xs font-medium text-ink-2 transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-rule-focus"
            >
              {copied ? (
                <Check className="h-3 w-3 text-ok" aria-hidden="true" />
              ) : (
                <Copy className="h-3 w-3" aria-hidden="true" />
              )}
              {copied ? 'Copied' : 'Copy'}
            </button>
          )}

          <span aria-live="polite" className="sr-only">
            {copied ? 'Password copied to clipboard' : ''}
          </span>

          {copyFailed && (
            <span className="text-2xs text-warn">
              Could not copy — select the field and copy manually.
            </span>
          )}
          </>
        )}
      </div>

      {showStrength && <PasswordStrengthMeter password={value} />}
    </div>
  );
}
