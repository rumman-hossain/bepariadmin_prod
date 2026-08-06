import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');

    // Set per profile in .env.dev-local / .env.dev-gcp (npm run dev:local | dev:gcp).
    const apiTarget = env.VITE_API_PROXY_TARGET || 'http://localhost:8080';
    const proxyToApi = { target: apiTarget, changeOrigin: true };

    return {
      server: {
        port: 3000,
        // Fail rather than drift. Without this Vite silently moves to 3001 when
        // 3000 is taken, and the backend's Origin allowlist only contains 3000 —
        // so every refresh 403s and the operator is signed out with no
        // explanation. A port clash should be a loud error, not a mystery logout.
        strictPort: true,
        host: '0.0.0.0',
        // Mirrors the three rewrites in firebase.json, so dev and the hosted
        // build resolve the same paths against the same origin.
        proxy: {
          '/api': proxyToApi,
          '/health': proxyToApi,
          '/uploads': proxyToApi,
        },
      },
      plugins: [
        tailwindcss(),
        react(),
        /*
         * rollup-plugin-obfuscator was removed here.
         *
         * It worked — auth strings really were absent from the bundle — but it
         * protected the wrong asset. Obfuscation hides source STRUCTURE; the
         * asset at risk is the runtime access token, and every attack that
         * matters operates on behaviour, not source: hook window.fetch and read
         * the Authorization header, or simply re-call /api/v1/auth/refresh with
         * credentials: 'include'. Renaming getAccessToken to _0x4a1b stops
         * neither. The auth protocol is also documented in README.md and in the
         * plaintext comments of api/client.ts, which was never in the include
         * list anyway.
         *
         * It cost real things: `disableConsoleOutput: true` silently suppressed
         * production auth logging — actively harmful during an incident —
         * `debugProtection` ran a 2-second timer forever on the login critical
         * path, and `selfDefending` made the auth chunk brittle against any
         * downstream post-processing.
         *
         * The effort went into firebase.json instead: a real CSP with
         * frame-ancestors 'none', which raises the cost of the attacks
         * obfuscation only pretended to prevent.
         */
      ],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        rollupOptions: {
          output: {
            /*
             * The function form, deliberately.
             *
             * The object form (`{'vendor-charts': ['recharts']}`) assigns a
             * module's ENTIRE transitive subgraph to the named chunk. recharts
             * depends on react and react-dom, so both were pulled into
             * `vendor-charts` — which meant:
             *
             *   - the entry chunk statically imported `flushSync` from it, so
             *     `vendor-charts` was `modulepreload`ed on every page including
             *     /login, where there are no charts;
             *   - ~55-60 KB gzip of recharts + d3 loaded before the login form;
             *   - and the chunk could never be lazily loaded, because react-dom
             *     lives in it — which silently neutralised every `React.lazy`
             *     route split in src/router/index.tsx.
             *
             * Matching on the resolved id instead puts each package exactly
             * where it belongs, so recharts stays behind the lazy DashboardPage
             * boundary that already exists.
             */
            manualChunks(id: string) {
              if (!id.includes('node_modules')) return undefined;

              // The React runtime is needed by every route, so it gets its own
              // stable, long-cached chunk rather than riding along with a
              // feature library.
              if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) {
                return 'vendor-react';
              }
              // Tiny utilities that almost every chunk needs. These MUST be
              // matched before the charts rule: `clsx` is a recharts dependency
              // and is also what `cn()` is built on, so without an explicit home
              // it lands in `vendor-charts` — and that single import was enough
              // to keep the whole 108 KB chart chunk on the critical path even
              // after react-dom had been moved out.
              if (/[\\/]node_modules[\\/](clsx|tailwind-merge)[\\/]/.test(id)) {
                return 'vendor-utils';
              }
              // recharts pulls a large d3 subtree via victory-vendor; both
              // belong to the dashboard and nowhere else.
              if (/[\\/]node_modules[\\/](recharts|d3-|victory-|internmap|delaunator|robust-predicates|decimal\.js-light|es-toolkit|eventemitter3|reselect|tiny-invariant|immer|@reduxjs|react-redux|use-sync-external-store)/.test(id)) {
                return 'vendor-charts';
              }
              if (id.includes('node_modules/lucide-react')) return 'vendor-icons';
              if (id.includes('node_modules/zod')) return 'vendor-zod';
              return undefined;
            },
          },
        },
      },
    };
});
