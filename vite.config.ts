import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: true,
    port: 8080,
  },
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.test.ts'],
    clearMocks: true,
    restoreMocks: true,
  },
});
