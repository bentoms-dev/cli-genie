import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
    target: 'node22',
    sourcemap: true,
  },
  {
    entry: ['src/bin.ts'],
    format: ['esm'],
    target: 'node22',
  },
]);
