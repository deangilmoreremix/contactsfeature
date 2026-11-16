/**
 * Test-only entry (never part of the production build): mounts the real UI callers that show live AI output.
 *   ?c=sdr|autopilot|gtm|emailai|nurture|feature|deal   &theme=light|dark
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '../../../src/index.css';
import { SDRPersonaSelector } from '../../../src/components/contacts/SDRPersonaSelector';
import { AutopilotControlPanel } from '../../../src/components/AutopilotControlPanel';
import GTMPromptHub from '../../../src/pages/GTMPromptHub';
import { AISalesIntelligencePanel } from '../../../src/components/ai-sales-intelligence/AISalesIntelligencePanel';
import { FeatureAnalysisStudio } from '../../../src/components/ai-sales-intelligence/FeatureAnalysisStudio';
import { SDRButtonGroup } from '../../../src/components/deals/SDRButtonGroup';
import { useEmailAI } from '../../../src/hooks/useEmailAI';
import { StreamingOutput } from '../../../src/components/ui/StreamingOutput';
import { ModernButton } from '../../../src/components/ui/ModernButton';
import { liveDisplay } from '../../../src/lib/streaming/previewText';

const params = new URLSearchParams(location.search);
const which = params.get('c') || 'sdr';
const dark = params.get('theme') === 'dark';
document.documentElement.classList.toggle('dark', dark);
document.body.classList.toggle('dark-mode', dark);

const contact = {
  id: '22222222-2222-2222-2222-222222222222', firstName: 'Ada', lastName: 'Lovelace', name: 'Ada Lovelace',
  email: 'ada@acme.com', company: 'Acme Corp', title: 'VP Sales', industry: 'Software', status: 'lead', interestLevel: 'medium',
  sources: [], tags: [], socialProfiles: {}, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
} as never;

/** The three AI methods of useEmailAI, driven by buttons, rendering the hook's own live stream. */
function EmailAIHarness() {
  const ai = useEmailAI();
  const [out, setOut] = React.useState('');
  const run = (fn: () => Promise<unknown>) => { setOut(''); fn().then((r) => setOut(JSON.stringify(r))).catch((e) => setOut(`ERROR ${e.message}`)); };
  return (
    <div className="max-w-xl space-y-3">
      <div className="flex gap-2">
        <ModernButton size="toolbar" onClick={() => run(() => ai.generateEmail(contact, 'follow_up'))}>Compose email</ModernButton>
        <ModernButton size="toolbar" onClick={() => run(() => ai.analyzeEmail('Hi', 'Body text'))}>Analyze email</ModernButton>
        <ModernButton size="toolbar" onClick={() => run(() => ai.generatePersonalizedMessage(contact, 'linkedin'))}>Personalize message</ModernButton>
      </div>
      <StreamingOutput state={ai.liveStream} display={liveDisplay(ai.liveStream.partial, ai.liveStream.text)} onStop={ai.stopLive} placeholder="Working…" />
      <div data-testid="email-final" className="text-xs break-all">{out}</div>
    </div>
  );
}

const view =
  which === 'autopilot' ? <div className="max-w-3xl"><AutopilotControlPanel /></div> :
  which === 'gtm' ? <GTMPromptHub /> :
  which === 'emailai' ? <EmailAIHarness /> :
  which === 'nurture' ? <div className="max-w-xl"><AISalesIntelligencePanel contact={{ id: 'c1', name: 'Ada Lovelace', email: 'ada@acme.com', company: 'Acme Corp', role: 'VP Sales' }} /></div> :
  which === 'feature' ? <div className="max-w-3xl"><FeatureAnalysisStudio /></div> :
  which === 'deal' ? <div className="max-w-xl"><SDRButtonGroup dealId="d1" workspaceId="w1" contact={contact} /></div> :
  <div className="max-w-3xl"><SDRPersonaSelector contact={contact} categoryFilter={['cold_saas_founder', 'b2b_saas_sdr', 'churn_winback']} /></div>;

createRoot(document.getElementById('root')!).render(
  <div className="min-h-screen p-6 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">{view}</div>
);
