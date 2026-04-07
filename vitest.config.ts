import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts', 'shared/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
});
