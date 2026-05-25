import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import SmartCRMApp from './SmartCRMApp';
import './index.css';

// === MODULE FEDERATION EXPORTS ===
export { default as SmartCRMApp } from './SmartCRMApp';
export type { SmartCRMRemoteProps } from './SmartCRMApp';

// Legacy export (kept for compatibility)
export { default } from './App';

// Service worker disabled for module federation compatibility
// The host application should manage service workers

// === STANDALONE RENDER ===
const root = createRoot(document.getElementById('root')!);
root.render(
  <StrictMode>
    <SmartCRMApp />
  </StrictMode>
);

