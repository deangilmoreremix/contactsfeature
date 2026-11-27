import { defineConfig, mergeConfig } from 'vite';
import base from '../../../vite.config';

const DRIP = process.env.CALLERS_DRIP_PORT || '5291';
/** Dev server for the direct-caller specs: Netlify functions are proxied to the dripping SSE server (which is also the fake Supabase). */
export default mergeConfig(base, defineConfig({
  server: {
    host: '127.0.0.1',
    port: Number(process.env.CALLERS_PORT || 5232),
    proxy: { '/.netlify/functions': { target: `http://127.0.0.1:${DRIP}`, changeOrigin: true } },
  },
}));
