/**
 * Performance Benchmarks for AI Buttons
 * Tests response times and heavy usage scenarios
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AIEnhancedContactCard } from '../components/contacts/AIEnhancedContactCard';
import { CustomizableAIToolbar } from '../components/ui/CustomizableAIToolbar';

// Mock services
vi.mock('../services/webSearchService');
vi.mock('../contexts/AIContext');
vi.mock('../services/contactService');

describe('AI Buttons Performance Benchmarks', () => {
  const mockContact = {
    id: 'perf-test-contact',
    name: 'Performance Test User',
    firstName: 'Performance',
    lastName: 'Test',
    email: 'perf@test.com',
    company: 'Test Corp',
    title: 'Test User',
    phone: '+1-555-0123',
    industry: 'Technology',
    aiScore: 0,
    sources: ['Test'],
    socialProfiles: {},
    customFields: {},
    interestLevel: 'hot' as const,
    status: 'lead',
    createdBy: 'test',
    dataSource: 'test'
  };

  describe('AI Analysis Button Performance', () => {
    it('should complete AI analysis within 2 seconds', async () => {
      const startTime = performance.now();

      render(<AIEnhancedContactCard
        contact={mockContact}
        isSelected={false}
        onSelect={() => {}}
        onClick={() => {}}
      />);

      const aiButton = screen.getByTitle('Analyze with AI');
      fireEvent.click(aiButton);

      await waitFor(() => {
        expect(screen.getByText('AI analysis complete')).toBeInTheDocument();
      }, { timeout: 3000 });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
      console.log(`AI Analysis completed in ${duration.toFixed(2)}ms`);
    });

    it('should handle multiple simultaneous AI requests', async () => {
      const startTime = performance.now();

      // Render multiple contact cards
      const contacts = Array.from({ length: 5 }, (_, i) => ({
        ...mockContact,
        id: `perf-contact-${i}`,
        name: `Performance User ${i}`
      }));

      const { rerender } = render(
        <>
          {contacts.map(contact => (
            <AIEnhancedContactCard
              key={contact.id}
              contact={contact}
              isSelected={false}
              onSelect={() => {}}
              onClick={() => {}}
            />
          ))}
        </>
      );

      // Click all AI buttons simultaneously
      const aiButtons = screen.getAllByTitle('Analyze with AI');
      aiButtons.forEach(button => fireEvent.click(button));

      // Wait for all to complete
      await waitFor(() => {
        expect(screen.getAllByText('AI analysis complete')).toHaveLength(5);
      }, { timeout: 10000 });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(5000); // Should handle 5 concurrent requests within 5 seconds
      console.log(`5 concurrent AI analyses completed in ${duration.toFixed(2)}ms`);
    });

    it('should maintain performance under load', async () => {
      const results: number[] = [];

      // Run 10 sequential AI analyses
      for (let i = 0; i < 10; i++) {
        const startTime = performance.now();

        const { rerender } = render(<AIEnhancedContactCard
          contact={{ ...mockContact, id: `load-test-${i}` }}
          isSelected={false}
          onSelect={() => {}}
          onClick={() => {}}
        />);

        const aiButton = screen.getByTitle('Analyze with AI');
        fireEvent.click(aiButton);

        await waitFor(() => {
          expect(screen.getByText('AI analysis complete')).toBeInTheDocument();
        });

        const endTime = performance.now();
        results.push(endTime - startTime);

        // Cleanup for next iteration
        rerender(<></>);
      }

      const avgTime = results.reduce((a, b) => a + b, 0) / results.length;
      const maxTime = Math.max(...results);
      const minTime = Math.min(...results);

      console.log(`Load test results:`, {
        average: `${avgTime.toFixed(2)}ms`,
        max: `${maxTime.toFixed(2)}ms`,
        min: `${minTime.toFixed(2)}ms`,
        totalRuns: results.length
      });

      expect(avgTime).toBeLessThan(1500); // Average should be under 1.5 seconds
      expect(maxTime).toBeLessThan(3000); // Max should be under 3 seconds
    });
  });

  describe('AI Toolbar Performance', () => {
    it('should complete toolbar actions within 3 seconds', async () => {
      const startTime = performance.now();

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
      }, { timeout: 5000 });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(3000); // Should complete within 3 seconds
      console.log(`AI Toolbar action completed in ${duration.toFixed(2)}ms`);
    });
  });

  describe('Memory Usage Benchmarks', () => {
    it('should not cause memory leaks during repeated AI operations', async () => {
      // This is a basic memory leak test - in a real scenario,
      // you'd use tools like memlab or chrome dev tools
      const initialMemory = performance.memory ?
        (performance as any).memory.usedJSHeapSize : 0;

      // Perform multiple AI operations
      for (let i = 0; i < 20; i++) {
        const { rerender } = render(<AIEnhancedContactCard
          contact={{ ...mockContact, id: `memory-test-${i}` }}
          isSelected={false}
          onSelect={() => {}}
          onClick={() => {}}
        />);

        const aiButton = screen.getByTitle('Analyze with AI');
        fireEvent.click(aiButton);

        await waitFor(() => {
          expect(screen.getByText('AI analysis complete')).toBeInTheDocument();
        });

        rerender(<></>);
      }

      const finalMemory = performance.memory ?
        (performance as any).memory.usedJSHeapSize : 0;

      if (performance.memory) {
        const memoryIncrease = finalMemory - initialMemory;
        console.log(`Memory usage: ${memoryIncrease} bytes increase over 20 operations`);

        // Allow for some memory increase but not excessive
        expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Less than 50MB increase
      }
    });
  });

  describe('Error Recovery Performance', () => {
    it('should recover quickly from API failures', async () => {
      // Mock network failure
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const startTime = performance.now();

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

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Error handling should be fast
      expect(duration).toBeLessThan(1000);

      // Restore fetch
      global.fetch = originalFetch;
    });
  });
});