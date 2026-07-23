import { defineConfig } from 'vitest/config';

// Standalone Vitest config — deliberately does NOT load vite.config.ts so the
// production obfuscator/rollup plugins never run during tests. Tests execute in
// a plain Node environment, which provides native `crypto.subtle` (Node >= 18),
// exactly the Web Crypto API the canonical PBKDF2 hasher relies on.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
