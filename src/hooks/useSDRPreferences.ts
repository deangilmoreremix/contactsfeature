import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { SDRPreferencesService } from '../services/sdrPreferencesService';
import { SDRUserPreferences, createDefaultPreferences } from '../types/sdr-preferences';

export interface SDRApiPreferences {
  tone: string;
  model: string;
  temperature: number;
  maxTokens: number;
  customInstructions: string;
  companyName: string;
  signature: string;
  personalizationLevel: string;
}

export function useSDRPreferences(agentId: string) {
  const [userId, setUserId] = useState<string>('anonymous');
  const [preferences, setPreferences] = useState<SDRUserPreferences>(
    createDefaultPreferences('anonymous', agentId)
  );
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      const uid = user?.id || 'anonymous';
      if (cancelled) return;
      setUserId(uid);

      if (uid !== 'anonymous') {
        const prefs = await SDRPreferencesService.getPreferencesWithDefaults(uid, agentId);
        if (!cancelled) setPreferences(prefs);
      }
      if (!cancelled) setLoaded(true);
    }

    load();
    return () => { cancelled = true; };
  }, [agentId]);

  const savePreferences = useCallback(async (config: SDRUserPreferences) => {
    setPreferences(config);
    if (userId !== 'anonymous') {
      await SDRPreferencesService.saveUserPreferences(userId, config);
    }
  }, [userId]);

  const resetPreferences = useCallback(async () => {
    const defaults = createDefaultPreferences(userId, agentId);
    setPreferences(defaults);
    if (userId !== 'anonymous') {
      await SDRPreferencesService.resetToDefaults(userId, agentId);
    }
  }, [userId, agentId]);

  const apiPreferences: SDRApiPreferences = {
    tone: preferences.tone,
    model: preferences.aiSettings.model,
    temperature: preferences.aiSettings.temperature,
    maxTokens: preferences.aiSettings.maxTokens,
    customInstructions: preferences.customPrompts?.general || '',
    companyName: preferences.branding?.companyName || '',
    signature: preferences.branding?.signature || '',
    personalizationLevel: preferences.personalizationLevel,
  };

  return {
    preferences,
    apiPreferences,
    loaded,
    savePreferences,
    resetPreferences,
  };
}
