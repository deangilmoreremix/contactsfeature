/**
 * Comprehensive tests for AdaptivePlaybookGenerator component
 * Tests playbook generation, UI interactions, and edge cases
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AdaptivePlaybookGenerator } from '../components/ai-sales-intelligence/AdaptivePlaybookGenerator';

// Mock dependencies
vi.mock('../services/supabaseClient', () => ({
  supabase: {
    functions: {
      invoke: vi.fn()
    }
  }
}));

vi.mock('../components/ui/GlassCard', () => ({
  GlassCard: ({ children, className }: any) => ({
    type: 'div',
    props: { className },
    children
  })
}));

vi.mock('../components/ui/ModernButton', () => ({
  ModernButton: ({ children, onClick, loading, variant, size, className }: any) => ({
    type: 'button',
    props: {
      onClick,
      disabled: loading,
      className,
      'data-variant': variant,
      'data-size': size
    },
    children: loading ? 'Loading...' : children
  })
}));

vi.mock('../components/ui/ResearchThinkingAnimation', () => ({
  useResearchThinking: () => ({
    startResearch: vi.fn(),
    moveToAnalyzing: vi.fn(),
    moveToSynthesizing: vi.fn(),
    complete: vi.fn()
  })
}));

vi.mock('../components/ui/ResearchStatusOverlay', () => ({
  useResearchStatus: () => ({
    status: { isActive: false },
    reset: vi.fn()
  }),
  ResearchStatusOverlay: ({ children }: any) => ({
    type: 'div',
    props: {},
    children
  })
}));

describe('AdaptivePlaybookGenerator', () => {
  const mockDeal = {
    id: 'deal-1',
    name: 'John Doe',
    value: 50000,
    company: 'Tech Corp',
    stage: 'prospect',
    competitors: ['Competitor A', 'Competitor B'],
    stakeholders: [],
    industry: 'Technology',
    companySize: 100
  };

  const mockPlaybookResponse = {
    data: {
      playbook: {
        dealId: 'deal-1',
        strategy: {
          name: 'Strategic Account Development',
          description: 'Comprehensive approach to win the deal',
          confidence: 0.85,
          rationale: 'Based on company size and industry fit'
        },
        phases: [
          {
            id: 'phase-1',
            name: 'Discovery',
            timeline: '2 weeks',
            objectives: ['Understand needs', 'Identify stakeholders'],
            tactics: [
              {
                id: 'tactic-1',
                name: 'Initial Meeting',
                description: 'Schedule discovery call',
                priority: 'high',
                estimatedEffort: '2 hours',
                successMetrics: ['Meeting completed', 'Requirements gathered']
              }
            ],
            milestones: [
              {
                id: 'milestone-1',
                name: 'Discovery Complete',
                description: 'All requirements gathered',
                dueDate: '2024-02-01',
                owner: 'Sales Rep',
                status: 'pending'
              }
            ]
          }
        ],
        riskMitigation: [
          {
            risk: 'Budget constraints',
            probability: 0.3,
            impact: 'High',
            mitigation: 'Prepare alternative pricing options'
          }
        ],
        successIndicators: [
          {
            metric: 'Stakeholder engagement',
            target: '80%',
            current: '60%',
            status: 'on_track'
          }
        ],
        competitivePositioning: {
          strengths: ['Better integration', 'Superior support'],
          weaknesses: ['Higher price'],
          differentiation: ['AI-powered features'],
          winThemes: ['Innovation', 'ROI']
        }
      }
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Initial Render', () => {
    it('should render component with deal information', () => {
      render(
        <AdaptivePlaybookGenerator
          deal={mockDeal}
          onGenerate={() => {}}
          onCustomize={() => {}}
          onExecutePhase={() => {}}
        />
      );

      expect(screen.getByText('Adaptive Sales Playbook')).toBeInTheDocument();
      expect(screen.getByText('GPT-5 powered strategy for John Doe')).toBeInTheDocument();
      expect(screen.getByText('Deal Value')).toBeInTheDocument();
      expect(screen.getByText('$50,000')).toBeInTheDocument();
      expect(screen.getByText('Stage')).toBeInTheDocument();
      expect(screen.getByText('prospect')).toBeInTheDocument();
    });

    it('should show generate button when no playbook exists', () => {
      render(
        <AdaptivePlaybookGenerator
          deal={mockDeal}
          onGenerate={() => {}}
          onCustomize={() => {}}
          onExecutePhase={() => {}}
        />
      );

      expect(screen.getByText('🎯 Generate')).toBeInTheDocument();
    });
  });

  describe('Playbook Generation', () => {
    it('should generate playbook successfully', async () => {
      const { supabase } = await import('../services/supabaseClient');
      vi.mocked(supabase.functions.invoke).mockResolvedValue(mockPlaybookResponse);

      render(
        <AdaptivePlaybookGenerator
          deal={mockDeal}
          onGenerate={() => {}}
          onCustomize={() => {}}
          onExecutePhase={() => {}}
        />
      );

      const generateButton = screen.getByText('🎯 Generate');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(supabase.functions.invoke).toHaveBeenCalledWith('adaptive-playbook', {
          body: expect.objectContaining({
            dealData: mockDeal,
            model: 'gpt-5'
          })
        });
      });

      await waitFor(() => {
        expect(screen.getByText('Strategic Account Development')).toBeInTheDocument();
        expect(screen.getByText('Comprehensive approach to win the deal')).toBeInTheDocument();
      });
    });

    it('should handle generation errors gracefully', async () => {
      const { supabase } = await import('../services/supabaseClient');
      vi.mocked(supabase.functions.invoke).mockRejectedValue(new Error('API Error'));

      render(
        <AdaptivePlaybookGenerator
          deal={mockDeal}
          onGenerate={() => {}}
          onCustomize={() => {}}
          onExecutePhase={() => {}}
        />
      );

      const generateButton = screen.getByText('🎯 Generate');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('❌ Failed to generate playbook')).toBeInTheDocument();
      });
    });

    it('should show loading state during generation', async () => {
      const { supabase } = await import('../services/supabaseClient');
      vi.mocked(supabase.functions.invoke).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockPlaybookResponse), 100))
      );

      render(
        <AdaptivePlaybookGenerator
          deal={mockDeal}
          onGenerate={() => {}}
          onCustomize={() => {}}
          onExecutePhase={() => {}}
        />
      );

      const generateButton = screen.getByText('🎯 Generate');
      fireEvent.click(generateButton);

      expect(screen.getByText('Generating...')).toBeInTheDocument();
    });
  });

  describe('Playbook Display', () => {
    beforeEach(async () => {
      const { supabase } = await import('../services/supabaseClient');
      vi.mocked(supabase.functions.invoke).mockResolvedValue(mockPlaybookResponse);

      render(
        <AdaptivePlaybookGenerator
          deal={mockDeal}
          onGenerate={() => {}}
          onCustomize={() => {}}
          onExecutePhase={() => {}}
        />
      );

      // Generate playbook first
      const generateButton = screen.getByText('🎯 Generate');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('Strategic Account Development')).toBeInTheDocument();
      });
    });

    it('should display strategy overview', () => {
      expect(screen.getByText('Strategic Account Development')).toBeInTheDocument();
      expect(screen.getByText('Comprehensive approach to win the deal')).toBeInTheDocument();
      expect(screen.getByText('Confidence:')).toBeInTheDocument();
      expect(screen.getByText('85%')).toBeInTheDocument();
    });

    it('should display success indicators', () => {
      expect(screen.getByText('Success Indicators')).toBeInTheDocument();
      expect(screen.getByText('Stakeholder engagement')).toBeInTheDocument();
      expect(screen.getByText('Target: 80%')).toBeInTheDocument();
      expect(screen.getByText('Current: 60%')).toBeInTheDocument();
    });

    it('should display phases with tactics and milestones', () => {
      expect(screen.getByText('Strategy Phases')).toBeInTheDocument();
      expect(screen.getByText('Phase 1: Discovery')).toBeInTheDocument();
      expect(screen.getByText('2 weeks')).toBeInTheDocument();
      expect(screen.getByText('1 tactics')).toBeInTheDocument();
    });

    it('should expand phase details when clicked', async () => {
      const phaseElement = screen.getByText('Phase 1: Discovery');
      fireEvent.click(phaseElement);

      await waitFor(() => {
        expect(screen.getByText('Objectives')).toBeInTheDocument();
        expect(screen.getByText('Understand needs')).toBeInTheDocument();
        expect(screen.getByText('Tactics')).toBeInTheDocument();
        expect(screen.getByText('Initial Meeting')).toBeInTheDocument();
        expect(screen.getByText('Milestones')).toBeInTheDocument();
        expect(screen.getByText('Discovery Complete')).toBeInTheDocument();
      });
    });

    it('should display risk mitigation section', () => {
      expect(screen.getByText('Risk Mitigation')).toBeInTheDocument();
      expect(screen.getByText('Budget constraints')).toBeInTheDocument();
      expect(screen.getByText('Probability: 30%')).toBeInTheDocument();
      expect(screen.getByText('Prepare alternative pricing options')).toBeInTheDocument();
    });

    it('should display competitive positioning', () => {
      expect(screen.getByText('Competitive Positioning')).toBeInTheDocument();
      expect(screen.getByText('Our Strengths')).toBeInTheDocument();
      expect(screen.getByText('Better integration')).toBeInTheDocument();
      expect(screen.getByText('Win Themes')).toBeInTheDocument();
      expect(screen.getByText('Innovation')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should call onExecutePhase when Execute button is clicked', async () => {
      const onExecutePhase = vi.fn();
      const { supabase } = await import('../services/supabaseClient');
      vi.mocked(supabase.functions.invoke).mockResolvedValue(mockPlaybookResponse);

      render(
        <AdaptivePlaybookGenerator
          deal={mockDeal}
          onGenerate={() => {}}
          onCustomize={() => {}}
          onExecutePhase={onExecutePhase}
        />
      );

      // Generate playbook
      const generateButton = screen.getByText('🎯 Generate');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('Strategic Account Development')).toBeInTheDocument();
      });

      // Expand phase and click execute
      const phaseElement = screen.getByText('Phase 1: Discovery');
      fireEvent.click(phaseElement);

      await waitFor(() => {
        const executeButton = screen.getByText('Execute');
        fireEvent.click(executeButton);
        expect(onExecutePhase).toHaveBeenCalledWith('phase-1');
      });
    });

    it('should call onCustomize when Customize button is clicked', async () => {
      const onCustomize = vi.fn();
      const { supabase } = await import('../services/supabaseClient');
      vi.mocked(supabase.functions.invoke).mockResolvedValue(mockPlaybookResponse);

      render(
        <AdaptivePlaybookGenerator
          deal={mockDeal}
          onGenerate={() => {}}
          onCustomize={onCustomize}
          onExecutePhase={() => {}}
        />
      );

      // Generate playbook
      const generateButton = screen.getByText('🎯 Generate');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('Strategic Account Development')).toBeInTheDocument();
      });

      const customizeButton = screen.getByText('🎨 Customize Strategy');
      fireEvent.click(customizeButton);
      expect(onCustomize).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty competitors list', async () => {
      const dealWithoutCompetitors = { ...mockDeal, competitors: [] };
      const { supabase } = await import('../services/supabaseClient');
      vi.mocked(supabase.functions.invoke).mockResolvedValue(mockPlaybookResponse);

      render(
        <AdaptivePlaybookGenerator
          deal={dealWithoutCompetitors}
          onGenerate={() => {}}
          onCustomize={() => {}}
          onExecutePhase={() => {}}
        />
      );

      const generateButton = screen.getByText('🎯 Generate');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(supabase.functions.invoke).toHaveBeenCalledWith('adaptive-playbook', {
          body: expect.objectContaining({
            dealData: dealWithoutCompetitors
          })
        });
      });
    });

    it('should handle missing deal value', () => {
      const dealWithoutValue = { ...mockDeal, value: undefined };

      render(
        <AdaptivePlaybookGenerator
          deal={dealWithoutValue}
          onGenerate={() => {}}
          onCustomize={() => {}}
          onExecutePhase={() => {}}
        />
      );

      expect(screen.getByText('TBD')).toBeInTheDocument();
    });

    it('should handle missing industry', () => {
      const dealWithoutIndustry = { ...mockDeal, industry: undefined };

      render(
        <AdaptivePlaybookGenerator
          deal={dealWithoutIndustry}
          onGenerate={() => {}}
          onCustomize={() => {}}
          onExecutePhase={() => {}}
        />
      );

      expect(screen.getByText('Unknown')).toBeInTheDocument();
    });
  });
});