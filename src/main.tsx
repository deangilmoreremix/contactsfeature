import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App'; // legacy minimal shell
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import './index.css';

// Keep federation exports for remote consumption
export { default as SmartCRMApp } from './SmartCRMApp';
export type { SmartCRMRemoteProps } from './SmartCRMApp';

// Default export for legacy/compat
export { default } from './App';

// Root error boundary - catches any React render errors that bubble up
const RootErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        // Log to DOM for visibility
        try {
          const root = document.getElementById('root');
          if (root) {
            root.innerHTML = `
              <div style="padding:20px;background:#fef2f2;color:#991b1b;font-family:system-ui;border:2px solid #ef4444;">
                <h2 style="margin:0 0 10px 0;">ROOT ERROR:</h2>
                <pre style="white-space:pre-wrap;font-size:12px;">${error?.message || 'Unknown error'}<br/>${errorInfo?.componentStack || ''}</pre>
              </div>
            `;
          }
        } catch (e) { /* ignore */ }
        console.error('RootErrorBoundary:', error, errorInfo);
      }}
    >
      {children}
    </ErrorBoundary>
  );
};

// Render the legacy App for immediate recovery (more resilient)
const rootElement = document.getElementById('root');
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(
    <StrictMode>
      <RootErrorBoundary>
        <App />
      </RootErrorBoundary>
    </StrictMode>
  );
} else {
  console.error('Root element not found!');
}

