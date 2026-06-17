import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.{test,spec}.ts'],
    exclude: ['node_modules', 'dist', 'coverage'],
    testTimeout: 10000,
    hookTimeout: 10000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'json', 'html'],
      reportsDirectory: './coverage',
      exclude: [
        'tests/**/*',
        '**/*.d.ts',
        '**/node_modules/**',
        'src/errors/**',
        'src/types/**',
        'src/commands/**',
        'src/cli.ts',
        'src/index.ts',
        'src/storage/SQLiteAdapter.ts',
        'src/storage/StorageAdapter.ts',
        'src/services/MarketService.ts',
        'src/services/InitService.ts',
        'src/utils/market.ts',
        'src/utils/config.ts',
        'src/utils/git.ts',
        'src/storage/index.ts',
        'src/services/index.ts',
        '*.config.{js,ts,cjs,mjs}'
      ],
      thresholds: {
        lines: 75,
        functions: 75,
        branches: 60,
        statements: 75
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
