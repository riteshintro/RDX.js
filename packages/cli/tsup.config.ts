import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/bin.ts'],
  format: ['esm'],
  target: 'node20',
  banner: { js: '#!/usr/bin/env node' },
  dts: false,
  clean: true,
  sourcemap: true,
  splitting: false,
  treeshake: true,
  shims: false,
});
