/**
 * Test-only entry (served by the Vite dev server, never part of the production build): mounts the real panels that
 * show live AI output so Playwright can watch them fill in. Auth + REST are mocked by the spec, AI endpoints are
 * served by a dripping SSE server proxied through /.netlify/functions.
 *   ?c=insights|health|forecast|enrich|analytics   &theme=light|dark
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '../../../src/index.css';
import { AIProvider } from '../../../src/contexts/AIContext';
import { AIInsightsPanel } from '../../../src/components/contacts/AIInsightsPanel';
import { DealHealthPanel } from '../../../src/components/ai-sales-intelligence/DealHealthPanel';
import { SalesForecastingWidget } from '../../../src/components/ai-sales-intelligence/SalesForecastingWidget';
import { ContactSidebar } from '../../../src/components/contacts/ContactSidebar';
import { ContactAnalytics } from '../../../src/components/contacts/ContactAnalytics';

const params = new URLSearchParams(location.search);
const which = params.get('c') || 'insights';
const dark = params.get('theme') === 'dark';
// same two switches the app sets in useDarkMode
document.documentElement.classList.toggle('dark', dark);
document.body.classList.toggle('dark-mode', dark);

const contact = {
  id: '22222222-2222-2222-2222-222222222222',
  firstName: 'Ada', lastName: 'Lovelace', name: 'Ada Lovelace',
  email: 'ada@acme.com', company: 'Acme Corp', title: '', industry: '', status: 'lead', interestLevel: 'medium',
  sources: [], tags: [], socialProfiles: {}, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
} as never;

function EnrichHarness() {
  const [last, setLast] = React.useState<null>(null);
  const [busy, setBusy] = React.useState(false);
  return (
    <div style={{ width: 380 }} className="bg-white dark:bg-gray-900">
      <ContactSidebar contact={contact} onClose={() => {}} onUpdate={async (_id, u) => ({ ...(contact as object), ...u }) as never}
        lastEnrichment={last} setLastEnrichment={setLast as never} isEnriching={busy} setIsEnriching={setBusy} />
    </div>
  );
}

const view =
  which === 'health' ? <div className="max-w-xl"><DealHealthPanel contactId={(contact as { id: string }).id} contactName="Ada Lovelace" /></div> :
  which === 'forecast' ? <div className="max-w-3xl"><SalesForecastingWidget /></div> :
  which === 'enrich' ? <EnrichHarness /> :
  which === 'analytics' ? <ContactAnalytics contact={contact} /> :
  <AIProvider><AIInsightsPanel contact={contact} /></AIProvider>;

createRoot(document.getElementById('root')!).render(
  <div className="min-h-screen p-6 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">{view}</div>
);
