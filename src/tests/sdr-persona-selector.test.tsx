import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SDRPersonaSelector } from '../components/contacts/SDRPersonaSelector';

// Mock the personas module
vi.mock('../agents/personas', () => ({
  OUTBOUND_PERSONAS: [
    {
      id: 'cold_saas_founder',
      name: 'Cold Outbound SaaS Founder',
      label: '🚀 Cold SaaS Founder',
      shortTag: 'SaaS Founder',
      description: 'Founder-to-founder style outreach designed to book product demos.',
      idealUseCases: ['SaaS cold outreach', 'Founder networking', 'Product demos'],
      defaultTone: 'confident, intelligent, concise, founder-to-founder',
      systemPrompt: 'Mock system prompt'
    },
    {
      id: 'b2b_saas_sdr',
      name: 'B2B SaaS SDR Pipeline Builder',
      label: '🎯 B2B SaaS SDR',
      shortTag: 'B2B SDR',
      description: 'Persona for B2B SaaS outreach focused on problem → value → meeting.',
      idealUseCases: ['B2B sales development', 'Pipeline building', 'Enterprise outreach'],
      defaultTone: 'crisp, respectful, direct, low-friction',
      systemPrompt: 'Mock system prompt'
    }
  ],
  OutboundPersonaId: {} as any
}));

const mockContact = {
  id: 'test-contact-123',
  name: 'John Doe',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  phone: '+1234567890',
  title: 'CEO',
  company: 'Test Company',
  industry: 'Technology',
  avatarSrc: '',
  sources: ['LinkedIn'],
  interestLevel: 'hot' as const,
  status: 'prospect' as const,
  notes: '',
  tags: [],
  aiScore: 85,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  socialProfiles: {},
  customFields: {}
};

describe('SDRPersonaSelector', () => {
  it('should render with default title and description', () => {
    render(<SDRPersonaSelector contact={mockContact} />);

    expect(screen.getByText('SDR Personas')).toBeInTheDocument();
    expect(screen.getByText('Select an AI-powered persona to engage with this contact')).toBeInTheDocument();
  });

  it('should render with custom title and description', () => {
    const customTitle = 'Custom SDR Title';
    const customDescription = 'Custom description for SDR personas';

    render(
      <SDRPersonaSelector
        contact={mockContact}
        title={customTitle}
        description={customDescription}
      />
    );

    expect(screen.getByText(customTitle)).toBeInTheDocument();
    expect(screen.getByText(customDescription)).toBeInTheDocument();
  });

  it('should filter personas based on categoryFilter', () => {
    render(
      <SDRPersonaSelector
        contact={mockContact}
        categoryFilter={['cold_saas_founder']}
      />
    );

    // Should show the filtered persona
    expect(screen.getByText('🚀 Cold SaaS Founder')).toBeInTheDocument();

    // Should not show personas not in the filter
    expect(screen.queryByText('🎯 B2B SaaS SDR')).not.toBeInTheDocument();
  });

  it('should show all personas when no categoryFilter is provided', () => {
    render(<SDRPersonaSelector contact={mockContact} />);

    expect(screen.getByText('🚀 Cold SaaS Founder')).toBeInTheDocument();
    expect(screen.getByText('🎯 B2B SaaS SDR')).toBeInTheDocument();
  });

  it('should display persona information correctly', () => {
    render(<SDRPersonaSelector contact={mockContact} />);

    expect(screen.getByText('Founder-to-founder style outreach designed to book product demos.')).toBeInTheDocument();
    expect(screen.getByText('confident, intelligent, concise, founder-to-founder')).toBeInTheDocument();
  });

  it('should call handleRunPersona when Run SDR button is clicked', async () => {
    // Mock console.log to avoid console output in tests
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    render(<SDRPersonaSelector contact={mockContact} />);

    const runButtons = screen.getAllByText('Run SDR');
    expect(runButtons.length).toBeGreaterThan(0);

    fireEvent.click(runButtons[0]!);

    // Wait for the async operation to complete
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Running SDR persona cold_saas_founder for contact test-contact-123'
      );
    });

    consoleSpy.mockRestore();
  });

  it('should show loading state when running SDR', async () => {
    render(<SDRPersonaSelector contact={mockContact} />);

    const runButtons = screen.getAllByText('Run SDR');
    expect(runButtons.length).toBeGreaterThan(0);

    fireEvent.click(runButtons[0]!);

    // Should show loading text
    await waitFor(() => {
      expect(screen.getByText('Running...')).toBeInTheDocument();
    });
  });

  it('should display info section about SDR personas', () => {
    render(<SDRPersonaSelector contact={mockContact} />);

    expect(screen.getByText('About SDR Personas')).toBeInTheDocument();
    expect(screen.getByText(/Each SDR persona is optimized for specific outreach scenarios/)).toBeInTheDocument();
  });
});