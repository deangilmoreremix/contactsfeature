import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { productMatchingService } from '../services/productMatchingService';
import { draftGenerationService } from '../services/draftGenerationService';
import type { Contact } from '../types/contact';
import type {
  UserProduct,
  ProductContactMatch,
  ProductContactMatchWithContact,
  ProductDraft,
  ProductDraftWithDetails,
  DraftType,
  DraftTone,
  MatchTier,
  getMatchTier,
} from '../types/userProduct';

interface MatchFilters {
  minScore?: number;
  maxScore?: number;
  tier?: MatchTier;
  industries?: string[];
  companies?: string[];
  statuses?: string[];
}

interface UseProductMatchesReturn {
  matches: ProductContactMatchWithContact[];
  loading: boolean;
  calculating: boolean;
  error: string | null;
  progress: { completed: number; total: number } | null;
  fetchMatchesForProduct: (productId: string, filters?: MatchFilters) => Promise<void>;
  calculateMatchesForProduct: (product: UserProduct) => Promise<void>;
  getMatchForContact: (productId: string, contactId: string) => ProductContactMatch | undefined;
  getMatchesByTier: () => { high: ProductContactMatchWithContact[]; medium: ProductContactMatchWithContact[]; low: ProductContactMatchWithContact[] };
  stats: {
    total: number;
    highFit: number;
    mediumFit: number;
    lowFit: number;
    averageScore: number;
  };
}

interface UseProductDraftsReturn {
  drafts: ProductDraftWithDetails[];
  loading: boolean;
  generating: boolean;
  error: string | null;
  progress: { completed: number; total: number } | null;
  fetchDrafts: (filters?: { productId?: string; contactId?: string; draftType?: DraftType; isSent?: boolean }) => Promise<void>;
  generateDraft: (product: UserProduct, contact: Contact, draftType: DraftType, tone?: DraftTone) => Promise<ProductDraft | null>;
  generateBatchDrafts: (product: UserProduct, contactIds: string[], draftType: DraftType, tone?: DraftTone) => Promise<ProductDraft[]>;
  updateDraft: (draftId: string, updates: { subject?: string; body?: string; tone?: DraftTone }) => Promise<ProductDraft | null>;
  markAsSent: (draftId: string) => Promise<boolean>;
  deleteDraft: (draftId: string) => Promise<boolean>;
  regenerateDraft: (draft: ProductDraft, tone?: DraftTone) => Promise<ProductDraft | null>;
}

