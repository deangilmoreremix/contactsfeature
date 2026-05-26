import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App'; // legacy minimal shell
import './index.css';

// Keep federation exports for remote consumption
export { default as SmartCRMApp } from './SmartCRMApp';
export type { SmartCRMRemoteProps } from './SmartCRMApp';

// Default export for legacy/compat
export { default } from './App';

// Render the legacy App for immediate recovery (more resilient)
const root = createRoot(document.getElementById('root')!);
root.render(
  <StrictMode>
    <App />
  </StrictMode>
);

