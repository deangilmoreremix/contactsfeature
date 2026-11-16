import React from 'react';
import { Contact } from '../../types/contact';
import { GenericSdrAgentCard, GenericSdrAgentConfig } from './GenericSdrAgentCard';

const config: GenericSdrAgentConfig = {
  slug: 'linkedin-sdr',
  title: 'LinkedIn SDR',
  emoji: '💼',
  description: 'Connection notes and follow-up messages for LinkedIn outreach.',
  buttonLabel: 'Write LinkedIn messages',
  fields: [
    { key: 'connectionNote', label: 'Connection note' },
    { key: 'followUpMessage', label: 'Follow-up message' },
    { key: 'talkingPoints', label: 'Talking points', kind: 'list' },
  ],
  draft: { bodyKey: 'followUpMessage' },
};

export const LinkedInSDRAgent: React.FC<{ contact?: Contact }> = ({ contact }) => (
  <GenericSdrAgentCard contact={contact} config={config} />
);
