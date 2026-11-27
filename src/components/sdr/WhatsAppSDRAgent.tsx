import React from 'react';
import { Contact } from '../../types/contact';
import { GenericSdrAgentCard, GenericSdrAgentConfig } from './GenericSdrAgentCard';

const config: GenericSdrAgentConfig = {
  slug: 'whatsapp-sdr',
  title: 'WhatsApp SDR',
  emoji: '💬',
  description: 'Short, conversational WhatsApp messages (opt-in required).',
  buttonLabel: 'Write WhatsApp message',
  fields: [
    { key: 'message', label: 'Message' },
    { key: 'templateSuggestion', label: 'Template suggestion' },
    { key: 'optInReminder', label: 'Opt-in reminder' },
  ],
  draft: { bodyKey: 'message' },
};

export const WhatsAppSDRAgent: React.FC<{ contact?: Contact }> = ({ contact }) => (
  <GenericSdrAgentCard contact={contact} config={config} />
);
