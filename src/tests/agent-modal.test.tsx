/**
 * Comprehensive tests for AgentModal component
 * Tests modal display, input handling, and agent execution
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AgentModal } from '../components/ai-sales-intelligence/AgentModal';

// Mock dependencies
vi.mock('../components/ui/GlassCard', () => ({
  GlassCard: ({ children, className }: any) => (
    <div data-testid="glass-card" className={className}>
      {children}
    </div>
  )
}));

vi.mock('../components/ui/ModernButton', () => ({
  ModernButton: ({ children, onClick, disabled, loading, variant, className }: any) => (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      data-variant={variant}
      className={className}
    >
      {children}
    </button>
  )
}));

vi.mock('lucide-react', () => ({
  X: () => <div data-testid="close-icon" />,
  Play: () => <div data-testid="play-icon" />,
  Loader2: () => <div data-testid="loader-icon" />,
  Info: () => <div data-testid="info-icon" />
}));

describe('AgentModal', () => {
  const mockAgent = {
    id: 'agent-123',
    name: 'Test SDR Agent',
    description: 'A test agent for SDR activities',
    tools: ['email', 'call'],
    input_schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: 'The message to send'
        },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high'],
          description: 'Priority level'
        },
        count: {
          type: 'number',
          description: 'Number of items'
        },
        enabled: {
          type: 'boolean',
          description: 'Whether to enable this feature'
        }
      },
      required: ['message', 'priority']
    },
    output_schema: {
      type: 'object',
      properties: {
        result: { type: 'string' }
      }
    },
    recommended_ui_placement: 'contact_detail',
    trigger_options: {
      manual: true,
      auto: false,
      triggers: ['button_click']
    }
  };

  const mockAgentNoInputs = {
    id: 'agent-456',
    name: 'Simple Agent',
    description: 'An agent with no inputs',
    tools: ['simple'],
    input_schema: {
      type: 'object',
      properties: {}
    },
    output_schema: {
      type: 'object',
      properties: {
        result: { type: 'string' }
      }
    },
    recommended_ui_placement: 'dashboard',
    trigger_options: {
      manual: true,
      auto: false,
      triggers: ['button_click']
    }
  };

  const mockOnExecute = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Modal Structure', () => {
    it('should render modal with agent information', () => {
      render(
        <AgentModal
          agent={mockAgent}
          onExecute={mockOnExecute}
          onClose={mockOnClose}
          loading={false}
        />
      );

      expect(screen.getByText('Test SDR Agent')).toBeInTheDocument();
      expect(screen.getByText('A test agent for SDR activities')).toBeInTheDocument();
      expect(screen.getByTestId('close-icon')).toBeInTheDocument();
      expect(screen.getByTestId('info-icon')).toBeInTheDocument();
    });

    it('should display correct icon based on agent name', () => {
      const testCases = [
        { name: 'SDR Agent', expectedIcon: '🎯' },
        { name: 'Dialer Agent', expectedIcon: '📞' },
        { name: 'Signals Agent', expectedIcon: '📊' },
        { name: 'Lead Agent', expectedIcon: '👥' },
        { name: 'Voice Agent', expectedIcon: '🎤' },
        { name: 'Unknown Agent', expectedIcon: '🤖' }
      ];

      testCases.forEach(({ name, expectedIcon }) => {
        const agentWithName = { ...mockAgent, name };
        const { rerender } = render(
          <AgentModal
            agent={agentWithName}
            onExecute={mockOnExecute}
            onClose={mockOnClose}
            loading={false}
          />
        );

        expect(screen.getByText(expectedIcon)).toBeInTheDocument();
        rerender(<div></div>); // Clean up for next test
      });
    });

    it('should show recommended UI placement when available', () => {
      render(
        <AgentModal
          agent={mockAgent}
          onExecute={mockOnExecute}
          onClose={mockOnClose}
          loading={false}
        />
      );

      expect(screen.getByText('Recommended for: contact_detail')).toBeInTheDocument();
    });
  });

  describe('Input Fields', () => {
    it('should render all input fields based on schema', () => {
      render(
        <AgentModal
          agent={mockAgent}
          onExecute={mockOnExecute}
          onClose={mockOnClose}
          loading={false}
        />
      );

      expect(screen.getByText('Parameters')).toBeInTheDocument();
      expect(screen.getByText('message')).toBeInTheDocument();
      expect(screen.getByText('priority')).toBeInTheDocument();
      expect(screen.getByText('count')).toBeInTheDocument();
      expect(screen.getByText('enabled')).toBeInTheDocument();
    });

    it('should render string input field', () => {
      render(
        <AgentModal
          agent={mockAgent}
          onExecute={mockOnExecute}
          onClose={mockOnClose}
          loading={false}
        />
      );

      const messageInput = screen.getByPlaceholderText('The message to send');
      expect(messageInput).toHaveAttribute('type', 'text');
      expect(messageInput).toBeRequired();
    });

    it('should render select field for enum values', () => {
      render(
        <AgentModal
          agent={mockAgent}
          onExecute={mockOnExecute}
          onClose={mockOnClose}
          loading={false}
        />
      );

      const selectElement = screen.getByDisplayValue('Select priority...');
      expect(selectElement).toBeInTheDocument();
      expect(screen.getByText('low')).toBeInTheDocument();
      expect(screen.getByText('medium')).toBeInTheDocument();
      expect(screen.getByText('high')).toBeInTheDocument();
    });

    it('should render number input field', () => {
      render(
        <AgentModal
          agent={mockAgent}
          onExecute={mockOnExecute}
          onClose={mockOnClose}
          loading={false}
        />
      );

      const countInput = screen.getByPlaceholderText('Number of items');
      expect(countInput).toHaveAttribute('type', 'number');
    });

    it('should render checkbox for boolean field', () => {
      render(
        <AgentModal
          agent={mockAgent}
          onExecute={mockOnExecute}
          onClose={mockOnClose}
          loading={false}
        />
      );

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeInTheDocument();
      expect(screen.getByText('Whether to enable this feature')).toBeInTheDocument();
    });

    it('should show required indicators for required fields', () => {
      render(
        <AgentModal
          agent={mockAgent}
          onExecute={mockOnExecute}
          onClose={mockOnClose}
          loading={false}
        />
      );

      // Should have red asterisks for required fields
      const requiredIndicators = screen.getAllByText('*');
      expect(requiredIndicators).toHaveLength(2); // message and priority are required
    });

    it('should display field descriptions', () => {
      render(
        <AgentModal
          agent={mockAgent}
          onExecute={mockOnExecute}
          onClose={mockOnClose}
          loading={false}
        />
      );

      expect(screen.getByText('The message to send')).toBeInTheDocument();
      expect(screen.getByText('Priority level')).toBeInTheDocument();
      expect(screen.getByText('Number of items')).toBeInTheDocument();
      expect(screen.getByText('Whether to enable this feature')).toBeInTheDocument();
    });
  });

  describe('Input Handling', () => {
    it('should update input values when changed', () => {
      render(
        <AgentModal
          agent={mockAgent}
          onExecute={mockOnExecute}
          onClose={mockOnClose}
          loading={false}
        />
      );

      const messageInput = screen.getByPlaceholderText('The message to send');
      const selectElement = screen.getByDisplayValue('Select priority...');
      const countInput = screen.getByPlaceholderText('Number of items');
      const checkbox = screen.getByRole('checkbox');

      fireEvent.change(messageInput, { target: { value: 'Test message' } });
      fireEvent.change(selectElement, { target: { value: 'high' } });
      fireEvent.change(countInput, { target: { value: '5' } });
      fireEvent.click(checkbox);

      expect(messageInput).toHaveValue('Test message');
      expect(selectElement).toHaveValue('high');
      expect(countInput).toHaveValue(5);
      expect(checkbox).toBeChecked();
    });

    it('should handle number input conversion', () => {
      render(
        <AgentModal
          agent={mockAgent}
          onExecute={mockOnExecute}
          onClose={mockOnClose}
          loading={false}
        />
      );

      const countInput = screen.getByPlaceholderText('Number of items');
      fireEvent.change(countInput, { target: { value: '42' } });

      expect(countInput).toHaveValue(42);
    });
  });

  describe('Execution', () => {
    it('should call onExecute with input data when Execute button is clicked', () => {
      render(
        <AgentModal
          agent={mockAgent}
          onExecute={mockOnExecute}
          onClose={mockOnClose}
          loading={false}
        />
      );

      const messageInput = screen.getByPlaceholderText('The message to send');
      const selectElement = screen.getByDisplayValue('Select priority...');

      fireEvent.change(messageInput, { target: { value: 'Test message' } });
      fireEvent.change(selectElement, { target: { value: 'high' } });

      const executeButton = screen.getByText('Execute Agent');
      fireEvent.click(executeButton);

      expect(mockOnExecute).toHaveBeenCalledWith({
        message: 'Test message',
        priority: 'high',
        count: '',
        enabled: false
      });
    });

    it('should call onExecute with undefined when no inputs provided', () => {
      render(
        <AgentModal
          agent={mockAgentNoInputs}
          onExecute={mockOnExecute}
          onClose={mockOnClose}
          loading={false}
        />
      );

      const executeButton = screen.getByText('Execute Agent');
      fireEvent.click(executeButton);

      expect(mockOnExecute).toHaveBeenCalledWith(undefined);
    });

    it('should show loading state during execution', () => {
      render(
        <AgentModal
          agent={mockAgent}
          onExecute={mockOnExecute}
          onClose={mockOnClose}
          loading={true}
        />
      );

      expect(screen.getByText('Executing...')).toBeInTheDocument();
      expect(screen.getByTestId('loader-icon')).toBeInTheDocument();

      const executeButton = screen.getByText('Executing...');
      expect(executeButton).toBeDisabled();

      const cancelButton = screen.getByText('Cancel');
      expect(cancelButton).toBeDisabled();
    });
  });

  describe('Modal Controls', () => {
    it('should call onClose when close button is clicked', () => {
      render(
        <AgentModal
          agent={mockAgent}
          onExecute={mockOnExecute}
          onClose={mockOnClose}
          loading={false}
        />
      );

      const closeButton = screen.getByTestId('close-icon').closest('button');
      fireEvent.click(closeButton!);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when Cancel button is clicked', () => {
      render(
        <AgentModal
          agent={mockAgent}
          onExecute={mockOnExecute}
          onClose={mockOnClose}
          loading={false}
        />
      );

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('No Input Agents', () => {
    it('should show message when agent has no inputs', () => {
      render(
        <AgentModal
          agent={mockAgentNoInputs}
          onExecute={mockOnExecute}
          onClose={mockOnClose}
          loading={false}
        />
      );

      expect(screen.getByText("This agent doesn't require any input parameters. Click Execute to run it.")).toBeInTheDocument();
      expect(screen.queryByText('Parameters')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper labels for all inputs', () => {
      render(
        <AgentModal
          agent={mockAgent}
          onExecute={mockOnExecute}
          onClose={mockOnClose}
          loading={false}
        />
      );

      expect(screen.getByText('message')).toBeInTheDocument();
      expect(screen.getByText('priority')).toBeInTheDocument();
      expect(screen.getByText('count')).toBeInTheDocument();
      expect(screen.getByText('enabled')).toBeInTheDocument();
    });

    it('should have required attributes on required fields', () => {
      render(
        <AgentModal
          agent={mockAgent}
          onExecute={mockOnExecute}
          onClose={mockOnClose}
          loading={false}
        />
      );

      const messageInput = screen.getByPlaceholderText('The message to send');
      const selectElement = screen.getByDisplayValue('Select priority...');

      expect(messageInput).toBeRequired();
      expect(selectElement).toBeRequired();
    });

    it('should be keyboard accessible', () => {
      render(
        <AgentModal
          agent={mockAgent}
          onExecute={mockOnExecute}
          onClose={mockOnClose}
          loading={false}
        />
      );

      const closeButton = screen.getByTestId('close-icon').closest('button');
      const cancelButton = screen.getByText('Cancel');
      const executeButton = screen.getByText('Execute Agent');

      // All buttons should be focusable
      expect(closeButton).toBeInTheDocument();
      expect(cancelButton).toBeInTheDocument();
      expect(executeButton).toBeInTheDocument();
    });
  });
});