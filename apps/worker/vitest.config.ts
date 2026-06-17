import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['apps/worker/src/**/*.{test,spec}.ts'],
  },
});
