// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { createFormContext } from '../createFormContext';

interface Shape {
  name: string;
  addresses: string[];
}

const { Provider, useFormContext } = createFormContext<Shape>('TestForm');

function Reader() {
  const { values, mode, isSubmitting, fieldError } = useFormContext();
  return (
    <div>
      <span data-testid="name">{values.name}</span>
      <span data-testid="mode">{mode}</span>
      <span data-testid="submitting">{String(isSubmitting)}</span>
      <span data-testid="direct">{fieldError('name') ?? '-'}</span>
      <span data-testid="nested">{fieldError('addresses.0.district') ?? '-'}</span>
      <span data-testid="clean">{fieldError('shopName') ?? '-'}</span>
    </div>
  );
}

function renderWith(errors: Record<string, string>) {
  return render(
    <Provider
      values={{ name: 'Karim Traders', addresses: [] }}
      errors={errors}
      setField={() => {}}
      isSubmitting={false}
      mode="edit"
    >
      <Reader />
    </Provider>,
  );
}

// Each test renders the same testids; without cleanup the previous render is
// still mounted and getByTestId finds two.
afterEach(cleanup);

describe('createFormContext', () => {
  it('distributes values and mode to a descendant', () => {
    renderWith({});
    expect(screen.getByTestId('name').textContent).toBe('Karim Traders');
    expect(screen.getByTestId('mode').textContent).toBe('edit');
    expect(screen.getByTestId('submitting').textContent).toBe('false');
  });

  it('resolves an exact field error', () => {
    renderWith({ name: 'Shop name is required' });
    expect(screen.getByTestId('direct').textContent).toBe('Shop name is required');
  });

  it('falls back to the collection for a nested path', () => {
    // A server error keyed to `addresses` must surface on the row that renders
    // `addresses.0.district`. Without the fallback it renders nowhere and the
    // form silently refuses to submit with nothing marked.
    renderWith({ addresses: 'At least one address is required' });
    expect(screen.getByTestId('nested').textContent).toBe('At least one address is required');
  });

  it('returns nothing for a field with no error', () => {
    renderWith({ name: 'bad' });
    expect(screen.getByTestId('clean').textContent).toBe('-');
  });

  it('throws when a section is rendered outside its provider', () => {
    // Returning a default instead would render a blank, plausible-looking form
    // whose fields are all disconnected from the submit.
    expect(() => render(<Reader />)).toThrow(/outside its provider/);
  });
});
