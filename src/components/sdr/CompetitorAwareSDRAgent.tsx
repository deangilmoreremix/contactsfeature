import React from 'react';
import { Contact } from '../../types/contact';
import { GenericSdrAgentCard, GenericSdrAgentConfig } from './GenericSdrAgentCard';

const config: GenericSdrAgentConfig = {
  slug: 'competitor-aware-sdr',
  title: 'Competitor-Aware SDR',
  emoji: '⚔️',
  description: 'Outreach that positions against a verified competitor.',
  buttonLabel: 'Research & write email',
  fields: [
    { key: 'competitor', label: 'Competitor', kind: 'badge' },
    { key: 'differentiators', label: 'Differentiators', kind: 'list' },
    { key: 'sources', label: 'Sources', kind: 'list' },
    { key: 'subject', label: 'Subject' },
    { key: 'body', label: 'Email' },
    { key: 'battlecard', label: 'Battlecard' },
  ],
  draft: { subjectKey: 'subject', bodyKey: 'body' },
};

export const CompetitorAwareSDRAgent: React.FC<{ contact?: Contact }> = ({ contact }) => (
  <GenericSdrAgentCard contact={contact} config={config} />
);
