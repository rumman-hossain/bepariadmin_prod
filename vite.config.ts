import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import obfuscator from 'rollup-plugin-obfuscator';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const isProd = mode === 'production';

    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          '/api': {
            target: env.VITE_API_PROXY_TARGET || 'http://localhost:8080',
            changeOrigin: true,
          },
          '/health': {
            target: env.VITE_API_PROXY_TARGET || 'http://localhost:8080',
            changeOrigin: true,
          },
        },
      },
      plugins: [
        tailwindcss(),
        react(),
        // Heavy obfuscation ONLY for sensitive auth/security modules
        ...(isProd
          ? [
              obfuscator({
                global: false,
                include: [
                  'src/auth/**',
                  'src/api/auth.ts',
                  'src/hooks/useAuth.ts',
                  'src/utils/errors.ts',
                  'src/utils/validation.ts',
                ],
                exclude: ['node_modules/**'],
                options: {
                  controlFlowFlattening: true,
                  controlFlowFlatteningThreshold: 0.75,
                  deadCodeInjection: true,
                  deadCodeInjectionThreshold: 0.3,
                  debugProtection: true,
                  debugProtectionInterval: 2000,
                  disableConsoleOutput: true,
                  identifierNamesGenerator: 'hexadecimal',
                  numbersToExpressions: true,
                  renameGlobals: false,
                  selfDefending: true,
                  simplify: true,
                  splitStrings: true,
                  splitStringsChunkLength: 8,
                  stringArray: true,
                  stringArrayEncoding: ['base64'],
                  stringArrayIndexShift: true,
                  stringArrayRotate: true,
                  stringArrayShuffle: true,
                  stringArrayWrappersCount: 2,
                  stringArrayWrappersChainedCalls: true,
                  stringArrayWrappersType: 'function',
                  unicodeEscapeSequence: false,
                },
              }),
            ]
          : []),
      ],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        rollupOptions: {
          output: {
            manualChunks: {
              'vendor-charts': ['recharts'],
              'vendor-icons': ['lucide-react'],
            },
          },
        },
      },
    };
});
