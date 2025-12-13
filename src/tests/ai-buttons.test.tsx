/**
 * AI Buttons Comprehensive Test Suite
 * Tests all AI functionality in contacts cards and detail view
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AIEnhancedContactCard } from '../components/contacts/AIEnhancedContactCard';
import { ContactDetailView } from '../components/modals/ContactDetailView';
import { CustomizableAIToolbar } from '../components/ui/CustomizableAIToolbar';
import { webSearchService } from '../services/webSearchService';

// Mock services
vi.mock('../services/webSearchService');
vi.mock('../contexts/AIContext');
vi.mock('../services/contactService');

describe('AI Buttons Comprehensive Test Suite', () => {
  const mockContact = {
    id: 'test-contact-123',
    name: 'John Doe',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@techcorp.com',
    company: 'TechCorp Inc',
    title: 'Senior Developer',
    phone: '+1-555-0123',
    industry: 'Technology',
    aiScore: 0,
    sources: ['LinkedIn', 'Website'],
    socialProfiles: {},
    customFields: {},
    interestLevel: 'hot' as const,
    status: 'lead',
    createdBy: 'user',
    dataSource: 'imported'
  };

  const mockDemoContact = {
    ...mockContact,
    id: 'demo-contact-456',
    createdBy: 'demo',
    dataSource: 'mock',
    isMockData: true
  };

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
  });

  describe('AIEnhancedContactCard Tests', () => {
    describe('Primary AI Analysis Button', () => {
      it('should show loading state during analysis', async () => {
        render(<AIEnhancedContactCard
          contact={mockContact}
          isSelected={false}
          onSelect={() => {}}
          onClick={() => {}}
        />);

        const aiButton = screen.getByTitle('Analyze with AI');
        fireEvent.click(aiButton);

        // Should show loading spinner
        expect(screen.getByTestId('ai-loading-spinner')).toBeInTheDocument();
        expect(aiButton).toBeDisabled();
      });

      it('should update contact with AI score on success', async () => {
        const mockOnUpdate = vi.fn();
        render(<AIEnhancedContactCard
          contact={mockContact}
          isSelected={false}
          onSelect={() => {}}
          onClick={() => {}}
          onUpdate={mockOnUpdate}
        />);

        const aiButton = screen.getByTitle('Analyze with AI');
        fireEvent.click(aiButton);

        await waitFor(() => {
          expect(mockOnUpdate).toHaveBeenCalledWith(mockContact.id, expect.objectContaining({
            aiScore: expect.any(Number),
            notes: expect.stringContaining('AI Analysis')
          }));
        });
      });

      it('should handle demo contacts with mock data', async () => {
        render(<AIEnhancedContactCard
          contact={mockDemoContact}
          isSelected={false}
          onSelect={() => {}}
          onClick={() => {}}
        />);

        const aiButton = screen.getByTitle('Analyze with AI');
        fireEvent.click(aiButton);

        await waitFor(() => {
          // Should complete without API calls for demo data
          expect(screen.getByText('AI analysis complete')).toBeInTheDocument();
        });
      });

      it('should show error alert on API failure', async () => {
        // Mock API failure
        const mockError = new Error('Network error');
        vi.spyOn(console, 'error').mockImplementation(() => {});

        render(<AIEnhancedContactCard
          contact={mockContact}
          isSelected={false}
          onSelect={() => {}}
          onClick={() => {}}
        />);

        const aiButton = screen.getByTitle('Analyze with AI');
        fireEvent.click(aiButton);

        await waitFor(() => {
          expect(window.alert).toHaveBeenCalledWith(
            'AI analysis failed. Please check your internet connection and try again.'
          );
        });
      });
    });

    describe('AI Score Display Button', () => {
      it('should show "Click to Score" for unscored contacts', () => {
        render(<AIEnhancedContactCard
          contact={{ ...mockContact, aiScore: undefined }}
          isSelected={false}
          onSelect={() => {}}
          onClick={() => {}}
        />);

        expect(screen.getByText('Click to Score')).toBeInTheDocument();
      });

      it('should show score badge for scored contacts', () => {
        render(<AIEnhancedContactCard
          contact={{ ...mockContact, aiScore: 85 }}
          isSelected={false}
          onSelect={() => {}}
          onClick={() => {}}
        />);

        expect(screen.getByText('85')).toBeInTheDocument();
      });

      it('should trigger analysis when clicked', () => {
        const mockOnAnalyze = vi.fn();
        render(<AIEnhancedContactCard
          contact={{ ...mockContact, aiScore: undefined }}
          isSelected={false}
          onSelect={() => {}}
          onClick={() => {}}
          onAnalyze={mockOnAnalyze}
        />);

        const scoreButton = screen.getByText('Click to Score');
        fireEvent.click(scoreButton);

        expect(mockOnAnalyze).toHaveBeenCalledWith(mockContact);
      });
    });

    describe('AI Feedback Buttons', () => {
      it('should appear only after AI scoring', () => {
        render(<AIEnhancedContactCard
          contact={{ ...mockContact, aiScore: undefined }}
          isSelected={false}
          onSelect={() => {}}
          onClick={() => {}}
        />);

        expect(screen.queryByTestId('thumbs-up')).not.toBeInTheDocument();
        expect(screen.queryByTestId('thumbs-down')).not.toBeInTheDocument();
      });

      it('should show feedback buttons after scoring', () => {
        render(<AIEnhancedContactCard
          contact={{ ...mockContact, aiScore: 85 }}
          isSelected={false}
          onSelect={() => {}}
          onClick={() => {}}
        />);

        expect(screen.getByTestId('thumbs-up')).toBeInTheDocument();
        expect(screen.getByTestId('thumbs-down')).toBeInTheDocument();
      });

      it('should log feedback when clicked', () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        render(<AIEnhancedContactCard
          contact={{ ...mockContact, aiScore: 85 }}
          isSelected={false}
          onSelect={() => {}}
          onClick={() => {}}
        />);

        const thumbsUp = screen.getByTestId('thumbs-up');
        fireEvent.click(thumbsUp);

        expect(consoleSpy).toHaveBeenCalledWith(
          'Positive AI feedback for contact:',
          mockContact.id
        );
      });
    });
  });

  describe('ContactDetailView AI Buttons Tests', () => {
    describe('AI Research Button', () => {
      it('should show thinking animation during research', async () => {
        render(<ContactDetailView
          contact={mockContact}
          isOpen={true}
          onClose={() => {}}
        />);

        const researchButton = screen.getByTitle('AI Web Research');
        fireEvent.click(researchButton);

        await waitFor(() => {
          expect(screen.getByTestId('research-thinking-animation')).toBeInTheDocument();
        });
      });

      it('should generate citations for demo contacts', async () => {
        render(<ContactDetailView
          contact={mockDemoContact}
          isOpen={true}
          onClose={() => {}}
        />);

        const researchButton = screen.getByTitle('AI Web Research');
        fireEvent.click(researchButton);

        await waitFor(() => {
          expect(screen.getByTestId('citation-badge')).toBeInTheDocument();
          expect(screen.getByText(/sources found/)).toBeInTheDocument();
        });
      });
    });

    describe('AI Analysis Button', () => {
      it('should update AI score in contact detail view', async () => {
        const mockOnUpdate = vi.fn();
        render(<ContactDetailView
          contact={mockContact}
          isOpen={true}
          onClose={() => {}}
          onUpdate={mockOnUpdate}
        />);

        const analysisButton = screen.getByTitle('AI Analysis');
        fireEvent.click(analysisButton);

        await waitFor(() => {
          expect(mockOnUpdate).toHaveBeenCalledWith(
            mockContact.id,
            expect.objectContaining({
              aiScore: expect.any(Number),
              notes: expect.stringContaining('AI Analysis')
            })
          );
        });
      });
    });

    describe('AI Auto-Enrich Button', () => {
      it('should add social profiles for demo contacts', async () => {
        const mockOnUpdate = vi.fn();
        render(<ContactDetailView
          contact={mockDemoContact}
          isOpen={true}
          onClose={() => {}}
          onUpdate={mockOnUpdate}
        />);

        const enrichButton = screen.getByText('AI Auto-Enrich');
        fireEvent.click(enrichButton);

        await waitFor(() => {
          expect(mockOnUpdate).toHaveBeenCalledWith(
            mockDemoContact.id,
            expect.objectContaining({
              socialProfiles: expect.objectContaining({
                linkedin: expect.any(String),
                twitter: expect.any(String)
              })
            })
          );
        });
      });
    });

    describe('AI Goals Button', () => {
      it('should open external URL in new tab', () => {
        const mockOpen = vi.spyOn(window, 'open').mockImplementation(() => null);

        render(<ContactDetailView
          contact={mockContact}
          isOpen={true}
          onClose={() => {}}
        />);

        const goalsButton = screen.getByText('AI Goals');
        fireEvent.click(goalsButton);

        expect(mockOpen).toHaveBeenCalledWith(
          'https://tubular-choux-2a9b3c.netlify.app/',
          '_blank'
        );
      });
    });
  });

  describe('CustomizableAIToolbar Tests', () => {
    describe('Lead Score Button', () => {
      it('should show processing state', async () => {
        render(<CustomizableAIToolbar
          entityType="contact"
          entityId={mockContact.id}
          entityData={mockContact}
          location="contactCards"
          layout="grid"
          size="sm"
        />);

        const leadScoreButton = screen.getByText('Lead Score');
        fireEvent.click(leadScoreButton);

        await waitFor(() => {
          expect(screen.getByText('Processing...')).toBeInTheDocument();
        });
      });

      it('should complete with success state', async () => {
        render(<CustomizableAIToolbar
          entityType="contact"
          entityId={mockContact.id}
          entityData={mockContact}
          location="contactCards"
          layout="grid"
          size="sm"
        />);

        const leadScoreButton = screen.getByText('Lead Score');
        fireEvent.click(leadScoreButton);

        await waitFor(() => {
          expect(screen.getByText('Done!')).toBeInTheDocument();
        }, { timeout: 10000 });
      });
    });

    describe('Email AI Button', () => {
      it('should generate email template', async () => {
        render(<CustomizableAIToolbar
          entityType="contact"
          entityId={mockContact.id}
          entityData={mockContact}
          location="contactCards"
          layout="grid"
          size="sm"
        />);

        const emailButton = screen.getByText('Email AI');
        fireEvent.click(emailButton);

        await waitFor(() => {
          expect(screen.getByText('Done!')).toBeInTheDocument();
        });
      });
    });

    describe('Enrich Button', () => {
      it('should enhance contact data', async () => {
        render(<CustomizableAIToolbar
          entityType="contact"
          entityId={mockContact.id}
          entityData={mockContact}
          location="contactCards"
          layout="grid"
          size="sm"
        />);

        const enrichButton = screen.getByText('Enrich');
        fireEvent.click(enrichButton);

        await waitFor(() => {
          expect(screen.getByText('Done!')).toBeInTheDocument();
        });
      });
    });

    describe('Insights Button', () => {
      it('should generate business insights', async () => {
        render(<CustomizableAIToolbar
          entityType="contact"
          entityId={mockContact.id}
          entityData={mockContact}
          location="contactCards"
          layout="grid"
          size="sm"
        />);

        const insightsButton = screen.getByText('Insights');
        fireEvent.click(insightsButton);

        await waitFor(() => {
          expect(screen.getByText('Done!')).toBeInTheDocument();
        });
      });
    });
  });

  describe('Integration Tests', () => {
    describe('Citation Integration', () => {
      it('should display citations after AI research', async () => {
        render(<ContactDetailView
          contact={mockDemoContact}
          isOpen={true}
          onClose={() => {}}
        />);

        const researchButton = screen.getByTitle('AI Web Research');
        fireEvent.click(researchButton);

        await waitFor(() => {
          const citationBadge = screen.getByTestId('citation-badge');
          expect(citationBadge).toBeInTheDocument();
          expect(citationBadge).toHaveTextContent('3'); // Mock citations count
        });
      });

      it('should make citations clickable', async () => {
        const mockOpen = vi.spyOn(window, 'open').mockImplementation(() => null);

        render(<ContactDetailView
          contact={mockDemoContact}
          isOpen={true}
          onClose={() => {}}
        />);

        const researchButton = screen.getByTitle('AI Web Research');
        fireEvent.click(researchButton);

        await waitFor(() => {
          const citationLink = screen.getByTestId('citation-link-1');
          fireEvent.click(citationLink);
          expect(mockOpen).toHaveBeenCalledWith(expect.stringContaining('linkedin.com'), '_blank');
        });
      });
    });

    describe('Thinking Animation Integration', () => {
      it('should show multi-stage thinking animation', async () => {
        render(<ContactDetailView
          contact={mockContact}
          isOpen={true}
          onClose={() => {}}
        />);

        const analysisButton = screen.getByTitle('AI Analysis');
        fireEvent.click(analysisButton);

        // Check for different stages
        await waitFor(() => {
          expect(screen.getByText('🧠 Analyzing contact with AI...')).toBeInTheDocument();
        });

        await waitFor(() => {
          expect(screen.getByText('🔍 Researching background information...')).toBeInTheDocument();
        }, { timeout: 3000 });

        await waitFor(() => {
          expect(screen.getByText('📊 Synthesizing analysis results...')).toBeInTheDocument();
        }, { timeout: 6000 });
      });
    });

    describe('Error Handling', () => {
      it('should handle network errors gracefully', async () => {
        // Mock network failure
        vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'));

        render(<AIEnhancedContactCard
          contact={mockContact}
          isSelected={false}
          onSelect={() => {}}
          onClick={() => {}}
        />);

        const aiButton = screen.getByTitle('Analyze with AI');
        fireEvent.click(aiButton);

        await waitFor(() => {
          expect(window.alert).toHaveBeenCalledWith(
            'AI analysis failed. Please check your internet connection and try again.'
          );
        });
      });

      it('should handle API rate limits', async () => {
        // Mock API rate limit error
        vi.spyOn(global, 'fetch').mockResolvedValueOnce({
          ok: false,
          status: 429,
          json: () => Promise.resolve({ error: { message: 'Rate limit exceeded' } })
        } as Response);

        render(<AIEnhancedContactCard
          contact={mockContact}
          isSelected={false}
          onSelect={() => {}}
          onClick={() => {}}
        />);

        const aiButton = screen.getByTitle('Analyze with AI');
        fireEvent.click(aiButton);

        await waitFor(() => {
          expect(window.alert).toHaveBeenCalledWith(
            'AI analysis failed. Please check your internet connection and try again.'
          );
        });
      });
    });
  });

  describe('Performance Tests', () => {
    it('should complete demo contact analysis within 2 seconds', async () => {
      const startTime = Date.now();

      render(<AIEnhancedContactCard
        contact={mockDemoContact}
        isSelected={false}
        onSelect={() => {}}
        onClick={() => {}}
      />);

      const aiButton = screen.getByTitle('Analyze with AI');
      fireEvent.click(aiButton);

      await waitFor(() => {
        expect(screen.getByText('AI analysis complete')).toBeInTheDocument();
      });

      const endTime = Date.now();
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
    });

    it('should handle multiple simultaneous AI requests', async () => {
      render(
        <>
          <AIEnhancedContactCard
            contact={{ ...mockDemoContact, id: 'contact-1' }}
            isSelected={false}
            onSelect={() => {}}
            onClick={() => {}}
          />
          <AIEnhancedContactCard
            contact={{ ...mockDemoContact, id: 'contact-2' }}
            isSelected={false}
            onSelect={() => {}}
            onClick={() => {}}
          />
        </>
      );

      const buttons = screen.getAllByTitle('Analyze with AI');
      buttons.forEach(button => fireEvent.click(button));

      await waitFor(() => {
        expect(screen.getAllByText('AI analysis complete')).toHaveLength(2);
      });
    });
  });
});