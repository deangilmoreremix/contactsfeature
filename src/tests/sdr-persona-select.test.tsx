/**
 * Persona select in the SDR agent settings modal: renders all personas, updates config,
 * persists inside aiSettings (ai_settings jsonb, no migration) and reaches the sdr_campaigns insert.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SDRAgentConfigurator } from '../components/sdr/SDRAgentConfigurator';
import { CampaignBuilder } from '../components/sdr/CampaignBuilder';
import { SDRPreferencesService } from '../services/sdrPreferencesService';
import { outboundPersonaOptions } from '../agents/personas';
import { createDefaultPreferences, resolvePersonaId } from '../types/sdr-preferences';

const supa = vi.hoisted(() => ({ maybeSingle: vi.fn(), insert: vi.fn(), upsert: vi.fn(), from: vi.fn() }));
vi.mock('../lib/supabase', () => ({
  supabase: { auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) }, from: supa.from },
  getCurrentUser: vi.fn().mockResolvedValue({ id: 'user-1' })
}));

const personaSelect = () => screen.getByLabelText('Outbound Persona') as HTMLSelectElement;

describe('SDR persona select', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supa.maybeSingle.mockReset().mockResolvedValue({ data: { id: 'c-1' }, error: null });
    supa.insert.mockReset().mockImplementation(() => ({ select: () => ({ maybeSingle: supa.maybeSingle }) }));
    supa.upsert.mockReset().mockImplementation(() => ({ select: () => ({ maybeSingle: supa.maybeSingle }) }));
    supa.from.mockReset().mockImplementation(() => ({ insert: supa.insert, upsert: supa.upsert }));
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  const open = (props: Partial<React.ComponentProps<typeof SDRAgentConfigurator>> = {}) => {
    const onSave = vi.fn();
    render(<SDRAgentConfigurator agentId="sdr-follow-up" agentName="Follow-Up" onSave={onSave} onClose={() => {}} {...props} />);
    return onSave;
  };

  it('renders all 30 personas, defaulting to cold_saas_founder', () => {
    open();
    expect(outboundPersonaOptions).toHaveLength(30);
    const select = personaSelect();
    expect(Array.from(select.options).map(o => o.value)).toEqual(outboundPersonaOptions.map(p => p.id));
    expect(select.value).toBe('cold_saas_founder');
  });

  it('falls back to the default for an unknown persona id', () => {
    open({ currentConfig: { aiSettings: { model: 'default', temperature: 0.5, maxTokens: 800, personaId: 'nope' } } });
    expect(personaSelect().value).toBe('cold_saas_founder');
    expect(resolvePersonaId(undefined)).toBe('cold_saas_founder');
    expect(resolvePersonaId('churn_winback')).toBe('churn_winback');
  });

  it('choosing a persona updates config and saves it inside aiSettings', async () => {
    const onSave = open();
    fireEvent.change(personaSelect(), { target: { value: 'churn_winback' } });
    expect(personaSelect().value).toBe('churn_winback');
    fireEvent.click(screen.getByText('Save Configuration'));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0]![0].aiSettings.personaId).toBe('churn_winback');
  });

  it('service stores personaId in the ai_settings jsonb and reads it back (unknown -> default)', async () => {
    const prefs = createDefaultPreferences('user-1', 'sdr-follow-up');
    await SDRPreferencesService.saveUserPreferences('user-1', { ...prefs, aiSettings: { ...prefs.aiSettings, personaId: 'vip_concierge' } });
    expect(supa.upsert.mock.calls[0]![0].ai_settings.personaId).toBe('vip_concierge');
    await SDRPreferencesService.saveUserPreferences('user-1', { ...prefs, aiSettings: { ...prefs.aiSettings, personaId: 'bogus' } });
    expect(supa.upsert.mock.calls[1]![0].ai_settings.personaId).toBe('cold_saas_founder');

    const row = { user_id: 'user-1', agent_id: 'sdr-follow-up', ai_settings: { model: 'fast', temperature: 0.5, maxTokens: 500, personaId: 'pr_media_outreach' } };
    const chain = { select: () => chain, eq: () => chain, maybeSingle: () => Promise.resolve({ data: row, error: null }) };
    supa.from.mockImplementation(() => chain);
    expect((await SDRPreferencesService.loadUserPreferences('user-1', 'sdr-follow-up'))!.aiSettings.personaId).toBe('pr_media_outreach');
    row.ai_settings.personaId = 'bogus';
    expect((await SDRPreferencesService.loadUserPreferences('user-1', 'sdr-follow-up'))!.aiSettings.personaId).toBe('cold_saas_founder');
  });

  const saveCampaign = async () => {
    fireEvent.change(screen.getByPlaceholderText('My Custom Campaign'), { target: { value: 'Camp' } });
    fireEvent.click(screen.getByText('Save Template'));
    await waitFor(() => expect(supa.insert).toHaveBeenCalled());
    return supa.insert.mock.calls[0]![0];
  };

  it('the configurator passes the chosen persona to CampaignBuilder -> sdr_campaigns.persona_id', async () => {
    open();
    fireEvent.change(personaSelect(), { target: { value: 'webinar_invite' } });
    fireEvent.click(screen.getByText('Campaign Builder'));
    expect((await saveCampaign()).persona_id).toBe('webinar_invite');
  });

  it('uses cold_saas_founder when none is chosen', async () => {
    open();
    fireEvent.click(screen.getByText('Campaign Builder'));
    expect((await saveCampaign()).persona_id).toBe('cold_saas_founder');
  });

  it('CampaignBuilder alone defaults persona_id when no prop is given', async () => {
    render(<CampaignBuilder agentId="a" agentName="A" onSave={() => {}} onClose={() => {}} />);
    expect((await saveCampaign()).persona_id).toBe('cold_saas_founder');
  });
});