export function useProductMatches(): UseProductMatchesReturn {
  const [matches, setMatches] = useState<ProductContactMatchWithContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ completed: number; total: number } | null>(null);

  const fetchMatchesForProduct = useCallback(async (
    productId: string,
    filters?: MatchFilters
  ) => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('product_contact_matches')
        .select(`
          *,
          contact:contacts (
            id,
            name,
            email,
            company,
            title,
            industry,
            company_size,
            status,
            tags,
            avatar_url
          )
        `)
        .eq('product_id', productId)
        .order('match_score', { ascending: false });

      if (filters?.minScore !== undefined) {
        query = query.gte('match_score', filters.minScore);
      }
      if (filters?.maxScore !== undefined) {
        query = query.lte('match_score', filters.maxScore);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      let filteredMatches = (data || []) as ProductContactMatchWithContact[];

      if (filters?.industries?.length) {
        filteredMatches = filteredMatches.filter(m =>
          filters.industries!.some(i =>
            m.contact.industry?.toLowerCase().includes(i.toLowerCase())
          )
        );
      }

      if (filters?.companies?.length) {
        filteredMatches = filteredMatches.filter(m =>
          filters.companies!.some(c =>
            m.contact.company?.toLowerCase().includes(c.toLowerCase())
          )
        );
      }

      if (filters?.statuses?.length) {
        filteredMatches = filteredMatches.filter(m =>
          filters.statuses!.includes(m.contact.status || '')
        );
      }

      setMatches(filteredMatches);
    } catch (err) {
      console.error('Error fetching matches:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch matches');
    } finally {
      setLoading(false);
    }
  }, []);

  const calculateMatchesForProduct = useCallback(async (product: UserProduct) => {
    try {
      setCalculating(true);
      setError(null);
      setProgress({ completed: 0, total: 0 });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('You must be logged in');
      }

      const { data: contacts, error: contactsError } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', user.id);

      if (contactsError) {
        throw contactsError;
      }

      if (!contacts?.length) {
        setMatches([]);
        return;
      }

      setProgress({ completed: 0, total: contacts.length });

      const calculatedMatches = await productMatchingService.batchCalculateMatches(
        product,
        contacts as Contact[],
        user.id,
        (completed, total) => setProgress({ completed, total })
      );

      await fetchMatchesForProduct(product.id);
    } catch (err) {
      console.error('Error calculating matches:', err);
      setError(err instanceof Error ? err.message : 'Failed to calculate matches');
    } finally {
      setCalculating(false);
      setProgress(null);
    }
  }, [fetchMatchesForProduct]);

  const getMatchForContact = useCallback((
    productId: string,
    contactId: string
  ): ProductContactMatch | undefined => {
    return matches.find(m => m.product_id === productId && m.contact_id === contactId);
  }, [matches]);

  const getMatchesByTier = useCallback(() => {
    const high: ProductContactMatchWithContact[] = [];
    const medium: ProductContactMatchWithContact[] = [];
    const low: ProductContactMatchWithContact[] = [];

    matches.forEach(match => {
      if (match.match_score >= 80) {
        high.push(match);
      } else if (match.match_score >= 50) {
        medium.push(match);
      } else {
        low.push(match);
      }
    });

    return { high, medium, low };
  }, [matches]);

  const stats = {
    total: matches.length,
    highFit: matches.filter(m => m.match_score >= 80).length,
    mediumFit: matches.filter(m => m.match_score >= 50 && m.match_score < 80).length,
    lowFit: matches.filter(m => m.match_score < 50).length,
    averageScore: matches.length
      ? Math.round(matches.reduce((sum, m) => sum + m.match_score, 0) / matches.length)
      : 0,
  };

  return {
    matches,
    loading,
    calculating,
    error,
    progress,
    fetchMatchesForProduct,
    calculateMatchesForProduct,
    getMatchForContact,
    getMatchesByTier,
    stats,
  };
}

