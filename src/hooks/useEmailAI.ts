import { useState, useCallback } from 'react';
import { logger } from '../services/logger.service';
import { Contact } from '../types';

interface EmailComposition {
  subject: string;
  body: string;
  purpose: string;
  tone: string;
  confidence: number;
  model: string;
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
  }>;
  assessment: string;
  confidence: number;
  model: string;
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
}

interface EmailAIState {
  isGenerating: boolean;
  isAnalyzing: boolean;
  isFetching: boolean;
  error: string | null;
  emailComposition: EmailComposition | null;
  emailAnalysis: EmailAnalysis | null;
  personalizedMessage: PersonalizedMessage | null;
  emailTemplates: EmailTemplate[];
}

export const useEmailAI = () => {
  const [state, setState] = useState<EmailAIState>({
    isGenerating: false,
    isAnalyzing: false,
    isFetching: false,
    error: null,
    emailComposition: null,
    emailAnalysis: null,
    personalizedMessage: null,
    emailTemplates: []
  });

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
      error: null,
      emailComposition: null,
      emailAnalysis: null,
      personalizedMessage: null,
      emailTemplates: []
    })
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
    return industryPains[Math.floor(Math.random() * industryPains.length)];
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
    return industryBenefits[Math.floor(Math.random() * industryBenefits.length)];
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
    return industryBenefits[Math.floor(Math.random() * industryBenefits.length)];
  }

  return 'reducing operational costs';
}