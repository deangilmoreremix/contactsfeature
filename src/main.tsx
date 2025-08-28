import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { crmBridge } from './services/crm-bridge.service';
import { useContactStore } from './store/contactStore';

// Initialize CRM Bridge with contact store
const contactStore = useContactStore.getState();
crmBridge.setContactStore({
  setContacts: contactStore.setContacts,
  addContactLocally: contactStore.addContactLocally,
  updateContactLocally: contactStore.updateContactLocally,
  deleteContactLocally: contactStore.deleteContactLocally
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
