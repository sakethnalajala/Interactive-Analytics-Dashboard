import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { execSync } from 'node:child_process';

// Build stamp: Vercel exposes the commit SHA at build time; fall back to git locally.
function commitSha() {
  if (process.env.VERCEL_GIT_COMMIT_SHA) return process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 7);
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return 'dev';
  }
}

export default defineConfig({
  plugins: [react()],
  define: { __BUILD_SHA__: JSON.stringify(commitSha()), __BUILD_TIME__: JSON.stringify(new Date().toISOString()) },
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  server: {
    port: 5180,
    strictPort: true,
    // In dev the API is proxied so cookies are same-origin (no CORS / SameSite issues)
    proxy: { '/api': { target: 'http://localhost:5001', changeOrigin: true } },
  },
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
          query: ['@tanstack/react-query', 'axios', 'zustand'],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    css: false,
  },
});
