import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');

export default defineConfig({
  root: path.resolve(root, 'web'),
  // One .env.local at the repo root serves both web and server.
  envDir: root,
  plugins: [react()],
  server: { fs: { allow: [root] }, watch: { ignored: ['**/.worktrees/**'] } },
  build: { outDir: 'dist', emptyOutDir: true },
});
