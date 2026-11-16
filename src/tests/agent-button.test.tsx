/**
 * AgentButton: agent metadata loading, modal interaction, and execution through the Netlify functions
 * (generic `agent-runner`, or a direct `functionName`) via streamFunction, plus the success/error feedback.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  single: vi.fn(),
  streamFunction: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({ select: () => ({ eq: () => ({ single: mocks.single }) }) })),
  },
}));

vi.mock('../services/liveFunction', () => ({ streamFunction: mocks.streamFunction }));

vi.mock('../components/ui/LiveRunStatus', () => ({ LiveRunStatus: () => null }));

vi.mock('../components/ui/ModernButton', () => ({
  ModernButton: ({ children, onClick, disabled, variant, size, className }: any) => (
    <button onClick={onClick} disabled={disabled} data-variant={variant} data-size={size} className={className}>
      {children}
    </button>
  ),
}));

vi.mock('../components/ai-sales-intelligence/AgentModal', () => ({
  AgentModal: ({ agent, onExecute, onClose, loading }: any) => (
    <div data-testid="agent-modal">
      <div>Agent: {agent?.name}</div>
      <button onClick={() => onExecute({ testInput: 'value' })}>Execute</button>
      <button onClick={onClose}>Close</button>
      {loading && <div>Loading modal...</div>}
    </div>
  ),
}));

vi.mock('lucide-react', () => ({
  Loader2: () => <div data-testid="loader-icon" />,
  Sparkles: () => <div data-testid="sparkles-icon" />,
  AlertCircle: () => <div data-testid="alert-icon" />,
  CheckCircle: () => <div data-testid="check-icon" />,
}));

import { AgentButton } from '../components/ai-sales-intelligence/AgentButton';
import { supabase } from '../lib/supabase';

const RUNNER = '/.netlify/functions/agent-runner';

describe('AgentButton', () => {
  const mockAgent = {
    id: 'agent-123',
    name: 'Test SDR Agent',
    description: 'A test agent for SDR activities',
    capabilities: ['email', 'call'],
    inputSchema: { type: 'object', properties: { message: { type: 'string' } } },
  };

  const mockExecutionResult = {
    agentId: 'agent-123',
    success: true,
    response: { content: 'Agent executed successfully', usage: { total_tokens: 150 } },
    executionTime: 2.5,
  };

  /** Renders the button and waits for the agent metadata to load; returns the (single) trigger button. */
  async function renderLoaded(ui: React.ReactElement, name = 'Test SDR Agent') {
    render(ui);
    await waitFor(() => expect(screen.getByText(name)).toBeInTheDocument());
    return screen.getByRole('button');
  }

  async function execute(button: HTMLElement) {
    fireEvent.click(button);
    fireEvent.click(screen.getByText('Execute'));
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.single.mockResolvedValue({ data: mockAgent, error: null });
    mocks.streamFunction.mockResolvedValue({ result: mockExecutionResult, text: '', citations: [] });
  });

  afterEach(() => {
    cleanup();
  });

  describe('Initial Loading', () => {
    it('should show loading state while fetching agent metadata', () => {
      mocks.single.mockReturnValue(new Promise(() => {})); // never resolves
      render(<AgentButton agentId="agent-123" />);

      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('should load agent metadata successfully', async () => {
      await renderLoaded(<AgentButton agentId="agent-123" />);
      expect(supabase.from).toHaveBeenCalledWith('agent_metadata');
    });

    it('should keep the loading button when agent metadata cannot be loaded', async () => {
      mocks.single.mockResolvedValue({ data: null, error: new Error('Not found') });
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      render(<AgentButton agentId="agent-123" />);

      await waitFor(() => expect(spy).toHaveBeenCalled());
      expect(screen.getByText('Loading...')).toBeInTheDocument();
      spy.mockRestore();
    });

    it('should skip the metadata lookup when a functionName is given', async () => {
      await renderLoaded(<AgentButton agentId="agent-123" functionName="cold-email-sdr" />, 'cold-email-sdr');
      expect(supabase.from).not.toHaveBeenCalled();
    });
  });

  describe('Button Rendering', () => {
    it('should render with agent name and icon', async () => {
      await renderLoaded(<AgentButton agentId="agent-123" />);
      expect(screen.getByTestId('sparkles-icon')).toBeInTheDocument();
    });

    it('should render custom children when provided', async () => {
      await renderLoaded(<AgentButton agentId="agent-123">Custom Button Text</AgentButton>, 'Custom Button Text');
    });

    it('should apply variant and className props (size is always the toolbar size)', async () => {
      const button = await renderLoaded(
        <AgentButton agentId="agent-123" variant="primary" size="lg" className="custom-class" />,
      );
      expect(button).toHaveAttribute('data-variant', 'primary');
      expect(button).toHaveAttribute('data-size', 'toolbar');
      expect(button).toHaveClass('custom-class');
    });

    it.each([
      ['SDR Agent', '🎯'],
      ['Dialer Agent', '📞'],
      ['Signals Agent', '📊'],
      ['Lead Agent', '👥'],
      ['Meetings Agent', '📅'],
      ['Voice Agent', '🎤'],
      ['Social Agent', '💬'],
      ['Unknown Agent', '🤖'],
    ])('should show the right icon for %s', async (name, expectedIcon) => {
      mocks.single.mockResolvedValue({ data: { ...mockAgent, name }, error: null });
      await renderLoaded(<AgentButton agentId="agent-123" />, name);
      expect(screen.getByText(expectedIcon)).toBeInTheDocument();
    });
  });

  describe('Modal Interaction', () => {
    it('should open modal when button is clicked', async () => {
      const button = await renderLoaded(<AgentButton agentId="agent-123" />);
      fireEvent.click(button);

      expect(screen.getByTestId('agent-modal')).toBeInTheDocument();
      expect(screen.getByText('Agent: Test SDR Agent')).toBeInTheDocument();
    });

    it('should close modal when close button is clicked', async () => {
      const button = await renderLoaded(<AgentButton agentId="agent-123" />);
      fireEvent.click(button);
      expect(screen.getByTestId('agent-modal')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Close'));
      expect(screen.queryByTestId('agent-modal')).not.toBeInTheDocument();
    });
  });

  describe('Agent Execution', () => {
    it('should run the agent through the agent-runner function', async () => {
      const onSuccess = vi.fn();
      const button = await renderLoaded(<AgentButton agentId="agent-123" contactId="contact-456" onSuccess={onSuccess} />);
      await execute(button);

      await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(mockExecutionResult));
      expect(mocks.streamFunction).toHaveBeenCalledTimes(1);
      const [url, body, opts] = mocks.streamFunction.mock.calls[0];
      expect(url).toBe(RUNNER);
      expect(body).toEqual({ agentId: 'agent-123', contactId: 'contact-456', input: { testInput: 'value' } });
      expect(opts).toEqual(expect.objectContaining({ signal: expect.any(AbortSignal) }));
    });

    it('should include dealId in the request when provided', async () => {
      const button = await renderLoaded(<AgentButton agentId="agent-123" dealId="deal-789" />);
      await execute(button);

      await waitFor(() => expect(mocks.streamFunction).toHaveBeenCalled());
      expect(mocks.streamFunction.mock.calls[0][1]).toEqual({
        agentId: 'agent-123', dealId: 'deal-789', input: { testInput: 'value' },
      });
    });

    it('should call the named Netlify function directly when functionName is given', async () => {
      const button = await renderLoaded(
        <AgentButton agentId="agent-123" functionName="cold-email-sdr" contactId="contact-456" />,
        'cold-email-sdr',
      );
      await execute(button);

      await waitFor(() => expect(mocks.streamFunction).toHaveBeenCalled());
      const [url, body] = mocks.streamFunction.mock.calls[0];
      expect(url).toBe('/.netlify/functions/cold-email-sdr');
      expect(body).toEqual({ contactId: 'contact-456', input: { testInput: 'value' } });
    });

    it('should show a loading state during execution and recover afterwards', async () => {
      let finish!: (v: unknown) => void;
      mocks.streamFunction.mockReturnValue(new Promise((resolve) => { finish = resolve; }));

      const button = await renderLoaded(<AgentButton agentId="agent-123" />);
      await execute(button);

      await waitFor(() => expect(button).toHaveTextContent('Running...'));
      expect(button).toBeDisabled();

      finish({ result: mockExecutionResult, text: '', citations: [] });
      await waitFor(() => expect(button).not.toBeDisabled());
      expect(button).toHaveTextContent('Test SDR Agent');
    });

    it('should report execution errors through onError', async () => {
      const onError = vi.fn();
      mocks.streamFunction.mockRejectedValue(new Error('Execution failed'));
      const button = await renderLoaded(<AgentButton agentId="agent-123" onError={onError} />);
      await execute(button);

      await waitFor(() => expect(onError).toHaveBeenCalledWith(new Error('Execution failed')));
    });
  });

  describe('Feedback Display', () => {
    it('should show success feedback with the token count after a successful execution', async () => {
      const button = await renderLoaded(<AgentButton agentId="agent-123" />);
      await execute(button);

      await waitFor(() => {
        expect(screen.getByText('Test SDR Agent completed')).toBeInTheDocument();
        expect(screen.getByText('150 tokens used')).toBeInTheDocument();
        expect(screen.getByTestId('check-icon')).toBeInTheDocument();
      });
    });

    it('should show "Finished" when the result carries no usage', async () => {
      mocks.streamFunction.mockResolvedValue({ result: { agentId: 'agent-123', success: true }, text: '', citations: [] });
      const button = await renderLoaded(<AgentButton agentId="agent-123" />);
      await execute(button);

      await waitFor(() => expect(screen.getByText('Finished')).toBeInTheDocument());
    });

    it('should show error feedback after a failed execution', async () => {
      mocks.streamFunction.mockRejectedValue(new Error('Agent execution failed'));
      const button = await renderLoaded(<AgentButton agentId="agent-123" />);
      await execute(button);

      await waitFor(() => {
        expect(screen.getByText('Test SDR Agent failed')).toBeInTheDocument();
        expect(screen.getByText('Agent execution failed')).toBeInTheDocument();
        expect(screen.getByTestId('alert-icon')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should be keyboard focusable', async () => {
      const button = await renderLoaded(<AgentButton agentId="agent-123" />);
      button.focus();
      expect(button).toHaveFocus();
    });
  });
});
