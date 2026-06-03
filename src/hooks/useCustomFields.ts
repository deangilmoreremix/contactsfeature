import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { logger } from '../services/logger.service';

export type CustomFieldType = 'text' | 'number' | 'boolean' | 'date' | 'select' | 'multiselect' | 'url' | 'email' | 'phone';

export interface CustomFieldDefinition {
  id: string;
  name: string;
  label: string;
  fieldType: CustomFieldType;
  options?: string[];
  isRequired?: boolean;
  defaultValue?: any;
  displayOrder: number;
  isActive: boolean;
  description?: string;
  placeholder?: string;
}

export interface CustomFieldValue {
  id?: string;
  fieldId: string;
  value: any;
}

export function useCustomFieldDefinitions() {
  const [fields, setFields] = useState<CustomFieldDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadFields = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error: fetchError } = await supabase
        .from('custom_field_definitions')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (fetchError) throw fetchError;

      setFields((data || []) as CustomFieldDefinition[]);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error('Failed to load custom field definitions', error);
      setError(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFields();
  }, []);

  return { fields, loading, error, refetch: loadFields };
}

export function useCustomFieldValues(contactId: string) {
  const [values, setValues] = useState<CustomFieldValue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadValues = async () => {
    if (!contactId) return;

    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('custom_field_values')
        .select('*')
        .eq('contact_id', contactId);

      if (fetchError) throw fetchError;

      setValues((data || []) as CustomFieldValue[]);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error('Failed to load custom field values', error);
      setError(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadValues();
  }, [contactId]);

  const getValue = (fieldId: string): any => {
    const found = values.find(v => v.fieldId === fieldId);
    if (!found) return undefined;
    return found.value;
  };

  const updateValue = async (fieldId: string, value: any) => {
    const existing = values.find(v => v.fieldId === fieldId);

    if (existing?.id) {
      const { error: updateError } = await supabase
        .from('custom_field_values')
        .update({ value })
        .eq('id', existing.id);

      if (updateError) throw updateError;

      setValues(prev => prev.map(v =>
        v.fieldId === fieldId ? { ...v, value } : v
      ));
    } else {
      const { data, error: insertError } = await supabase
        .from('custom_field_values')
        .insert({ contact_id: contactId, field_id: fieldId, value })
        .select()
        .single();

      if (insertError) throw insertError;

      setValues(prev => [...prev, data as CustomFieldValue]);
    }
  };

  return { values, loading, error, getValue, updateValue, refetch: loadValues };
}
