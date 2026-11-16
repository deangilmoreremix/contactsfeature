import { defineConfig, mergeConfig } from 'vite';
import base from '../../../vite.config';

const DRIP = process.env.DRIP_PORT || '5290';
/** Dev server for the streaming specs: same app config, AI endpoints proxied to the dripping SSE server. */
export default mergeConfig(base, defineConfig({
  server: {
    host: '127.0.0.1',
    port: Number(process.env.HARNESS_PORT || 5231),
    proxy: { '/.netlify/functions': { target: `http://127.0.0.1:${DRIP}`, changeOrigin: true } },
  },
}));
