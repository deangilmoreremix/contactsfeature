import { useState, useCallback, useRef, useEffect } from 'react';
import { logger } from '../services/logger.service';
import { cacheService } from '../services/cache.service';
import { supabase } from '../lib/supabase';
import { Contact } from '../types';
import { streamFunction } from '../services/functionStream';
import { streamTaskEnvelope } from '../services/aiTask';
import { useFunctionStream } from './useFunctionStream';
import type { StreamHandlers } from '../lib/streaming/streamClient';
import { tee } from '../lib/streaming/tee';

// Enhanced interfaces with streaming and caching support
interface EmailComposition {
  subject: string;
  body: string;
  purpose: string;
  tone: string;
  confidence: number;
  model: string;
  generatedAt: string;
  cacheKey?: string;
  streamingTokens?: string[];
}

interface EmailAnalysis {
  metrics: {
    wordCount: number;
    sentenceCount: number;
    avgSentenceLength: number;
    paragraphCount: number;
    subjectLength: number;
  };
  toneAnalysis: Record<string, number>;
  dominantTone: string;
  qualityScore: number;
  responseLikelihood: number;
  improvements: Array<{
    type: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    autoFix?: boolean;
  }>;
  assessment: string;
  confidence: number;
  model: string;
  analyzedAt: string;
  suggestions?: string[];
}

interface PersonalizedMessage {
  message: string;
  platform: string;
  purpose: string;
  tone: string;
  characterCount: number;
  characterLimit: {
    min: number;
    max: number;
    ideal: number;
  };
  confidence: number;
  model: string;
  generatedAt: string;
  abTestVariants?: string[];
}

interface EmailTemplate {
  id: string;
  name: string;
  description?: string;
  subject: string;
  body: string;
  variables: string[];
  category: string;
  isDefault?: boolean;
  usageCount?: number;
  lastUsed?: string;
}

interface StreamingUpdate {
  type: 'progress' | 'token' | 'complete' | 'error';
  progress?: number;
  token?: string;
  data?: any;
  error?: string;
}

interface EmailAIState {
  isGenerating: boolean;
  isAnalyzing: boolean;
  isFetching: boolean;
  isStreaming: boolean;
  error: string | null;
  emailComposition: EmailComposition | null;
  emailAnalysis: EmailAnalysis | null;
  personalizedMessage: PersonalizedMessage | null;
  emailTemplates: EmailTemplate[];
  streamingProgress: number;
  cacheStats: {
    hits: number;
    misses: number;
    size: number;
  };
}

