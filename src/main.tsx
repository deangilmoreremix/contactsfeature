import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Export for Module Federation
export { default } from './App';

// Service worker disabled for module federation compatibility
// The host application should manage service workers

// Render for standalone use
console.log('main.tsx: Rendering App component');
const root = createRoot(document.getElementById('root')!);
root.render(
  <StrictMode>
    <App />
  </StrictMode>
);
