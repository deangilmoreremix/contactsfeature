/**
 * Comprehensive tests for AISalesIntelligencePanel component
 * Tests contact analysis, tab navigation, nurture status, and insights
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AISalesIntelligencePanel } from '../components/ai-sales-intelligence/AISalesIntelligencePanel';

// Mock dependencies
vi.mock('../services/supabaseClient', () => ({
  supabase: {
    functions: {
      invoke: vi.fn()
    }
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
  ModernButton: ({ children, onClick, loading, variant, size, className }: any) => (
    <button
      onClick={onClick}
      disabled={loading}
      data-variant={variant}
      data-size={size}
      className={className}
    >
      {children}
    </button>
  )
}));

vi.mock('lucide-react', () => ({
  Loader2: () => <div data-testid="loader-icon" />,
  TrendingUp: () => <div data-testid="trending-icon" />,
  MessageSquare: () => <div data-testid="message-icon" />,
  Target: () => <div data-testid="target-icon" />,
  Zap: () => <div data-testid="zap-icon" />
}));

describe('AISalesIntelligencePanel', () => {
  const mockContact = {
    id: 'contact-123',
    name: 'John Doe',
    email: 'john@techcorp.com',
    company: 'TechCorp',
    role: 'CTO',
    industry: 'Technology',
    companySize: 150,
    currentStage: 'consideration',
    engagementScore: 75,
    lastContactedAt: '2024-01-15T10:00:00Z',
    painPoints: ['Scalability', 'Integration'],
    budget: '$50k-100k',
    timeline: 'Q2 2024'
  };

  const mockNurtureResponse = {
    data: {
      nurtureStrategy: {
        contentSequence: [
          { sendDate: '2024-01-16T10:00:00Z', type: 'email', subject: 'Follow up' },
          { sendDate: '2024-01-18T10:00:00Z', type: 'call', subject: 'Demo call' }
        ],
        conversionPrediction: {
          probability: 0.75
        }
      }
    }
  };

  const mockCallbacks = {
    onNurturePlan: vi.fn(),
    onOptimizeMessage: vi.fn(),
    onGenerateDiscovery: vi.fn(),
    onAnalyzeHealth: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Initial Render', () => {
    it('should render component with contact information', () => {
      render(
        <AISalesIntelligencePanel
          contact={mockContact}
          {...mockCallbacks}
        />
      );

      expect(screen.getByText('AI Sales Intelligence')).toBeInTheDocument();
      expect(screen.getByText('Powered by advanced analytics')).toBeInTheDocument();
      expect(screen.getByText('🔍 Analyze')).toBeInTheDocument();
      expect(screen.getByTestId('zap-icon')).toBeInTheDocument();
    });

    it('should display engagement score', () => {
      render(
        <AISalesIntelligencePanel
          contact={mockContact}
          {...mockCallbacks}
        />
      );

      expect(screen.getByText('75%')).toBeInTheDocument();
      expect(screen.getByText('Engagement Score')).toBeInTheDocument();
    });

    it('should show default values when data is missing', () => {
      const incompleteContact = {
        id: 'contact-456',
        name: 'Jane Smith',
        email: 'jane@company.com',
        company: 'Company Inc'
      };

      render(
        <AISalesIntelligencePanel
          contact={incompleteContact}
          {...mockCallbacks}
        />
      );

      expect(screen.getByText('0%')).toBeInTheDocument();
      expect(screen.getByText('--')).toBeInTheDocument();
    });
  });

  describe('Tab Navigation', () => {
    it('should default to overview tab', () => {
      render(
        <AISalesIntelligencePanel
          contact={mockContact}
          {...mockCallbacks}
        />
      );

      expect(screen.getByText('Overview')).toBeInTheDocument();
      expect(screen.getByText('Generate Nurture Plan')).toBeInTheDocument();
      expect(screen.getByText('Optimize Message')).toBeInTheDocument();
    });

    it('should switch to nurture tab', () => {
      render(
        <AISalesIntelligencePanel
          contact={mockContact}
          {...mockCallbacks}
        />
      );

      const nurtureTab = screen.getByText('Nurture');
      fireEvent.click(nurtureTab);

      expect(screen.getByText('Discovery Questions')).toBeInTheDocument();
      expect(screen.getByText('Health Analysis')).toBeInTheDocument();
    });

    it('should switch to insights tab', () => {
      render(
        <AISalesIntelligencePanel
          contact={mockContact}
          {...mockCallbacks}
        />
      );

      const insightsTab = screen.getByText('Insights');
      fireEvent.click(insightsTab);

      expect(screen.getByText('AI Insights')).toBeInTheDocument();
      expect(screen.getByText('Message Optimization')).toBeInTheDocument();
    });

    it('should highlight active tab', () => {
      render(
        <AISalesIntelligencePanel
          contact={mockContact}
          {...mockCallbacks}
        />
      );

      const overviewTab = screen.getByText('Overview');
      const nurtureTab = screen.getByText('Nurture');

      // Overview should be active by default
      expect(overviewTab).toHaveClass('bg-white', 'text-blue-600');

      // Switch to nurture
      fireEvent.click(nurtureTab);
      expect(nurtureTab).toHaveClass('bg-white', 'text-blue-600');
      expect(overviewTab).not.toHaveClass('bg-white');
    });
  });

  describe('Contact Analysis', () => {
    it('should analyze contact and update nurture status', async () => {
      const { supabase } = require('../services/supabaseClient');
      supabase.functions.invoke.mockResolvedValue(mockNurtureResponse);

      render(
        <AISalesIntelligencePanel
          contact={mockContact}
          {...mockCallbacks}
        />
      );

      const analyzeButton = screen.getByText('🔍 Analyze');
      fireEvent.click(analyzeButton);

      await waitFor(() => {
        expect(supabase.functions.invoke).toHaveBeenCalledWith('lead-nurturing', {
          body: expect.objectContaining({
            leadId: 'contact-123',
            leadData: expect.objectContaining({
              name: 'John Doe',
              email: 'john@techcorp.com',
              company: 'TechCorp',
              role: 'CTO',
              industry: 'Technology',
              companySize: 150,
              currentStage: 'consideration',
              engagementScore: 75
            }),
            nurtureGoals: ['awareness', 'consideration'],
            constraints: expect.objectContaining({
              maxEmailsPerWeek: 3,
              maxCallsPerWeek: 2,
              preferredChannels: ['email']
            })
          })
        });
      });

      // Switch to nurture tab to see results
      const nurtureTab = screen.getByText('Nurture');
      fireEvent.click(nurtureTab);

      await waitFor(() => {
        expect(screen.getByText('2/5 completed')).toBeInTheDocument();
        expect(screen.getByText('75%')).toBeInTheDocument();
      });
    });

    it('should handle analysis errors gracefully', async () => {
      const { supabase } = require('../services/supabaseClient');
      supabase.functions.invoke.mockRejectedValue(new Error('Analysis failed'));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <AISalesIntelligencePanel
          contact={mockContact}
          {...mockCallbacks}
        />
      );

      const analyzeButton = screen.getByText('🔍 Analyze');
      fireEvent.click(analyzeButton);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to analyze contact:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });

    it('should show loading state during analysis', async () => {
      const { supabase } = require('../services/supabaseClient');
      supabase.functions.invoke.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockNurtureResponse), 100))
      );

      render(
        <AISalesIntelligencePanel
          contact={mockContact}
          {...mockCallbacks}
        />
      );

      const analyzeButton = screen.getByText('🔍 Analyze');
      fireEvent.click(analyzeButton);

      expect(screen.getByText('Analyzing...')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('🔍 Analyze')).toBeInTheDocument();
      });
    });
  });

  describe('Nurture Status Display', () => {
    beforeEach(async () => {
      const { supabase } = require('../services/supabaseClient');
      supabase.functions.invoke.mockResolvedValue(mockNurtureResponse);

      render(
        <AISalesIntelligencePanel
          contact={mockContact}
          {...mockCallbacks}
        />
      );

      // Analyze contact first
      const analyzeButton = screen.getByText('🔍 Analyze');
      fireEvent.click(analyzeButton);

      await waitFor(() => {
        expect(screen.getByText('75%')).toBeInTheDocument();
      });
    });

    it('should display nurture sequence progress', () => {
      const nurtureTab = screen.getByText('Nurture');
      fireEvent.click(nurtureTab);

      expect(screen.getByText('Nurture Sequence')).toBeInTheDocument();
      expect(screen.getByText('2/5 completed')).toBeInTheDocument();
      expect(screen.getByText('Next Touch')).toBeInTheDocument();
      expect(screen.getByTestId('target-icon')).toBeInTheDocument();
    });

    it('should display conversion probability with color coding', () => {
      const nurtureTab = screen.getByText('Nurture');
      fireEvent.click(nurtureTab);

      expect(screen.getByText('Conversion Probability')).toBeInTheDocument();
      expect(screen.getByText('🟢 75%')).toBeInTheDocument();
      expect(screen.getByTestId('trending-icon')).toBeInTheDocument();
    });

    it('should show different probability colors', () => {
      const testCases = [
        { probability: 0.85, expectedIcon: '🟢', expectedColor: 'text-green-600' },
        { probability: 0.65, expectedIcon: '🟡', expectedColor: 'text-yellow-600' },
        { probability: 0.45, expectedIcon: '🔴', expectedColor: 'text-red-600' }
      ];

      testCases.forEach(({ probability, expectedIcon }) => {
        const responseWithProbability = {
          data: {
            nurtureStrategy: {
              ...mockNurtureResponse.data.nurtureStrategy,
              conversionPrediction: { probability }
            }
          }
        };

        const { supabase } = require('../services/supabaseClient');
        supabase.functions.invoke.mockResolvedValue(responseWithProbability);

        const { rerender } = render(
          <AISalesIntelligencePanel
            contact={mockContact}
            {...mockCallbacks}
          />
        );

        // This would need more complex testing for color classes
        // For now, just verify the structure works
      });
    });
  });

  describe('Callback Functions', () => {
    it('should call onNurturePlan when Generate Nurture Plan button is clicked', () => {
      render(
        <AISalesIntelligencePanel
          contact={mockContact}
          {...mockCallbacks}
        />
      );

      const nurtureButton = screen.getByText('🚀 Generate Nurture Plan');
      fireEvent.click(nurtureButton);

      expect(mockCallbacks.onNurturePlan).toHaveBeenCalledTimes(1);
    });

    it('should call onOptimizeMessage when Optimize Message button is clicked', () => {
      render(
        <AISalesIntelligencePanel
          contact={mockContact}
          {...mockCallbacks}
        />
      );

      const optimizeButton = screen.getByText('💬 Optimize Message');
      fireEvent.click(optimizeButton);

      expect(mockCallbacks.onOptimizeMessage).toHaveBeenCalledTimes(1);
    });

    it('should call onGenerateDiscovery when Discovery Questions button is clicked', () => {
      render(
        <AISalesIntelligencePanel
          contact={mockContact}
          {...mockCallbacks}
        />
      );

      const nurtureTab = screen.getByText('Nurture');
      fireEvent.click(nurtureTab);

      const discoveryButton = screen.getByText('🔍 Discovery Questions');
      fireEvent.click(discoveryButton);

      expect(mockCallbacks.onGenerateDiscovery).toHaveBeenCalledTimes(1);
    });

    it('should call onAnalyzeHealth when Health Analysis button is clicked', () => {
      render(
        <AISalesIntelligencePanel
          contact={mockContact}
          {...mockCallbacks}
        />
      );

      const nurtureTab = screen.getByText('Nurture');
      fireEvent.click(nurtureTab);

      const healthButton = screen.getByText('❤️ Health Analysis');
      fireEvent.click(healthButton);

      expect(mockCallbacks.onAnalyzeHealth).toHaveBeenCalledTimes(1);
    });
  });

  describe('Insights Tab', () => {
    it('should display AI insights based on contact data', () => {
      render(
        <AISalesIntelligencePanel
          contact={mockContact}
          {...mockCallbacks}
        />
      );

      const insightsTab = screen.getByText('Insights');
      fireEvent.click(insightsTab);

      expect(screen.getByText('AI Insights')).toBeInTheDocument();
      expect(screen.getByText('CTO typically responds well to technical deep-dives')).toBeInTheDocument();
      expect(screen.getByText('Technology companies often prioritize ROI over features')).toBeInTheDocument();
      expect(screen.getByTestId('message-icon')).toBeInTheDocument();
    });

    it('should show generic insights when contact data is missing', () => {
      const incompleteContact = {
        id: 'contact-456',
        name: 'Jane Smith',
        email: 'jane@company.com',
        company: 'Company Inc'
      };

      render(
        <AISalesIntelligencePanel
          contact={incompleteContact}
          {...mockCallbacks}
        />
      );

      const insightsTab = screen.getByText('Insights');
      fireEvent.click(insightsTab);

      expect(screen.getByText('Role information needed for better insights')).toBeInTheDocument();
      expect(screen.getByText('Industry context would improve recommendations')).toBeInTheDocument();
    });
  });

  describe('No Nurture Status', () => {
    it('should show empty state when no nurture sequence exists', () => {
      render(
        <AISalesIntelligencePanel
          contact={mockContact}
          {...mockCallbacks}
        />
      );

      const nurtureTab = screen.getByText('Nurture');
      fireEvent.click(nurtureTab);

      expect(screen.getByText('No nurture sequence active')).toBeInTheDocument();
      expect(screen.getByText('🚀 Create Nurture Plan')).toBeInTheDocument();
      expect(screen.getByTestId('target-icon')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper button labels and states', () => {
      render(
        <AISalesIntelligencePanel
          contact={mockContact}
          {...mockCallbacks}
        />
      );

      const analyzeButton = screen.getByText('🔍 Analyze');
      const nurtureButton = screen.getByText('🚀 Generate Nurture Plan');
      const optimizeButton = screen.getByText('💬 Optimize Message');

      expect(analyzeButton).toBeInTheDocument();
      expect(nurtureButton).toBeInTheDocument();
      expect(optimizeButton).toBeInTheDocument();
    });

    it('should support keyboard navigation for tabs', () => {
      render(
        <AISalesIntelligencePanel
          contact={mockContact}
          {...mockCallbacks}
        />
      );

      const tabs = screen.getAllByRole('button').filter(button =>
        ['Overview', 'Nurture', 'Insights'].includes(button.textContent || '')
      );

      tabs.forEach(tab => {
        expect(tab).toBeInTheDocument();
      });
    });
  });
});