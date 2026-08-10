import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * "Password field is not contained in a form."
 *
 * Chrome logged this on every visit to /retailers/new. The fields sat in bare
 * divs with the submit wired to an onClick, and the warning is about behaviour
 * rather than tidiness: outside a form the browser cannot tell which inputs
 * belong to the credential, so a password manager neither offers to generate
 * one nor saves what was set, and Enter in any field does nothing.
 *
 * Asserted against the SOURCE rather than a render. Mounting CreatePage drags
 * in the router, the query client, the toast provider and the upload service —
 * heavy enough that the test gets deleted the first time one of them changes,
 * for what is a one-line property of the markup.
 */
const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

describe('the retailer create screen submits as a form', () => {
  const src = read('src/features/retailers/pages/CreatePage.tsx');

  it('wraps the fields in a real <form>', () => {
    expect(src).toMatch(/<form/);
  });

  it('submits through onSubmit, not a button onClick', () => {
    expect(src).toMatch(/onSubmit=\{/);
    expect(src).toMatch(/type="submit"/);
  });

  it('keeps Cancel a button, so it cannot submit the form it exits', () => {
    // Inside a form the default button type IS submit. Without this, Cancel
    // creates the retailer it was pressed to avoid.
    expect(src).toMatch(/type="button"[\s\S]{0,200}onClick=\{goToList\}/);
  });

  it('does not hand native validation the job handleSubmit already does', () => {
    // handleSubmit reports every problem at once, deliberately. Native
    // validation would pre-empt it with a bubble on the first invalid field.
    expect(src).toMatch(/noValidate/);
  });
});

describe('a password set for somebody else is not offered to the operator’s manager', () => {
  const src = read('src/components/auth/PasswordField.tsx');

  it('defaults to new-password', () => {
    expect(src).toMatch(/autoComplete="new-password"/);
  });

  it('lets a caller override it, which "Current password" relies on', () => {
    // The default must be spread OVER by inputProps, not the other way round.
    const defaultAt = src.indexOf('autoComplete="new-password"');
    const spreadAt = src.indexOf('{...inputProps}');
    expect(defaultAt).toBeGreaterThan(-1);
    expect(spreadAt).toBeGreaterThan(defaultAt);
    expect(read('src/components/auth/ChangePasswordForm.tsx')).toMatch(
      /autoComplete="current-password"/,
    );
  });
});