export function useProductDrafts(): UseProductDraftsReturn {
  const [drafts, setDrafts] = useState<ProductDraftWithDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ completed: number; total: number } | null>(null);

  const fetchDrafts = useCallback(async (filters?: {
    productId?: string;
    contactId?: string;
    draftType?: DraftType;
    isSent?: boolean;
  }) => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('product_drafts')
        .select(`
          *,
          product:user_products (id, name, tagline),
          contact:contacts (id, name, email, company, title)
        `)
        .order('created_at', { ascending: false });

      if (filters?.productId) {
        query = query.eq('product_id', filters.productId);
      }
      if (filters?.contactId) {
        query = query.eq('contact_id', filters.contactId);
      }
      if (filters?.draftType) {
        query = query.eq('draft_type', filters.draftType);
      }
      if (filters?.isSent !== undefined) {
        query = query.eq('is_sent', filters.isSent);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      setDrafts((data || []) as ProductDraftWithDetails[]);
    } catch (err) {
      console.error('Error fetching drafts:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch drafts');
    } finally {
      setLoading(false);
    }
  }, []);

  const generateDraft = useCallback(async (
    product: UserProduct,
    contact: Contact,
    draftType: DraftType,
    tone: DraftTone = 'professional'
  ): Promise<ProductDraft | null> => {
    try {
      setGenerating(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('You must be logged in');
      }

      const { data: matchData } = await supabase
        .from('product_contact_matches')
        .select('*')
        .eq('product_id', product.id)
        .eq('contact_id', contact.id)
        .maybeSingle();

      const draft = await draftGenerationService.createAndSaveDraft(
        product,
        contact,
        user.id,
        draftType,
        tone,
        matchData as ProductContactMatch | undefined
      );

      if (draft) {
        await fetchDrafts({ productId: product.id });
      }

      return draft;
    } catch (err) {
      console.error('Error generating draft:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate draft');
      return null;
    } finally {
      setGenerating(false);
    }
  }, [fetchDrafts]);

  const generateBatchDrafts = useCallback(async (
    product: UserProduct,
    contactIds: string[],
    draftType: DraftType,
    tone: DraftTone = 'professional'
  ): Promise<ProductDraft[]> => {
    try {
      setGenerating(true);
      setError(null);
      setProgress({ completed: 0, total: contactIds.length });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('You must be logged in');
      }

      const { data: contacts } = await supabase
        .from('contacts')
        .select('*')
        .in('id', contactIds);

      if (!contacts?.length) {
        return [];
      }

      const { data: matchesData } = await supabase
        .from('product_contact_matches')
        .select('*')
        .eq('product_id', product.id)
        .in('contact_id', contactIds);

      const matchesMap = new Map<string, ProductContactMatch>();
      (matchesData || []).forEach(m => matchesMap.set(m.contact_id, m as ProductContactMatch));

      const generatedDrafts = await draftGenerationService.batchCreateDrafts(
        product,
        contacts as Contact[],
        user.id,
        draftType,
        tone,
        matchesMap,
        (completed, total) => setProgress({ completed, total })
      );

      await fetchDrafts({ productId: product.id });

      return generatedDrafts;
    } catch (err) {
      console.error('Error generating batch drafts:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate drafts');
      return [];
    } finally {
      setGenerating(false);
      setProgress(null);
    }
  }, [fetchDrafts]);

  const updateDraft = useCallback(async (
    draftId: string,
    updates: { subject?: string; body?: string; tone?: DraftTone }
  ): Promise<ProductDraft | null> => {
    try {
      const { data, error: updateError } = await supabase
        .from('product_drafts')
        .update({
          ...updates,
          is_edited: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', draftId)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      setDrafts(prev =>
        prev.map(d => (d.id === draftId ? { ...d, ...data } : d))
      );

      return data as ProductDraft;
    } catch (err) {
      console.error('Error updating draft:', err);
      setError(err instanceof Error ? err.message : 'Failed to update draft');
      return null;
    }
  }, []);

  const markAsSent = useCallback(async (draftId: string): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('product_drafts')
        .update({
          is_sent: true,
          sent_at: new Date().toISOString(),
        })
        .eq('id', draftId);

      if (updateError) {
        throw updateError;
      }

      setDrafts(prev =>
        prev.map(d => (d.id === draftId ? { ...d, is_sent: true, sent_at: new Date().toISOString() } : d))
      );

      return true;
    } catch (err) {
      console.error('Error marking draft as sent:', err);
      setError(err instanceof Error ? err.message : 'Failed to update draft');
      return false;
    }
  }, []);

  const deleteDraft = useCallback(async (draftId: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('product_drafts')
        .delete()
        .eq('id', draftId);

      if (deleteError) {
        throw deleteError;
      }

      setDrafts(prev => prev.filter(d => d.id !== draftId));
      return true;
    } catch (err) {
      console.error('Error deleting draft:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete draft');
      return false;
    }
  }, []);

  const regenerateDraft = useCallback(async (
    draft: ProductDraft,
    tone?: DraftTone
  ): Promise<ProductDraft | null> => {
    try {
      setGenerating(true);

      const { data: product } = await supabase
        .from('user_products')
        .select('*')
        .eq('id', draft.product_id)
        .single();

      const { data: contact } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', draft.contact_id)
        .single();

      if (!product || !contact) {
        throw new Error('Product or contact not found');
      }

      await deleteDraft(draft.id);

      return await generateDraft(
        product as UserProduct,
        contact as Contact,
        draft.draft_type,
        tone || draft.tone
      );
    } catch (err) {
      console.error('Error regenerating draft:', err);
      setError(err instanceof Error ? err.message : 'Failed to regenerate draft');
      return null;
    } finally {
      setGenerating(false);
    }
  }, [deleteDraft, generateDraft]);

  return {
    drafts,
    loading,
    generating,
    error,
    progress,
    fetchDrafts,
    generateDraft,
    generateBatchDrafts,
    updateDraft,
    markAsSent,
    deleteDraft,
    regenerateDraft,
  };
}
