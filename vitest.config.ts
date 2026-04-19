import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    globals: true,
    include: ['src/**/*.test.{ts,tsx}', 'shared/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    setupFiles: ['src/test/setup.ts', 'src/test/setupServer.ts'],
    environment: 'jsdom',
    // Block production MySQL credentials in test environment (defense-in-depth)
    env: {
      LS_DB_HOST: 'test-blocked',
      LS_DB_NAME: 'test-blocked',
      LS_DB_USER: 'test-blocked',
      LS_DB_PASSWORD: 'test-blocked',
    },
  },
});
