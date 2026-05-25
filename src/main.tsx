import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App'; // legacy minimal shell still available
import './index.css';

// === FULL APPLICATION EXPORTS FOR MODULE FEDERATION ===
// Primary: the complete SmartCRM experience (recommended for host)
export { default as SmartCRMApp } from './SmartCRMApp';
export type { SmartCRMRemoteProps } from './SmartCRMApp';

// Legacy / compatibility export (still works)
export { default } from './App';

// Service worker disabled for module federation compatibility
// The host application should manage service workers

// === TEMP DEBUG MARKER (for blank page diagnosis on Netlify) ===
console.log('%c[DEBUG] main.tsx script started executing', 'color:lime;font-size:14px;font-weight:bold');

const rootEl = document.getElementById('root');
console.log('[DEBUG] #root element found in DOM:', !!rootEl);

if (rootEl) {
  // Ultra-early visible marker before any React code runs
  rootEl.innerHTML = `
    <div style="padding:32px; background:#fee2e2; color:#991b1b; font-family:monospace; font-size:14px; line-height:1.5;">
      <strong style="font-size:16px">✅ JS EXECUTED — main.tsx reached</strong><br>
      If you can see this red box, the bundle loaded and ran.<br>
      React has NOT mounted yet (or crashed before rendering).<br><br>
      <small>Check console for more [DEBUG] logs. Remove this marker after debugging.</small>
    </div>
  `;
}

console.log('[DEBUG] About to dynamically import SmartCRMApp...');

// Dynamic import so we can log before/after
import('./SmartCRMApp').then(({ default: SmartCRMApp }) => {
  console.log('[DEBUG] SmartCRMApp module imported successfully. Now rendering React...');

  const root = createRoot(rootEl!);
  root.render(
    <StrictMode>
      <SmartCRMApp />
    </StrictMode>
  );

  console.log('[DEBUG] React render() called on #root');
}).catch(err => {
  console.error('[DEBUG] FAILED to import or render SmartCRMApp:', err);
  if (rootEl) {
    rootEl.innerHTML = `
      <div style="padding:32px; background:#fee2e2; color:#991b1b; font-family:monospace;">
        <strong>❌ ERROR during SmartCRMApp import/render</strong><br>
        ${err.message}<br><br>
        <pre style="white-space:pre-wrap;font-size:11px;">${err.stack}</pre>
      </div>
    `;
  }
});
