import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const controlToken = process.env.KINGIN_API_TOKEN || 'replit-local-control'

export default defineConfig({
  base: '/',
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 5000,
    host: '0.0.0.0',
    allowedHosts: true,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            proxyReq.removeHeader('x-control-token')
            if (req.url === '/api/engine/start' || req.url === '/api/engine/stop') {
              proxyReq.setHeader('X-Control-Token', controlToken)
            }
          })
        },
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 2000,
  },
})
