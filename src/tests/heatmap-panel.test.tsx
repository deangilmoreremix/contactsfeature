/**
 * HeatmapPanel: blank deal id assesses all open deals, a deal id assesses that deal;
 * both stream through deal-heatmap (see docs/STREAMING.md).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { HeatmapPanel } from '../components/HeatmapPanel';

vi.mock('../services/sdrPreferencesService', () => ({
  SDRPreferencesService: class { getPreferences = vi.fn().mockResolvedValue({}); updatePreferences = vi.fn().mockResolvedValue({}); },
  sdrPreferencesService: { getPreferences: vi.fn().mockResolvedValue({}), updatePreferences: vi.fn().mockResolvedValue({}) }
}));
vi.mock('../lib/supabase', () => ({ supabase: { auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) } } }));

const runFunction = vi.fn();
vi.mock('../hooks/useAIStream', () => ({
  useAIStream: () => ({
    isStreaming: false,
    state: { result: undefined, partial: undefined, error: null, text: '', status: 'idle', steps: [], label: '', reasoning: '' },
    reset: vi.fn(),
    runFunction
  })
}));

describe('HeatmapPanel', () => {
  beforeEach(() => { runFunction.mockReset().mockResolvedValue(undefined); });

  it('renders the title, an empty deal field and the portfolio action', () => {
    render(<HeatmapPanel />);
    expect(screen.getByText('🔥 Deal Heatmap & Risk Engine')).toBeInTheDocument();
    const input = screen.getByPlaceholderText('Leave blank to assess all open deals');
    expect(input).toHaveValue('');
    expect(screen.getByText('Assess Open Deals')).toBeInTheDocument();
  });

  it('assesses all open deals when the field is blank', async () => {
    render(<HeatmapPanel />);
    fireEvent.click(screen.getByText('Assess Open Deals'));
    await waitFor(() => expect(runFunction).toHaveBeenCalledWith('/.netlify/functions/deal-heatmap', {}));
  });

  it('assesses one deal when an id is entered', async () => {
    render(<HeatmapPanel />);
    fireEvent.change(screen.getByPlaceholderText('Leave blank to assess all open deals'), { target: { value: ' deal-123 ' } });
    fireEvent.click(screen.getByText('Compute Deal Risk'));
    await waitFor(() => expect(runFunction).toHaveBeenCalledWith('/.netlify/functions/deal-heatmap', { dealId: 'deal-123' }));
  });
});
