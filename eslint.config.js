import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'coverage'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // The codebase already uses a leading underscore for deliberately-unused
      // parameters — API stubs that must keep their signature, and action
      // helpers whose `reviewedBy` argument the backend derives from the JWT.
      // Without this, that convention reads as an error, which trains people to
      // ignore the rule rather than obey it.
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
        },
      ],

      // Enforced. The twelve violations this rule was downgraded for are gone:
      // the derived-state-written-back-into-the-store pattern was replaced by
      // computing during render (DispatchTimeField, DetailsPage), by remounting
      // instead of re-hydrating (ReasonDialog, useWholesalerForm/EditPage), and
      // by moving server state into TanStack Query (useAddProductLogic's
      // catalogue cascade, SelectionModal, useWholesalerActivity).
      //
      // One documented exception remains, at the single site where an effect is
      // genuinely correct — tearing down the wizard draft in an external store
      // on a route change. It carries a disable comment explaining why.
      //
      // Be aware of what this rule CANNOT see. `useAddProductLogic` writes to
      // the wizard store from four effects, and every one of them is invisible
      // here because the write goes through Zustand's `setField` rather than a
      // `useState` setter. Those four were examined and left in place: each
      // seeds or reconciles form state from data that arrives asynchronously
      // from the server (the platform margin, the size config, the inferred
      // variant flag, the catalogue display names), which is what an effect is
      // for. They are not the render-derivable pattern this rule targets. So a
      // green run here is not proof that no derived state is being written —
      // only that none is being written through `useState`.
      'react-hooks/set-state-in-effect': 'error',
    },
  },
);
