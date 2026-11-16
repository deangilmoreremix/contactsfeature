import React from 'react';
import { Contact } from '../../types/contact';
import { GenericSdrAgentCard, GenericSdrAgentConfig } from './GenericSdrAgentCard';

const config: GenericSdrAgentConfig = {
  slug: 'newsletter-sdr',
  title: 'Newsletter SDR',
  emoji: '📰',
  description: 'Newsletter-style invitations and issue teasers.',
  buttonLabel: 'Write newsletter email',
  fields: [
    { key: 'subject', label: 'Subject' },
    { key: 'preheader', label: 'Preheader' },
    { key: 'body', label: 'Body' },
    { key: 'cta', label: 'Call to action' },
  ],
  draft: { subjectKey: 'subject', bodyKey: 'body' },
};

export const NewsletterSDRAgent: React.FC<{ contact?: Contact }> = ({ contact }) => (
  <GenericSdrAgentCard contact={contact} config={config} />
);
