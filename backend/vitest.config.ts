import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.ts'],
    setupFiles: ['src/shared/services/__tests__/setupUnit.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/shared/services/**', 'src/application/services/**'],
      exclude: ['src/**/__tests__/**'],
    },
  },
});
