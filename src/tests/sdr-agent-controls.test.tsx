/**
 * Comprehensive tests for SDR Agent User Controls System
 * Tests the complete SDR Agent configuration and campaign building functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SDRAgentConfigurator } from '../components/sdr/SDRAgentConfigurator';
import { CampaignBuilder } from '../components/sdr/CampaignBuilder';
import { SDRPreferencesService } from '../services/sdrPreferencesService';
import { VoiceAgentPanel } from '../components/VoiceAgentPanel';
import { VideoAgentPanel } from '../components/VideoAgentPanel';
import { HeatmapPanel } from '../components/HeatmapPanel';
import { PlaybooksPanel } from '../components/PlaybooksPanel';

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

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

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
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.resetAllMocks();
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

      expect(screen.getByDisplayValue('5')).toBeInTheDocument(); // campaignLength
      expect(screen.getByDisplayValue('professional')).toBeInTheDocument(); // tone
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
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      );

      // Try to save without required fields
      const saveButton = screen.getByText('Save Configuration');
      fireEvent.click(saveButton);

      // Should not call onSave due to validation
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('should handle save errors gracefully', async () => {
      const { SDRPreferencesService } = await import('../services/sdrPreferencesService');
      vi.mocked(SDRPreferencesService.saveUserPreferences).mockRejectedValue(new Error('Save failed'));

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
        expect(screen.getByText('Failed to save configuration. Please try again.')).toBeInTheDocument();
      });
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
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('introduction')).toBeInTheDocument();
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

      expect(screen.getAllByText('Day')).toHaveLength(2);
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

      const removeButtons = screen.getAllByRole('button', { name: /trash/i });
      fireEvent.click(removeButtons[0]);

      expect(screen.getAllByText('Day')).toHaveLength(1);
    });

    it('should save campaign template successfully', async () => {
      const { SDRPreferencesService } = await import('../services/sdrPreferencesService');
      vi.mocked(SDRPreferencesService.saveCampaignTemplate).mockResolvedValue({
        id: 'template-1',
        userId: 'demo-user',
        name: 'Test Campaign',
        description: 'A test campaign',
        agentId: 'voice-agent',
        sequence: mockCampaignSequence,
        settings: {},
        isPublic: false,
        usageCount: 0,
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date()
      });

      render(
        <CampaignBuilder
          agentId="voice-agent"
          agentName="Voice Agent"
          onSave={mockOnSave}
          onPreview={mockOnPreview}
          onClose={mockOnClose}
        />
      );

      // Fill template form
      const nameInput = screen.getByPlaceholderText('My Custom Campaign');
      fireEvent.change(nameInput, { target: { value: 'Test Campaign' } });

      const saveButton = screen.getByText('Save Template');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled();
        expect(screen.getByText('Campaign template saved successfully!')).toBeInTheDocument();
      });
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
      expect(screen.getByText('Duration: 5 days')).toBeInTheDocument();
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
      const { SDRPreferencesService } = await import('../services/sdrPreferencesService');
      vi.mocked(SDRPreferencesService.saveUserPreferences).mockResolvedValue(mockUserPreferences);

      // Start with VoiceAgentPanel
      render(<VoiceAgentPanel />);
      const settingsButton = screen.getByTitle('Configure Voice Agent Settings');
      fireEvent.click(settingsButton);

      // Configure agent settings
      expect(screen.getByText('Configure Voice Agent')).toBeInTheDocument();

      // Change campaign length
      const campaignLengthSelect = screen.getByDisplayValue('3'); // default
      fireEvent.change(campaignLengthSelect, { target: { value: '5' } });

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

      vi.mocked(SDRPreferencesService.saveCampaignTemplate).mockResolvedValue({
        id: 'template-1',
        userId: 'demo-user',
        name: 'My Campaign',
        description: '',
        agentId: 'voice-agent',
        sequence: [],
        settings: {},
        isPublic: false,
        usageCount: 0,
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const saveTemplateButton = screen.getByText('Save Template');
      fireEvent.click(saveTemplateButton);

      await waitFor(() => {
        expect(screen.getByText('Campaign template saved successfully!')).toBeInTheDocument();
      });
    });

    it('should handle API errors gracefully across all components', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<VoiceAgentPanel />);

      const contactIdInput = screen.getByPlaceholderText('Enter contact UUID');
      const scriptTextarea = screen.getByPlaceholderText(/Hi \{\{name\}\}, just wanted to quickly walk you through/);

      fireEvent.change(contactIdInput, { target: { value: 'contact-123' } });
      fireEvent.change(scriptTextarea, { target: { value: 'Test script' } });

      const generateButton = screen.getByText('Generate Voice Message');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('⚠️ Failed to run voice agent')).toBeInTheDocument();
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

    it('should maintain state consistency across modal interactions', () => {
      render(<VoiceAgentPanel />);

      // Open settings
      const settingsButton = screen.getByTitle('Configure Voice Agent Settings');
      fireEvent.click(settingsButton);

      // Change a setting
      const campaignLengthSelect = screen.getByDisplayValue('3');
      fireEvent.change(campaignLengthSelect, { target: { value: '7' } });

      // Close and reopen
      const closeButton = screen.getByText('Cancel');
      fireEvent.click(closeButton);

      // Reopen settings
      fireEvent.click(settingsButton);

      // Should remember the change
      expect(screen.getByDisplayValue('7')).toBeInTheDocument();
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
      expect(screen.getByDisplayValue('3')).toBeInTheDocument(); // default campaign length
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
      mockFetch.mockImplementationOnce(
        () => new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ success: true })
        }), 10000)) // 10 second delay
      );

      render(<VoiceAgentPanel />);

      const contactIdInput = screen.getByPlaceholderText('Enter contact UUID');
      const scriptTextarea = screen.getByPlaceholderText(/Hi \{\{name\}\}, just wanted to quickly walk you through/);

      fireEvent.change(contactIdInput, { target: { value: 'contact-123' } });
      fireEvent.change(scriptTextarea, { target: { value: 'Test script' } });

      const generateButton = screen.getByText('Generate Voice Message');
      fireEvent.click(generateButton);

      // Should show loading state
      expect(screen.getByText('Generating Voice...')).toBeInTheDocument();
    });
  });
});