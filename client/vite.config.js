import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        timeout: 120000,
        proxyTimeout: 120000,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            // Ensure large bodies are forwarded properly
            proxyReq.setHeader('connection', 'keep-alive');
          });
          proxy.on('error', (err) => {
            console.error('Proxy error:', err.message);
          });
        },
      },
    },
  },
})
