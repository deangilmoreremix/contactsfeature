import React from 'react';
import { Contact } from '../../types/contact';
import { GenericSdrAgentCard, GenericSdrAgentConfig } from './GenericSdrAgentCard';

const config: GenericSdrAgentConfig = {
  slug: 'data-enrichment-sdr',
  title: 'Data Enrichment SDR',
  emoji: '🔎',
  description: 'Verifies public details about the contact with web research.',
  buttonLabel: 'Research contact',
  fields: [
    { key: 'summary', label: 'Summary' },
    { key: 'title', label: 'Title' },
    { key: 'company', label: 'Company' },
    { key: 'industry', label: 'Industry' },
    { key: 'companySize', label: 'Company size' },
    { key: 'linkedinUrl', label: 'Profile' },
    { key: 'websiteUrl', label: 'Website' },
    { key: 'confidence', label: 'Confidence', kind: 'badge' },
    { key: 'evidence', label: 'Evidence', kind: 'list' },
  ],
};

export const DataEnrichmentSDRAgent: React.FC<{ contact?: Contact }> = ({ contact }) => (
  <GenericSdrAgentCard contact={contact} config={config} />
);
