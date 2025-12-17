/// <reference types="vitest" />
import { defineConfig } from 'vite'

// Browser bundle config - bundles all dependencies for use in browsers
export default defineConfig({
  build: {
    lib: {
      entry: './src/index.ts',
      formats: ['es'],
      fileName: () => 'browser.js',
    },
    outDir: 'dist',
    emptyOutDir: false, // Don't clear dist, we want both builds
    minify: true,
    rollupOptions: {
      // Bundle all dependencies for browser
      external: [], // Nothing external - bundle everything
    },
  },
})
