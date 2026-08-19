import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://amer003100-erp-sysyem.hf.space',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  build: {
    target: 'esnext',
    cssCodeSplit: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'vendor-react';
            }
            if (id.includes('recharts') || id.includes('d3-')) {
              return 'vendor-charts';
            }
            if (id.includes('@mantine') || id.includes('lucide-react')) {
              return 'vendor-ui';
            }
            if (id.includes('html2pdf') || id.includes('html2canvas') || id.includes('jspdf') || id.includes('canvg')) {
              return 'vendor-pdf';
            }
            if (id.includes('i18next') || id.includes('xlsx')) {
              return 'vendor-utils';
            }
            return 'vendor-core';
          }
        },
      },
    },
  },
})
