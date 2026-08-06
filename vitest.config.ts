import { defineConfig } from 'vitest/config';

// Standalone Vitest config — deliberately does NOT load vite.config.ts so the
// production obfuscator/rollup plugins never run during tests. Tests execute in
// a plain Node environment, which provides native `crypto.subtle` (Node >= 18),
// exactly the Web Crypto API the canonical PBKDF2 hasher relies on.
export default defineConfig({
  // The `@` alias mirrors vite.config.ts so component tests can use the same
  // import specifiers the app does.
  resolve: {
    alias: { '@': new URL('.', import.meta.url).pathname.replace(/\/$/, '') },
  },
  test: {
    // Node stays the default so the hash conformance test keeps its native
    // crypto.subtle. Component tests opt into a DOM per-file with
    // `// @vitest-environment jsdom`.
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],

    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'html', 'lcov', 'json-summary'],
      // Only the pure logic layers. Coverage of components measures how much
      // JSX a render touched, which is not a number worth gating on — and a
      // whole-repo percentage would be dragged around by screens rather than
      // by the rules that decide what reaches the database.
      include: [
        'src/features/**/utils/**/*.ts',
        'src/features/**/api/*.ts',
        'src/features/**/hooks/useDefaultableList.ts',
        'src/api/client.ts',
        'src/auth/roles.ts',
        'src/utils/**/*.ts',
      ],
      exclude: ['**/__tests__/**', '**/*.d.ts'],
      thresholds: {
        // A floor, not a target: it exists to stop coverage sliding back, and
        // should be raised as the untested files below it are covered.
        lines: 65,
        functions: 67,
        branches: 66,
        statements: 66,
      },
    },
  },
});
