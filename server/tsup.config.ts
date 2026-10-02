import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['server/src/index.ts'],
  outDir: 'server/dist',
  format: ['esm'],
  target: 'node22',
  clean: true,
});
