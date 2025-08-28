import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['react', 'react-dom', '@supabase/supabase-js']
  },
  define: {
    global: 'globalThis',
  },
  server: {
    host: true,
    port: 5173,
  }
})