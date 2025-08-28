import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  minify: false,
  bundle: true,
  splitting: false,
  treeshake: true,
  outDir: 'dist',
  target: 'node18',
  platform: 'node',
  external: ['@modelcontextprotocol/sdk'],
  esbuildOptions(options) {
    options.banner = {
      js: '#!/usr/bin/env node',
    };
  },
  onSuccess: async () => {
    // Make the output file executable
    const { chmod } = await import('fs/promises');
    try {
      await chmod('dist/index.js', 0o755);
    } catch (error) {
      console.warn('Failed to make dist/index.js executable:', error);
    }
  },
});
