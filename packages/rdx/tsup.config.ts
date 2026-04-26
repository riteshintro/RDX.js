import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/container/index.ts',
    'src/http/index.ts',
    'src/routing/index.ts',
    'src/database/index.ts',
    'src/validation/index.ts',
    'src/exceptions/index.ts',
    'src/support/index.ts',
  ],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
  treeshake: true,
  target: 'node20',
});
