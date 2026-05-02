import { defineConfig } from 'tsup';
import { readFileSync } from 'node:fs';

const { version } = JSON.parse(readFileSync('./package.json', 'utf8')) as { version: string };

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node20',
  banner: { js: '#!/usr/bin/env node' },
  dts: false,
  clean: true,
  sourcemap: true,
  splitting: false,
  shims: false,
  define: {
    __PACKAGE_VERSION__: JSON.stringify(version),
  },
});
