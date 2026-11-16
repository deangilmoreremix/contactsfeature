import React from 'react';
import { Contact } from '../../types/contact';
import { GenericSdrAgentCard, GenericSdrAgentConfig } from './GenericSdrAgentCard';

const config: GenericSdrAgentConfig = {
  slug: 'event-based-sdr',
  title: 'Event-Based SDR',
  emoji: '📅',
  description: 'Outreach triggered by a real, recent event (researched with web search).',
  buttonLabel: 'Find event & write email',
  fields: [
    { key: 'trigger', label: 'Trigger' },
    { key: 'eventSources', label: 'Sources', kind: 'list' },
    { key: 'subject', label: 'Subject' },
    { key: 'body', label: 'Email' },
  ],
  draft: { subjectKey: 'subject', bodyKey: 'body' },
};

export const EventBasedSDRAgent: React.FC<{ contact?: Contact }> = ({ contact }) => (
  <GenericSdrAgentCard contact={contact} config={config} />
);
