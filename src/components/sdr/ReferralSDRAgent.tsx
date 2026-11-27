import React from 'react';
import { Contact } from '../../types/contact';
import { GenericSdrAgentCard, GenericSdrAgentConfig } from './GenericSdrAgentCard';

const config: GenericSdrAgentConfig = {
  slug: 'referral-sdr',
  title: 'Referral SDR',
  emoji: '🤝',
  description: 'Referral and warm-introduction requests.',
  buttonLabel: 'Write referral request',
  fields: [
    { key: 'subject', label: 'Subject' },
    { key: 'body', label: 'Email' },
    { key: 'forwardableBlurb', label: 'Forwardable blurb' },
    { key: 'idealIntroProfile', label: 'Ideal introduction' },
  ],
  draft: { subjectKey: 'subject', bodyKey: 'body' },
};

export const ReferralSDRAgent: React.FC<{ contact?: Contact }> = ({ contact }) => (
  <GenericSdrAgentCard contact={contact} config={config} />
);
