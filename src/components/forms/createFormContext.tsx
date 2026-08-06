import React from 'react';

/**
 * A typed, scoped context for one form.
 *
 * # The problem it solves
 *
 * A form with six sections over forty fields has to get `values`, `errors`,
 * `setField`, `isSubmitting` and `mode` to every section. Threading them as
 * props is five props per section drilled two levels — and the pressure that
 * creates is real: `WholesalerForm` avoided it by not splitting at all, which is
 * how one component reached 608 lines before it was broken up.
 *
 * Context is the right tool *here specifically* because every consumer is a
 * descendant of one form and the value changes on every keystroke anyway. There
 * is no re-render to save by threading props, only noise to add.
 *
 * # What it is deliberately NOT
 *
 * Not a store. The form's state belongs to the screen that owns the submit —
 * `useWholesalerForm`, `useRetailerForm` — and stays there. This only
 * distributes it. A store would put form state outside the component that
 * knows when it is discarded, which is how a half-typed shop reappears on a
 * screen somebody opened fresh.
 *
 * # Why a factory
 *
 * The wholesaler and retailer forms need the same machinery with different
 * value types. A factory gives each a context typed to its own shape with no
 * duplicated provider — the alternative is the same twenty lines written twice
 * and drifting the first time one of them gains a field.
 */

export interface FormContextValue<T> {
  values: T;
  setField: <K extends keyof T>(field: K, value: T[K]) => void;
  isSubmitting: boolean;
  mode: 'create' | 'edit';
  /**
   * The error for a field path.
   *
   * Falls back to the path's first segment so a nested error registered against
   * `addresses` surfaces on `addresses.0.district`. Without it, a server error
   * keyed to the collection renders nowhere and the operator sees a form that
   * silently refuses to submit.
   */
  fieldError: (path: string) => string | undefined;
}

export interface FormProviderProps<T> {
  children: React.ReactNode;
  values: T;
  errors: Record<string, string>;
  setField: <K extends keyof T>(field: K, value: T[K]) => void;
  isSubmitting: boolean;
  mode: 'create' | 'edit';
}

export function createFormContext<T>(displayName: string) {
  const Context = React.createContext<FormContextValue<T> | null>(null);
  Context.displayName = displayName;

  function Provider({ children, values, errors, setField, isSubmitting, mode }: FormProviderProps<T>) {
    const value = React.useMemo<FormContextValue<T>>(
      () => ({
        values,
        setField,
        isSubmitting,
        mode,
        fieldError: (path) => errors[path] ?? errors[path.split('.')[0]!],
      }),
      [values, errors, setField, isSubmitting, mode],
    );
    return <Context.Provider value={value}>{children}</Context.Provider>;
  }

  function useFormContext(): FormContextValue<T> {
    const ctx = React.useContext(Context);
    // Throwing beats returning a default. A section rendered outside its
    // provider would otherwise read an empty `values` and present itself as a
    // blank, working form — every field silently disconnected from the submit.
    if (!ctx) {
      throw new Error(`${displayName} used outside its provider`);
    }
    return ctx;
  }

  return { Provider, useFormContext };
}
