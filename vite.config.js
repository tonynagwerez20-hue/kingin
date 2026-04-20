import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Unified Vite config: use relative base so Tauri can load assets,
// keep dev server settings and Tauri-aware build options.
export default defineConfig({
  base: './',
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
  },
  envPrefix: ['VITE_', 'TAURI_'],
  build: {
    // Tauri targets: use appropriate browser target per platform
    target: process.env.TAURI_PLATFORM === 'windows' ? 'chrome105' : 'safari13',
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_DEBUG,
    outDir: 'dist',
    // Raise chunk warning limit to avoid noisy warnings for large bundles
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      external: ['@tauri-apps/api/tauri'],
    },
  },
})