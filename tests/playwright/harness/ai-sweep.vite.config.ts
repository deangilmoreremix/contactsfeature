import { defineConfig, mergeConfig } from 'vite';
import os from 'node:os';
import path from 'node:path';
import base from '../../../vite.config';

const DRIP = process.env.AI_SWEEP_DRIP_PORT || '5312';
export const AI_SWEEP_DIST = process.env.AI_SWEEP_DIST || path.join(os.tmpdir(), 'smartcrm-ai-sweep-dist');

/**
 * Config for the AI controls sweep. `vite build` (with VITE_STREAM_GUARD=1 so the runtime guard is compiled in)
 * writes to AI_SWEEP_DIST and `vite preview` serves that PRODUCTION build; every /.netlify/functions request is
 * proxied to the dripping SSE server (tests/playwright/helpers/aiSweepDrip.ts).
 */
export default mergeConfig(base, defineConfig({
  build: { outDir: AI_SWEEP_DIST, emptyOutDir: true },
  preview: {
    host: '127.0.0.1',
    port: Number(process.env.AI_SWEEP_PORT || 5311),
    strictPort: true,
    proxy: { '/.netlify/functions': { target: `http://127.0.0.1:${DRIP}`, changeOrigin: true } },
  },
}));
