/**
 * Comprehensive tests for SDR Agent User Controls System
 * Tests the complete SDR Agent configuration and campaign building functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SDRAgentConfigurator } from '../components/sdr/SDRAgentConfigurator';
import { CampaignBuilder } from '../components/sdr/CampaignBuilder';
import { VoiceAgentPanel } from '../components/VoiceAgentPanel';
import { VideoAgentPanel } from '../components/VideoAgentPanel';
import { HeatmapPanel } from '../components/HeatmapPanel';
import { PlaybooksPanel } from '../components/PlaybooksPanel';
import { getCurrentUser } from '../lib/supabase';

// Mock dependencies
vi.mock('../services/sdrPreferencesService', () => ({
  SDRPreferencesService: {
    saveUserPreferences: vi.fn(),
    loadUserPreferences: vi.fn(),
    saveCampaignTemplate: vi.fn(),
    loadCampaignTemplates: vi.fn(),
    getDefaultPreferences: vi.fn()
  }
}));

vi.mock('../components/ui/GlassCard', () => ({
  GlassCard: ({ children, className }: any) => (
    <div data-testid="glass-card" className={className}>
      {children}
    </div>
  )
}));

vi.mock('../components/ui/ModernButton', () => ({
  ModernButton: ({ children, onClick, loading, variant, size, className, disabled }: any) => (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={className}
      data-variant={variant}
      data-size={size}
    >
      {loading ? 'Loading...' : children}
    </button>
  )
}));

const supa = vi.hoisted(() => ({ maybeSingle: vi.fn(), insert: vi.fn(), from: vi.fn() }));
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
    from: supa.from
  },
  getCurrentUser: vi.fn().mockResolvedValue({ id: 'user-1' })
}));

vi.mock('../services/sdrClient', () => ({
  sdrAuthHeaders: vi.fn().mockResolvedValue({ Authorization: 'Bearer test' })
}));

// The panels stream through useAIStream; the SSE transport is mocked, the hook and panels are real.
const streamSse = vi.hoisted(() => vi.fn());
vi.mock('../lib/streaming/streamClient', async (orig) => ({
  ...(await orig<typeof import('../lib/streaming/streamClient')>()),
  streamSse
}));

describe('SDR Agent User Controls System', () => {
  const mockUserPreferences = {
    userId: 'demo-user',
    agentId: 'voice-agent',
    campaignLength: 5,
    tone: 'professional' as const,
    channels: ['email' as const, 'linkedin' as const],
    personalizationLevel: 'high' as const,
    primaryChannel: 'email' as const,
    messageDelay: 24,
    timingRules: {
      timezone: 'America/New_York',
      businessHoursOnly: true,
      respectWeekends: false,
      maxPerDay: 5,
      maxPerWeek: 25
    },
    followUpRules: [],
    successCriteria: {
      opened: { weight: 0.3, action: 'continue' as const },
      clicked: { weight: 0.5, action: 'escalate' as const },
      replied: { weight: 1.0, action: 'handover' as const },
      unsubscribed: { weight: -1.0, action: 'stop' as const }
    },
    objectionHandling: [],
    competitorStrategy: {
      knownCompetitors: ['Competitor A', 'Competitor B'],
      positioning: 'value-driven'
    },
    branding: {
      companyName: 'Test Company',
      signature: 'Best regards, SDR Team'
    },
    aiSettings: {
      model: 'gpt-4' as const,
      temperature: 0.7,
      maxTokens: 1000
    },
    customPrompts: {
      general: 'Use professional language and focus on value proposition.'
    }
  };

  const mockCampaignSequence = [
    {
      id: 'step-1',
      day: 0,
      type: 'email',
      template: 'introduction',
      subject: 'Introduction to SmartCRM',
      delay: 3,
      conditions: []
    },
    {
      id: 'step-2',
      day: 3,
      type: 'linkedin',
      template: 'follow-up',
      delay: 5,
      conditions: []
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    streamSse.mockReset();
    // campaign save: supabase.from('sdr_campaigns').insert(row).select().maybeSingle()
    supa.maybeSingle.mockReset().mockResolvedValue({ data: { id: 'template-1' }, error: null });
    supa.insert.mockReset().mockImplementation(() => ({ select: () => ({ maybeSingle: supa.maybeSingle }) }));
    supa.from.mockReset().mockImplementation(() => ({ insert: supa.insert }));
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 'user-1' } as never);
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('SDRAgentConfigurator Component', () => {
    const mockOnSave = vi.fn();
    const mockOnClose = vi.fn();

    it('should render with proper structure and tabs', () => {
      render(
        <SDRAgentConfigurator
          agentId="voice-agent"
          agentName="Voice Agent"
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Configure Voice Agent')).toBeInTheDocument();
      expect(screen.getByText('Basic Settings')).toBeInTheDocument();
      expect(screen.getByText('Timing & Schedule')).toBeInTheDocument();
      expect(screen.getByText('Advanced')).toBeInTheDocument();
      expect(screen.getByText('AI Settings')).toBeInTheDocument();
    });

    it('should display current configuration values', () => {
      render(
        <SDRAgentConfigurator
          agentId="voice-agent"
          agentName="Voice Agent"
          currentConfig={mockUserPreferences}
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      );

      // selects display the selected option's label
      expect(screen.getByDisplayValue('Five Touch (5 messages)')).toBeInTheDocument(); // campaignLength
      expect(screen.getByDisplayValue('Professional')).toBeInTheDocument(); // tone
      fireEvent.click(screen.getByText('Timing & Schedule'));
      expect(screen.getByDisplayValue('24')).toBeInTheDocument(); // messageDelay
    });

    it('should show Campaign Builder button', () => {
      render(
        <SDRAgentConfigurator
          agentId="voice-agent"
          agentName="Voice Agent"
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Campaign Builder')).toBeInTheDocument();
    });

    it('should save configuration successfully', async () => {
      const { SDRPreferencesService } = await import('../services/sdrPreferencesService');
      vi.mocked(SDRPreferencesService.saveUserPreferences).mockResolvedValue(mockUserPreferences);

      render(
        <SDRAgentConfigurator
          agentId="voice-agent"
          agentName="Voice Agent"
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      );

      const saveButton = screen.getByText('Save Configuration');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled();
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should validate configuration before saving', async () => {
      render(
        <SDRAgentConfigurator
          agentId="voice-agent"
          agentName="Voice Agent"
          currentConfig={{ ...mockUserPreferences, campaignLength: 25 }}
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      );

      fireEvent.click(screen.getByText('Save Configuration'));

      // An out-of-range campaign length is rejected before onSave runs
      expect(await screen.findByText('Campaign length must be between 1 and 20 messages')).toBeInTheDocument();
      expect(mockOnSave).not.toHaveBeenCalled();
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should handle save errors gracefully', async () => {
      const failingSave = vi.fn().mockRejectedValue(new Error('Save failed'));
      vi.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <SDRAgentConfigurator
          agentId="voice-agent"
          agentName="Voice Agent"
          onSave={failingSave}
          onClose={mockOnClose}
        />
      );

      fireEvent.click(screen.getByText('Save Configuration'));

      await waitFor(() => {
        expect(screen.getByText('Failed to save configuration. Please try again.')).toBeInTheDocument();
      });
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('CampaignBuilder Component', () => {
    const mockOnSave = vi.fn();
    const mockOnPreview = vi.fn();
    const mockOnClose = vi.fn();

    it('should render with drag-and-drop interface', () => {
      render(
        <CampaignBuilder
          agentId="voice-agent"
          agentName="Voice Agent"
          onSave={mockOnSave}
          onPreview={mockOnPreview}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Campaign Builder - Voice Agent')).toBeInTheDocument();
      expect(screen.getByText('Design your personalized SDR campaign sequence')).toBeInTheDocument();
      expect(screen.getByText('Campaign Sequence')).toBeInTheDocument();
    });

    it('should display initial campaign step', () => {
      render(
        <CampaignBuilder
          agentId="voice-agent"
          agentName="Voice Agent"
          onSave={mockOnSave}
          onPreview={mockOnPreview}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Day 0')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Email')).toBeInTheDocument(); // step type select
      expect(screen.getByDisplayValue('Introduction')).toBeInTheDocument(); // template select
    });

    it('should allow adding new campaign steps', () => {
      render(
        <CampaignBuilder
          agentId="voice-agent"
          agentName="Voice Agent"
          onSave={mockOnSave}
          onPreview={mockOnPreview}
          onClose={mockOnClose}
        />
      );

      const addButton = screen.getByText('Add Campaign Step');
      fireEvent.click(addButton);

      expect(screen.getByText('Day 0')).toBeInTheDocument();
      expect(screen.getByText('Day 3')).toBeInTheDocument();
      expect(screen.getAllByText(/^Day \d+$/)).toHaveLength(2);
    });

    it('should allow removing campaign steps', () => {
      render(
        <CampaignBuilder
          agentId="voice-agent"
          agentName="Voice Agent"
          initialSequence={mockCampaignSequence}
          onSave={mockOnSave}
          onPreview={mockOnPreview}
          onClose={mockOnClose}
        />
      );

      // The remove buttons are icon-only (lucide Trash2)
      const removeButtons = Array.from(document.querySelectorAll('button')).filter(b => b.querySelector('svg.lucide-trash2, svg.lucide-trash-2'));
      expect(removeButtons).toHaveLength(2);
      fireEvent.click(removeButtons[0]);

      expect(screen.getAllByText(/^Day \d+$/)).toHaveLength(1);
      expect(screen.getByText('Day 3')).toBeInTheDocument();
    });

    it('should save campaign template successfully', async () => {
      render(
        <CampaignBuilder
          agentId="voice-agent"
          agentName="Voice Agent"
          initialSequence={mockCampaignSequence as any}
          onSave={mockOnSave}
          onPreview={mockOnPreview}
          onClose={mockOnClose}
        />
      );

      // Fill template form
      const nameInput = screen.getByPlaceholderText('My Custom Campaign');
      fireEvent.change(nameInput, { target: { value: 'Test Campaign' } });

      fireEvent.click(screen.getByText('Save Template'));

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(expect.objectContaining({ id: 'template-1', name: 'Test Campaign', agentId: 'voice-agent' }));
      });
      expect(supa.from).toHaveBeenCalledWith('sdr_campaigns');
      expect(supa.insert).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'user-1', name: 'Test Campaign', agent_id: 'voice-agent', total_steps: 2, duration_days: 3 }));
      expect(window.alert).toHaveBeenCalledWith('Campaign saved successfully!');
    });

    it('should not allow saving a template without a name', () => {
      render(<CampaignBuilder agentId="voice-agent" agentName="Voice Agent" onSave={mockOnSave} onClose={mockOnClose} />);

      const saveButton = screen.getByText('Save Template').closest('button')!;
      expect(saveButton).toBeDisabled();

      fireEvent.click(saveButton);
      expect(supa.insert).not.toHaveBeenCalled();
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('should show campaign statistics', () => {
      render(
        <CampaignBuilder
          agentId="voice-agent"
          agentName="Voice Agent"
          initialSequence={mockCampaignSequence}
          onSave={mockOnSave}
          onPreview={mockOnPreview}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Total Steps: 2')).toBeInTheDocument();
      expect(screen.getByText('Duration: 3 days')).toBeInTheDocument();
      expect(screen.getByText('Channels Used: 2')).toBeInTheDocument();
    });
  });

  describe('SDR Panel Settings Integration', () => {
    describe('VoiceAgentPanel Settings', () => {
      it('should show settings button', () => {
        render(<VoiceAgentPanel />);
        expect(screen.getByTitle('Configure Voice Agent Settings')).toBeInTheDocument();
      });

      it('should open settings modal when clicked', () => {
        render(<VoiceAgentPanel />);
        const settingsButton = screen.getByTitle('Configure Voice Agent Settings');
        fireEvent.click(settingsButton);

        expect(screen.getByText('Configure Voice Agent')).toBeInTheDocument();
      });
    });

    describe('VideoAgentPanel Settings', () => {
      it('should show settings button', () => {
        render(<VideoAgentPanel />);
        expect(screen.getByTitle('Configure Video Agent Settings')).toBeInTheDocument();
      });

      it('should open settings modal when clicked', () => {
        render(<VideoAgentPanel />);
        const settingsButton = screen.getByTitle('Configure Video Agent Settings');
        fireEvent.click(settingsButton);

        expect(screen.getByText('Configure Video Agent')).toBeInTheDocument();
      });
    });

    describe('HeatmapPanel Settings', () => {
      it('should show settings button', () => {
        render(<HeatmapPanel />);
        expect(screen.getByTitle('Configure Heatmap Settings')).toBeInTheDocument();
      });

      it('should open settings modal when clicked', () => {
        render(<HeatmapPanel />);
        const settingsButton = screen.getByTitle('Configure Heatmap Settings');
        fireEvent.click(settingsButton);

        expect(screen.getByText('Configure Deal Heatmap')).toBeInTheDocument();
      });
    });

    describe('PlaybooksPanel Settings', () => {
      it('should show settings button', () => {
        render(<PlaybooksPanel />);
        expect(screen.getByTitle('Configure Playbooks Settings')).toBeInTheDocument();
      });

      it('should open settings modal when clicked', () => {
        render(<PlaybooksPanel />);
        const settingsButton = screen.getByTitle('Configure Playbooks Settings');
        fireEvent.click(settingsButton);

        expect(screen.getByText('Configure Playbooks AI')).toBeInTheDocument();
      });
    });
  });

  describe('End-to-End Integration', () => {
    it('should allow complete SDR agent configuration workflow', async () => {
      // Start with VoiceAgentPanel
      render(<VoiceAgentPanel />);
      const settingsButton = screen.getByTitle('Configure Voice Agent Settings');
      fireEvent.click(settingsButton);

      // Configure agent settings
      expect(screen.getByText('Configure Voice Agent')).toBeInTheDocument();

      // Change campaign length
      const campaignLengthSelect = screen.getByDisplayValue('Five Touch (5 messages)'); // default
      fireEvent.change(campaignLengthSelect, { target: { value: '7' } });
      expect(screen.getByDisplayValue('Extended (7 messages)')).toBeInTheDocument();

      // Open Campaign Builder
      const campaignBuilderButton = screen.getByText('Campaign Builder');
      fireEvent.click(campaignBuilderButton);

      // Verify Campaign Builder opens
      expect(screen.getByText('Campaign Builder - Voice Agent')).toBeInTheDocument();

      // Add a step
      const addButton = screen.getByText('Add Campaign Step');
      fireEvent.click(addButton);

      // Save template
      const nameInput = screen.getByPlaceholderText('My Custom Campaign');
      fireEvent.change(nameInput, { target: { value: 'My Campaign' } });

      const saveTemplateButton = screen.getByText('Save Template');
      fireEvent.click(saveTemplateButton);

      await waitFor(() => {
        expect(supa.insert).toHaveBeenCalledWith(expect.objectContaining({ name: 'My Campaign', agent_id: 'voice-agent', total_steps: 2 }));
      });
      expect(window.alert).toHaveBeenCalledWith('Campaign saved successfully!');
    });

    it('should handle API errors gracefully across all components', async () => {
      streamSse.mockRejectedValueOnce(new Error('Network error'));

      render(<VoiceAgentPanel />);

      const contactIdInput = screen.getByPlaceholderText('Enter contact UUID');
      const scriptTextarea = screen.getByPlaceholderText(/Hi \{\{name\}\}, just wanted to quickly walk you through/);

      fireEvent.change(contactIdInput, { target: { value: 'contact-123' } });
      fireEvent.change(scriptTextarea, { target: { value: 'Test script' } });

      const generateButton = screen.getByText('Generate Voice Message');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('⚠️ Network error')).toBeInTheDocument();
      });
    });
  });

  describe('Performance and Accessibility', () => {
    it('should be keyboard accessible', () => {
      render(<VoiceAgentPanel />);
      const settingsButton = screen.getByTitle('Configure Voice Agent Settings');

      // Should be focusable
      settingsButton.focus();
      expect(document.activeElement).toBe(settingsButton);
    });

    it('should handle rapid interactions without breaking', () => {
      render(<VoiceAgentPanel />);

      const settingsButton = screen.getByTitle('Configure Voice Agent Settings');

      // Rapid clicks should not break
      fireEvent.click(settingsButton);
      fireEvent.click(settingsButton);
      fireEvent.click(settingsButton);

      expect(screen.getByText('Configure Voice Agent')).toBeInTheDocument();
    });

    it('should discard unsaved changes when the settings modal is cancelled', () => {
      render(<VoiceAgentPanel />);

      // Open settings
      const settingsButton = screen.getByTitle('Configure Voice Agent Settings');
      fireEvent.click(settingsButton);

      // Change a setting
      const campaignLengthSelect = screen.getByDisplayValue('Five Touch (5 messages)');
      fireEvent.change(campaignLengthSelect, { target: { value: '7' } });

      // Close and reopen
      const closeButton = screen.getByText('Cancel');
      fireEvent.click(closeButton);

      // Reopen settings
      fireEvent.click(settingsButton);

      // Cancel does not save, so the reopened modal shows the defaults again
      expect(screen.getByDisplayValue('Five Touch (5 messages)')).toBeInTheDocument();
      expect(screen.queryByDisplayValue('Extended (7 messages)')).not.toBeInTheDocument();
    });
  });

  describe('Error Boundaries and Edge Cases', () => {
    it('should handle missing user preferences gracefully', async () => {
      const { SDRPreferencesService } = await import('../services/sdrPreferencesService');
      vi.mocked(SDRPreferencesService.loadUserPreferences).mockResolvedValue(null);

      render(<VoiceAgentPanel />);

      const settingsButton = screen.getByTitle('Configure Voice Agent Settings');
      fireEvent.click(settingsButton);

      // Should show default values
      expect(screen.getByDisplayValue('Five Touch (5 messages)')).toBeInTheDocument(); // default campaign length
    });

    it('should handle malformed campaign sequences', () => {
      const invalidSequence = [
        { day: 0, type: 'invalid', template: 'test' } // missing required fields
      ];

      render(
        <CampaignBuilder
          agentId="voice-agent"
          agentName="Voice Agent"
          initialSequence={invalidSequence as any}
          onSave={() => {}}
          onPreview={() => {}}
          onClose={() => {}}
        />
      );

      // Should render without crashing
      expect(screen.getByText('Campaign Builder - Voice Agent')).toBeInTheDocument();
    });

    it('should handle network timeouts', async () => {
      streamSse.mockImplementationOnce(() => new Promise(() => {})); // never settles

      render(<VoiceAgentPanel />);

      const contactIdInput = screen.getByPlaceholderText('Enter contact UUID');
      const scriptTextarea = screen.getByPlaceholderText(/Hi \{\{name\}\}, just wanted to quickly walk you through/);

      fireEvent.change(contactIdInput, { target: { value: 'contact-123' } });
      fireEvent.change(scriptTextarea, { target: { value: 'Test script' } });

      const generateButton = screen.getByText('Generate Voice Message');
      fireEvent.click(generateButton);

      // Should show loading state
      expect(screen.getByText('Writing Voice Script...')).toBeInTheDocument();
    });
  });
});