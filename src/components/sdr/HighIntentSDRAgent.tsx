import React from 'react';
import { Contact } from '../../types/contact';
import { GenericSdrAgentCard, GenericSdrAgentConfig } from './GenericSdrAgentCard';

const config: GenericSdrAgentConfig = {
  slug: 'high-intent-sdr',
  title: 'High-Intent SDR',
  emoji: '🔥',
  description: 'Fast, direct replies to contacts showing buying intent.',
  buttonLabel: 'Analyze intent & reply',
  fields: [
    { key: 'urgency', label: 'Urgency', kind: 'badge' },
    { key: 'intentSignals', label: 'Intent signals', kind: 'list' },
    { key: 'subject', label: 'Subject' },
    { key: 'body', label: 'Email' },
    { key: 'suggestedNextAction', label: 'Next action' },
  ],
  draft: { subjectKey: 'subject', bodyKey: 'body' },
};

export const HighIntentSDRAgent: React.FC<{ contact?: Contact }> = ({ contact }) => (
  <GenericSdrAgentCard contact={contact} config={config} />
);
