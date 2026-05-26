import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

// Federation exports
export { default as SmartCRMApp } from './SmartCRMApp';
export type { SmartCRMRemoteProps } from './SmartCRMApp';
export { default } from './App';

// Mount app
import App from './App';
import { ErrorBoundary } from './components/ui/ErrorBoundary';

const RootErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        try {
          const root = document.getElementById('root');
          if (root) {
            root.innerHTML = `\n              <div style="padding:20px;background:#fef2f2;color:#991b1b;font-family:system-ui;border:2px solid #ef4444;">\n                <h2 style="margin:0 0 10px 0;">ROOT ERROR:</h2>\n                <pre style="white-space:pre-wrap;font-size:12px;">${error?.message || 'Unknown error'}<br/>${errorInfo?.componentStack || ''}</pre>\n              </div>\n            `;
          }
        } catch (e) {}
        console.error('RootErrorBoundary:', error, errorInfo);
      }}
    >
      {children}
    </ErrorBoundary>
  );
};

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <RootErrorBoundary>
        <App />
      </RootErrorBoundary>
    </React.StrictMode>
  );
} else {
  console.error('Root element not found!');
}
