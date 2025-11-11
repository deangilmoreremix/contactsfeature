import { useState, useCallback, useRef, useEffect } from 'react';
import { logger } from '../services/logger.service';
import { cacheService } from '../services/cache.service';
import { Contact } from '../types';

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
    includeSignature: boolean = true
  ): Promise<EmailComposition> => {
    setState(prev => ({ ...prev, isGenerating: true, error: null }));

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase configuration is missing. Please check your environment variables.');
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/email-composer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
          'X-Client-Info': 'supabase-js-web'
        },
        body: JSON.stringify({
          contact,
          purpose,
          tone,
          length,
          includeSignature
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || errorData.details || 'Failed to generate email');
      }

      const result = await response.json();

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
    recipient?: Contact
  ): Promise<EmailAnalysis> => {
    setState(prev => ({ ...prev, isAnalyzing: true, error: null }));

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase configuration is missing. Please check your environment variables.');
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/email-analyzer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
          'X-Client-Info': 'supabase-js-web'
        },
        body: JSON.stringify({
          emailSubject,
          emailBody,
          context,
          recipient
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || errorData.details || 'Failed to analyze email');
      }

      const result = await response.json();

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
    length: string = 'medium'
  ): Promise<PersonalizedMessage> => {
    setState(prev => ({ ...prev, isGenerating: true, error: null }));
    
    try {
      // Get Supabase URL and key from environment
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
      
      if (!supabaseUrl || !supabaseKey) {
        console.warn('Supabase environment variables not defined, using fallback mode');
        
        // Create fallback message
        const fallbackMessage = createFallbackPersonalizedMessage(contact, platform, purpose);
        
        setState(prev => ({
          ...prev,
          isGenerating: false,
          personalizedMessage: fallbackMessage
        }));
        
        return fallbackMessage;
      }
      
      // Call the Supabase Edge Function
      const response = await fetch(`${supabaseUrl}/functions/v1/personalized-messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`
        },
        body: JSON.stringify({
          contact,
          platform,
          purpose,
          tone,
          length
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to generate message: ${errorText}`);
      }
      
      const result = await response.json();
      
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
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate message';
      
      setState(prev => ({
        ...prev,
        isGenerating: false,
        error: errorMessage
      }));
      
      logger.error('Message generation failed', error as Error);
      
      // Return fallback message
      const fallbackMessage = createFallbackPersonalizedMessage(contact, platform, purpose);
      return fallbackMessage;
    }
  }, []);

  const fetchEmailTemplates = useCallback(async (
    category?: string
  ): Promise<EmailTemplate[]> => {
    setState(prev => ({ ...prev, isFetching: true, error: null }));

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase configuration is missing. Please check your environment variables.');
      }

      const url = new URL(`${supabaseUrl}/functions/v1/email-templates`);
      if (category) {
        url.searchParams.append('category', category);
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
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
        const supabaseKey = import.meta.env['VITE_SUPABASE_ANON_KEY'];

        if (!supabaseUrl || !supabaseKey) {
          throw new Error('Supabase configuration is missing. Please check your environment variables.');
        }

        yield { type: 'progress', progress: 30, data: 'Connecting to AI service...' };

        const response = await fetch(`${supabaseUrl}/functions/v1/email-composer`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
            'X-Client-Info': 'supabase-js-web'
          },
          body: JSON.stringify({
            contact,
            purpose,
            tone,
            length,
            includeSignature,
            streaming: true
          }),
          signal: streamingControllerRef.current.signal
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(errorData.error || errorData.details || 'Failed to generate email');
        }

        yield { type: 'progress', progress: 70, data: 'Processing AI response...' };

        const result = await response.json();
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

// Fallback message creation for when AI services are unavailable
function createFallbackPersonalizedMessage(
  contact: Contact,
  platform: string,
  purpose: string
): PersonalizedMessage {
  const baseMessage = `Hi ${contact.firstName || 'there'}, I wanted to connect regarding opportunities at ${contact.company || 'your company'}.`;

  const platformLimits = {
    linkedin: { min: 50, max: 3000, ideal: 200 },
    twitter: { min: 1, max: 280, ideal: 120 },
    facebook: { min: 1, max: 63206, ideal: 150 },
    default: { min: 10, max: 1000, ideal: 100 }
  };

  const limits = platformLimits[platform as keyof typeof platformLimits] || platformLimits.default;

  return {
    message: baseMessage,
    platform,
    purpose,
    tone: 'professional',
    characterCount: baseMessage.length,
    characterLimit: limits,
    confidence: 0.5,
    model: 'fallback',
    generatedAt: new Date().toISOString()
  };
}

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