export const useEmailAI = () => {
  const [state, setState] = useState<EmailAIState>({
    isGenerating: false,
    isAnalyzing: false,
    isFetching: false,
    isStreaming: false,
    error: null,
    emailComposition: null,
    emailAnalysis: null,
    personalizedMessage: null,
    emailTemplates: [],
    streamingProgress: 0,
    cacheStats: { hits: 0, misses: 0, size: 0 }
  });

  /**
   * Live state of the running AI call (generate / analyze / personalize). Render it with
   *   <StreamingOutput state={liveStream.state} onStop={liveStream.stop} />
   * Every AI answer of this hook arrives over SSE, so the text / structured result fills in while it is produced.
   */
  const liveStream = useFunctionStream<any>();

  // Streaming and caching refs
  const streamingControllerRef = useRef<AbortController | null>(null);
  const cacheRef = useRef<Map<string, any>>(new Map());

  // Update cache stats periodically
  useEffect(() => {
    const updateCacheStats = () => {
      setState(prev => ({
        ...prev,
        cacheStats: {
          hits: cacheService.getStats?.().hits || 0,
          misses: cacheService.getStats?.().misses || 0,
          size: cacheRef.current.size
        }
      }));
    };

    const interval = setInterval(updateCacheStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const generateEmail = useCallback(async (
    contact: Contact,
    purpose: string,
    tone: string = 'professional',
    length: string = 'medium',
    includeSignature: boolean = true,
    live?: StreamHandlers
  ): Promise<EmailComposition> => {
    setState(prev => ({ ...prev, isGenerating: true, error: null }));
    const t = liveStream.start();

    try {
      const supabaseUrl = import.meta.env['VITE_SUPABASE_URL'];

      if (!supabaseUrl) {
        throw new Error('Supabase configuration is missing. Please check your environment variables.');
      }

      // Get the user's session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('User not authenticated. Please sign in to use this feature.');
      }

      // Dual-mode edge function: streams the draft over SSE; `result` is exactly what the JSON mode returned.
      const { result: streamed } = await streamFunction<EmailComposition>('email-composer', {
        contact,
        purpose,
        tone,
        length,
        includeSignature
      }, tee(t.h, live));
      if (!streamed) throw new Error('Failed to generate email');
      const result = streamed;
      t.finish(result);

      setState(prev => ({
        ...prev,
        isGenerating: false,
        emailComposition: result
      }));

      logger.info('Email generated successfully with OpenAI', {
        purpose,
        tone,
        model: result.model
      });

      return result;
    } catch (error) {
      t.fail(error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate email';

      setState(prev => ({
        ...prev,
        isGenerating: false,
        error: errorMessage
      }));

      logger.error('Email generation failed', error as Error);
      throw error;
    }
  }, []);

  const analyzeEmail = useCallback(async (
    emailSubject: string,
    emailBody: string,
    context?: string,
    recipient?: Contact,
    live?: StreamHandlers
  ): Promise<EmailAnalysis> => {
    setState(prev => ({ ...prev, isAnalyzing: true, error: null }));
    const t = liveStream.start();

    try {
      const supabaseUrl = import.meta.env['VITE_SUPABASE_URL'];

      if (!supabaseUrl) {
        throw new Error('Supabase configuration is missing. Please check your environment variables.');
      }

      // Get the user's session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('User not authenticated. Please sign in to use this feature.');
      }

      const { result: streamed } = await streamFunction<EmailAnalysis>('email-analyzer', {
        emailSubject,
        emailBody,
        context,
        recipient
      }, tee(t.h, live));
      if (!streamed) throw new Error('Failed to analyze email');
      const result = streamed;
      t.finish(result);

      setState(prev => ({
        ...prev,
        isAnalyzing: false,
        emailAnalysis: result
      }));

      logger.info('Email analyzed successfully with OpenAI', {
        subject: emailSubject.substring(0, 30),
        model: result.model
      });

      return result;
    } catch (error) {
      t.fail(error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to analyze email';

      setState(prev => ({
        ...prev,
        isAnalyzing: false,
        error: errorMessage
      }));

      logger.error('Email analysis failed', error as Error);
      throw error;
    }
  }, []);

  const generatePersonalizedMessage = useCallback(async (
    contact: Contact,
    platform: string,
    purpose: string = 'introduction',
    tone: string = 'professional',
    length: string = 'medium',
    live?: StreamHandlers
  ): Promise<PersonalizedMessage> => {
    setState(prev => ({ ...prev, isGenerating: true, error: null }));
    const t = liveStream.start();

    try {
      // ai-task `personalized-messages`: the message streams in while it is written.
      const envelope = await streamTaskEnvelope<{ message: string; subject: string | null; generatedAt: string; personalizationNotes?: string[] }>(
        'personalized-messages',
        {
          contactId: contact.id,
          contactData: contact,
          channel: platform,
          context: { channel: platform, purpose, tone, length }
        },
        tee(t.h, live)
      );
      const task = envelope.data;
      const message = task.message || '';
      const result: PersonalizedMessage = {
        message,
        platform,
        purpose,
        tone,
        characterCount: message.length,
        characterLimit: { min: 0, max: Math.max(message.length, 0), ideal: message.length },
        confidence: 0,
        model: envelope.model || '',
        generatedAt: task.generatedAt
      };
      t.finish(result);

      setState(prev => ({
        ...prev,
        isGenerating: false,
        personalizedMessage: result
      }));

      logger.info('Personalized message generated successfully', {
        platform,
        purpose,
        model: result.model
      });

      return result;
    } catch (error) {
      t.fail(error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate message';

      setState(prev => ({
        ...prev,
        isGenerating: false,
        error: errorMessage
      }));

      logger.error('Message generation failed', error as Error);
      throw new Error(errorMessage);
    }
  }, []);

  const fetchEmailTemplates = useCallback(async (
    category?: string
  ): Promise<EmailTemplate[]> => {
    setState(prev => ({ ...prev, isFetching: true, error: null }));

    try {
      const supabaseUrl = import.meta.env['VITE_SUPABASE_URL'];

      if (!supabaseUrl) {
        throw new Error('Supabase configuration is missing. Please check your environment variables.');
      }

      // Get the user's session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('User not authenticated. Please sign in to use this feature.');
      }

      const url = new URL(`${supabaseUrl}/functions/v1/email-templates`);
      if (category) {
        url.searchParams.append('category', category);
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'X-Client-Info': 'supabase-js-web'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        const errorMsg = errorData.error || errorData.details || `HTTP ${response.status}: Failed to fetch email templates`;
        throw new Error(errorMsg);
      }

      const result = await response.json();
      const templates = result.templates || [];

      setState(prev => ({
        ...prev,
        isFetching: false,
        emailTemplates: templates
      }));

      logger.info('Email templates fetched from database', {
        count: templates.length,
        category
      });

      return templates;
    } catch (error) {
      let errorMessage = 'Failed to fetch email templates';

      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        errorMessage = JSON.stringify(error);
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      setState(prev => ({
        ...prev,
        isFetching: false,
        error: errorMessage
      }));

      logger.error('Email template fetching failed', error as Error);
      throw new Error(errorMessage);
    }
  }, []);

  const applyTemplate = useCallback((
    template: EmailTemplate,
    contact: Contact,
    companyInfo: any = {}
  ): { subject: string, body: string } => {
    let subject = template.subject;
    let body = template.body;
    
    // Replace contact variables
    const replacements: Record<string, string> = {
      'first_name': contact.firstName,
      'last_name': contact.lastName,
      'full_name': contact.name,
      'email': contact.email,
      'phone': contact.phone || '',
      'title': contact.title,
      'company': contact.company,
      'industry': contact.industry || '',
      'client_company': contact.company,
      'pain_point': getPainPoint(contact.industry)
    };
    
    // Add company info variables
    if (companyInfo) {
      replacements['company_name'] = companyInfo.name || 'Our Company';
      replacements['sender_name'] = companyInfo.senderName || 'Your Name';
      replacements['sender_title'] = companyInfo.senderTitle || 'Your Title';
      replacements['sender_phone'] = companyInfo.senderPhone || 'Your Phone';
      replacements['product_name'] = companyInfo.productName || 'Our Product';
      replacements['solution_type'] = companyInfo.solutionType || 'Our Solution';
      replacements['benefit_1'] = getBenefit(contact.industry);
      replacements['benefit_2'] = getSecondaryBenefit(contact.industry);
    }
    
    // Replace all variables in subject and body
    template.variables.forEach(variable => {
      const value = replacements[variable] || `{{${variable}}}`;
      const regex = new RegExp(`{{${variable}}}`, 'g');
      subject = subject.replace(regex, value);
      body = body.replace(regex, value);
    });
    
    return { subject, body };
  }, []);

  return {
    // State
    isGenerating: state.isGenerating,
    isAnalyzing: state.isAnalyzing,
    isFetching: state.isFetching,
    error: state.error,
    emailComposition: state.emailComposition,
    emailAnalysis: state.emailAnalysis,
    personalizedMessage: state.personalizedMessage,
    emailTemplates: state.emailTemplates,
    
    // Live stream of the running AI call (render with <StreamingOutput/>)
    liveStream: liveStream.state,
    stopLive: liveStream.stop,

    // Methods
    generateEmail,
    analyzeEmail,
    generatePersonalizedMessage,
    fetchEmailTemplates,
    applyTemplate,
    
    // Reset state
    reset: () => setState({
      isGenerating: false,
      isAnalyzing: false,
      isFetching: false,
      isStreaming: false,
      error: null,
      emailComposition: null,
      emailAnalysis: null,
      personalizedMessage: null,
      emailTemplates: [],
      streamingProgress: 0,
      cacheStats: { hits: 0, misses: 0, size: 0 }
    }),

    // Enhanced methods with caching and streaming
    generateEmailStreaming: async function* (
      contact: Contact,
      purpose: string,
      tone: string = 'professional',
      length: string = 'medium',
      includeSignature: boolean = true,
      onProgress?: (update: StreamingUpdate) => void
    ): AsyncGenerator<StreamingUpdate, EmailComposition, unknown> {
      const cacheKey = `email-${contact.id}-${purpose}-${tone}-${length}-${includeSignature}`;
      const cached = cacheService.get<EmailComposition>('EmailAI', { cacheKey });

      if (cached) {
        setState(prev => ({ ...prev, cacheStats: { ...prev.cacheStats, hits: prev.cacheStats.hits + 1 } }));
        yield { type: 'complete', data: cached };
        return cached;
      }

      setState(prev => ({
        ...prev,
        isStreaming: true,
        streamingProgress: 0,
        cacheStats: { ...prev.cacheStats, misses: prev.cacheStats.misses + 1 }
      }));

      try {
        streamingControllerRef.current = new AbortController();

        yield { type: 'progress', progress: 10, data: 'Initializing AI generation...' };

        const supabaseUrl = import.meta.env['VITE_SUPABASE_URL'];

        if (!supabaseUrl) {
          throw new Error('Supabase configuration is missing. Please check your environment variables.');
        }

        // Get the user's session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) {
          throw new Error('User not authenticated. Please sign in to use this feature.');
        }

        yield { type: 'progress', progress: 30, data: 'Connecting to AI service...' };

        // Real SSE: every status / text / partial event is reported to the caller as it arrives.
        const t = liveStream.start();
        const signal = streamingControllerRef.current.signal;
        signal.addEventListener('abort', () => liveStream.stop());
        const queue: StreamingUpdate[] = [];
        const hooks: StreamHandlers = {
          onStatus: (label) => { queue.push({ type: 'progress', data: label }); onProgress?.({ type: 'progress', data: label }); },
          onDelta: (token) => { queue.push({ type: 'token', token }); onProgress?.({ type: 'token', token }); },
        };
        const run = streamFunction<EmailComposition>('email-composer', {
          contact,
          purpose,
          tone,
          length,
          includeSignature
        }, tee(t.h, hooks));
        let settled = false;
        const finished = run.then((r) => ({ ok: true as const, r }), (e) => ({ ok: false as const, e })).then((x) => { settled = true; return x; });
        while (!settled) {
          await Promise.race([finished, new Promise((res) => setTimeout(res, 40))]);
          while (queue.length) yield queue.shift()!;
        }
        while (queue.length) yield queue.shift()!;
        const outcome = await finished;
        if (!outcome.ok) { t.fail(outcome.e); throw outcome.e; }
        if (!outcome.r.result) { const err = new Error('Failed to generate email'); t.fail(err); throw err; }
        t.finish(outcome.r.result);

        yield { type: 'progress', progress: 70, data: 'Processing AI response...' };

        const result = outcome.r.result;
        const composition: EmailComposition = {
          ...result,
          generatedAt: new Date().toISOString(),
          cacheKey
        };

        // Cache the result
        cacheService.set('EmailAI', { cacheKey }, composition, 30 * 60 * 1000);

        yield { type: 'progress', progress: 100, data: 'Email generated successfully!' };
        yield { type: 'complete', data: composition };

        setState(prev => ({
          ...prev,
          isStreaming: false,
          streamingProgress: 100,
          emailComposition: composition
        }));

        return composition;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to generate email';
        yield { type: 'error', error: errorMessage };

        setState(prev => ({
          ...prev,
          isStreaming: false,
          error: errorMessage
        }));

        throw error;
      }
    },

    // Cancel streaming operation
    cancelStreaming: () => {
      if (streamingControllerRef.current) {
        streamingControllerRef.current.abort();
        streamingControllerRef.current = null;
        setState(prev => ({ ...prev, isStreaming: false, streamingProgress: 0 }));
      }
    },

    // Get cache statistics
    getCacheStats: () => state.cacheStats,

    // Clear cache
    clearCache: () => {
      cacheRef.current.clear();
      setState(prev => ({ ...prev, cacheStats: { hits: 0, misses: 0, size: 0 } }));
    }
  };
};

// Helper functions for template variables

function getPainPoint(industry?: string): string {
  const painPoints: Record<string, string[]> = {
    'Technology': ['legacy system challenges', 'integration issues', 'cybersecurity concerns', 'digital transformation needs'],
    'Healthcare': ['patient data management', 'compliance requirements', 'care coordination challenges', 'telehealth implementation'],
    'Finance': ['risk management needs', 'compliance monitoring', 'customer acquisition costs', 'fraud prevention'],
    'Manufacturing': ['supply chain optimization', 'quality control processes', 'production efficiency', 'inventory management'],
    'Retail': ['customer retention', 'omnichannel strategy', 'inventory forecasting', 'personalization needs'],
    'Education': ['student engagement', 'administrative efficiency', 'distance learning', 'data management']
  };

  if (industry && painPoints[industry]) {
    const industryPains = painPoints[industry];
    return industryPains[Math.floor(Math.random() * industryPains.length)] || 'business challenges';
  }

  return 'business challenges';
}

function getBenefit(industry?: string): string {
  const benefits: Record<string, string[]> = {
    'Technology': ['improve development efficiency', 'enhance system security', 'streamline data integration', 'accelerate innovation'],
    'Healthcare': ['enhance patient outcomes', 'streamline clinical workflows', 'improve compliance', 'reduce administrative burden'],
    'Finance': ['mitigate financial risks', 'automate compliance', 'improve customer insights', 'optimize reporting'],
    'Manufacturing': ['increase production efficiency', 'improve quality control', 'optimize inventory', 'reduce downtime'],
    'Retail': ['boost customer retention', 'enhance shopping experience', 'optimize inventory', 'increase conversion rates'],
    'Education': ['improve student engagement', 'streamline administration', 'enhance learning outcomes', 'optimize resource allocation']
  };

  if (industry && benefits[industry]) {
    const industryBenefits = benefits[industry];
    return industryBenefits[Math.floor(Math.random() * industryBenefits.length)] || 'improve operational efficiency';
  }

  return 'improve operational efficiency';
}

function getSecondaryBenefit(industry?: string): string {
  const secondaryBenefits: Record<string, string[]> = {
    'Technology': ['reducing maintenance costs', 'improving scalability', 'enhancing user experience', 'ensuring data security'],
    'Healthcare': ['increasing staff productivity', 'enhancing patient satisfaction', 'ensuring regulatory compliance', 'optimizing resource utilization'],
    'Finance': ['strengthening security', 'improving customer satisfaction', 'ensuring audit readiness', 'enabling faster decisions'],
    'Manufacturing': ['reducing waste', 'improving sustainability', 'enhancing worker safety', 'increasing production capacity'],
    'Retail': ['reducing operational costs', 'increasing customer loyalty', 'improving marketing ROI', 'enhancing brand perception'],
    'Education': ['reducing administrative overhead', 'improving faculty satisfaction', 'enhancing student outcomes', 'strengthening institutional reputation']
  };

  if (industry && secondaryBenefits[industry]) {
    const industryBenefits = secondaryBenefits[industry];
    return industryBenefits[Math.floor(Math.random() * industryBenefits.length)] || 'reducing operational costs';
  }

  return 'reducing operational costs';
}