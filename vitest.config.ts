import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Logique métier pure (calculs scolaires et de paie) : environnement Node.
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    globals: true,
  },
});
