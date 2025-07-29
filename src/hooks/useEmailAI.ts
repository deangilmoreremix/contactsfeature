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
      // Get Supabase URL and key from environment
      // Use environment variables or fallback
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
      
      if (!supabaseUrl || !supabaseKey) {
        console.warn('Supabase environment variables not defined, using fallback mode');
        
        // Create fallback response
        const fallbackResponse = createFallbackEmailResponse(contact, purpose);
        
        setState(prev => ({
          ...prev,
          isGenerating: false,
          emailComposition: fallbackResponse
        }));
        
        return fallbackResponse;
      }
      
      // Call the Supabase Edge Function
      const response = await fetch(`${supabaseUrl}/functions/v1/email-composer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`
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
        const errorText = await response.text();
        throw new Error(`Failed to generate email: ${errorText}`);
      }
      
      const result = await response.json();
      
      setState(prev => ({
        ...prev,
        isGenerating: false,
        emailComposition: result
      }));
      
      logger.info('Email generated successfully', {
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
      
      // Return fallback response
      const fallbackResponse = createFallbackEmailResponse(contact, purpose);
      return fallbackResponse;
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
      // Get Supabase URL and key from environment
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
      
      if (!supabaseUrl || !supabaseKey) {
        console.warn('Supabase environment variables not defined, using fallback mode');
        
        // Create fallback analysis
        const fallbackAnalysis = createFallbackEmailAnalysis(emailSubject, emailBody);
        
        setState(prev => ({
          ...prev,
          isAnalyzing: false,
          emailAnalysis: fallbackAnalysis
        }));
        
        return fallbackAnalysis;
      }
      
      // Call the Supabase Edge Function
      const response = await fetch(`${supabaseUrl}/functions/v1/email-analyzer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`
        },
        body: JSON.stringify({
          emailSubject,
          emailBody,
          context,
          recipient
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to analyze email: ${errorText}`);
      }
      
      const result = await response.json();
      
      setState(prev => ({
        ...prev,
        isAnalyzing: false,
        emailAnalysis: result
      }));
      
      logger.info('Email analyzed successfully', {
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
      
      // Return fallback analysis
      const fallbackAnalysis = createFallbackEmailAnalysis(emailSubject, emailBody);
      return fallbackAnalysis;
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
      // Get Supabase URL and key from environment
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        console.warn('Supabase environment variables not defined, using fallback mode');
        
        // Return fallback templates
        const fallbackTemplates = getMockTemplates(category);
        
        setState(prev => ({
          ...prev,
          isFetching: false,
          emailTemplates: fallbackTemplates
        }));
        
        return fallbackTemplates;
      }
      
      // Build URL with query parameters
      const url = new URL(`${supabaseUrl}/functions/v1/email-templates`);
      if (category) {
        url.searchParams.append('category', category);
      }
      
      // Call the Supabase Edge Function
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`
        }
      });
      
      if (!response.ok) {
        let errorData = { error: `HTTP error ${response.status}` };
        try {
          errorData = await response.json();
        } catch (e) {
          // If we can't parse JSON, use status text
          errorData = { error: response.statusText };
        }
        throw new Error(`Failed to fetch email templates: ${errorData}`);
      }
      
      const result = await response.json();
      const templates = result.templates || [];
      
      setState(prev => ({
        ...prev,
        isFetching: false,
        emailTemplates: templates
      }));
      
      logger.info('Email templates fetched successfully', {
        count: templates.length,
        category
      });
      
      return templates;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch email templates';
      
      setState(prev => ({
        ...prev,
        isFetching: false,
        error: errorMessage
      }));
      
      logger.error('Email template fetching failed', error as Error);
      
      // Return fallback templates
      const fallbackTemplates = getMockTemplates(category);
      return fallbackTemplates;
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

// Helper functions for fallback responses

function createFallbackEmailResponse(contact: Contact, purpose: string): EmailComposition {
  const firstName = contact.firstName || contact.name.split(' ')[0];
  const company = contact.company;
  
  let subject = '';
  let body = '';
  
  // Generate subject and body based on purpose
  switch (purpose) {
    case 'introduction':
      subject = `Introduction from [Your Company] to ${company}`;
      body = `Hi ${firstName},\n\nI hope this email finds you well. I'm reaching out because I saw your work at ${company} and thought there might be an opportunity for us to collaborate.\n\nAt [Your Company], we help professionals like you in the ${contact.industry || 'industry'} to overcome common challenges through our innovative solutions.\n\nI'd love to learn more about your current initiatives and explore how we might be able to support your goals. Would you be open to a brief 15-minute call next week?\n\nBest regards,\n[Your Name]\n[Your Title]\n[Your Company]`;
      break;
      
    case 'follow-up':
      subject = `Following up on our conversation, ${firstName}`;
      body = `Hi ${firstName},\n\nI hope you're doing well. I wanted to follow up on our previous conversation about how we could help ${company} with your current challenges.\n\nHave you had a chance to review the information I sent? I'm happy to answer any questions you might have or provide additional details.\n\nWould it be helpful to schedule a call to discuss this further?\n\nBest regards,\n[Your Name]\n[Your Title]\n[Your Company]`;
      break;
      
    case 'proposal':
      subject = `Proposal for ${company}`;
      body = `Hi ${firstName},\n\nThank you for the opportunity to present this proposal for ${company}.\n\nBased on our discussions about your needs, I've attached a comprehensive proposal that addresses the key points we discussed. Our solution is designed to help you improve efficiency while ensuring quality and reliability.\n\nI'd be happy to walk through the details with you and answer any questions you might have. Would you be available for a call later this week?\n\nBest regards,\n[Your Name]\n[Your Title]\n[Your Company]\n[Your Contact Information]`;
      break;
      
    case 'meeting-request':
      subject = `Meeting request: ${company} and [Your Company]`;
      body = `Hi ${firstName},\n\nI hope this email finds you well. I'd like to schedule a meeting to discuss how we can help ${company} with your current initiatives.\n\nOur team has worked with several companies in the ${contact.industry || 'industry'} to help them improve their operations and achieve their goals.\n\nWould you be available for a 30-minute call next Tuesday or Wednesday afternoon? If those times don't work, please let me know your availability and I'll be happy to accommodate your schedule.\n\nBest regards,\n[Your Name]\n[Your Title]\n[Your Company]`;
      break;
      
    default:
      subject = `Connecting with ${company}`;
      body = `Hi ${firstName},\n\nI hope this email finds you well. I wanted to reach out regarding your work at ${company} and how we might be able to support your initiatives.\n\nOur team specializes in helping companies like yours to overcome challenges and achieve your goals through innovative solutions tailored to your specific needs.\n\nI'd welcome the opportunity to learn more about your current projects and discuss how we might be able to collaborate.\n\nBest regards,\n[Your Name]\n[Your Title]\n[Your Company]`;
  }
  
  return {
    subject,
    body,
    purpose,
    tone: 'professional',
    confidence: 75,
    model: 'fallback-model'
  };
}

function createFallbackEmailAnalysis(subject: string, body: string): EmailAnalysis {
  // Simple analysis calculations
  const wordCount = body.split(/\s+/).length;
  const sentenceCount = body.split(/[.!?]+/).filter(Boolean).length;
  const avgSentenceLength = Math.round(wordCount / Math.max(1, sentenceCount));
  const paragraphCount = body.split(/\n\s*\n/).filter(Boolean).length;
  
  // Simple tone analysis
  const toneAnalysis = {
    formal: 25,
    friendly: 40,
    persuasive: 20,
    urgent: 5,
    informative: 10
  };
  
  // Basic improvements
  const improvements = [];
  
  if (wordCount > 300) improvements.push({ type: 'issue', description: 'Email is too long (over 300 words)' });
  if (avgSentenceLength > 25) improvements.push({ type: 'issue', description: 'Sentences are too long' });
  if (paragraphCount < 3) improvements.push({ type: 'suggestion', description: 'Consider adding more paragraphs for readability' });
  if (!body.includes('?')) improvements.push({ type: 'suggestion', description: 'Consider adding a question to encourage response' });
  
  // Simple quality score
  let qualityScore = 70; // Base score
  qualityScore -= improvements.length * 5;
  qualityScore = Math.max(0, Math.min(100, qualityScore));
  
  // Response likelihood (simple calculation)
  const responseLikelihood = Math.min(90, Math.max(40, qualityScore + 10));
  
  return {
    metrics: {
      wordCount,
      sentenceCount,
      avgSentenceLength,
      paragraphCount,
      subjectLength: subject.length
    },
    toneAnalysis,
    dominantTone: 'friendly',
    qualityScore,
    responseLikelihood,
    improvements,
    assessment: qualityScore >= 75 
      ? 'Good email with minor areas for improvement' 
      : 'Email could benefit from several improvements for maximum effectiveness',
    confidence: 60,
    model: 'fallback-model'
  };
}

function createFallbackPersonalizedMessage(
  contact: Contact,
  platform: string,
  purpose: string
): PersonalizedMessage {
  const firstName = contact.firstName || contact.name.split(' ')[0];
  
  let message = '';
  let characterLimit = { min: 50, max: 500, ideal: 200 };
  
  // Adjust character limits based on platform
  switch (platform) {
    case 'linkedin':
      characterLimit = { min: 50, max: 1300, ideal: 300 };
      break;
    case 'twitter':
      characterLimit = { min: 10, max: 280, ideal: 240 };
      break;
    case 'sms':
      characterLimit = { min: 10, max: 160, ideal: 120 };
      break;
    case 'whatsapp':
      characterLimit = { min: 10, max: 1000, ideal: 200 };
      break;
    case 'email':
      characterLimit = { min: 100, max: 2000, ideal: 500 };
      break;
  }
  
  // Generate message based on purpose and platform
  switch (purpose) {
    case 'introduction':
      if (platform === 'linkedin' || platform === 'email') {
        message = `Hi ${firstName}, I noticed your work at ${contact.company} and was impressed by your role as ${contact.title}. I'd love to connect and learn more about your experience in the ${contact.industry || 'industry'}.`;
      } else if (platform === 'twitter') {
        message = `Hi ${firstName}! Noticed your work at ${contact.company}. Would love to connect about ${contact.industry || 'your industry'} insights!`;
      } else {
        message = `Hi ${firstName}, I'm [Your Name] from [Company]. Noticed your work at ${contact.company} and would like to connect.`;
      }
      break;
      
    case 'follow-up':
      message = `Hi ${firstName}, just following up on our conversation about ${contact.company}. Let me know if you have any questions or would like to discuss further.`;
      break;
      
    case 'meeting-request':
      message = `Hi ${firstName}, I'd like to schedule a quick meeting to discuss how we might be able to help with your work at ${contact.company}. Would you be available next week?`;
      break;
      
    default:
      message = `Hi ${firstName}, I hope you're doing well. I'd love to connect regarding your work at ${contact.company}.`;
  }
  
  // Ensure message is within character limits
  if (message.length > characterLimit.max) {
    message = message.substring(0, characterLimit.max - 3) + '...';
  }
  
  return {
    message,
    platform,
    purpose,
    tone: 'professional',
    length: 'medium',
    characterCount: message.length,
    characterLimit,
    confidence: 75,
    model: 'fallback-model',
    timestamp: new Date().toISOString()
  };
}

function getMockTemplates(category?: string): EmailTemplate[] {
  const templates = [
    {
      id: "template-1",
      name: "Introduction Email",
      description: "First outreach to a new prospect",
      subject: "Introduction from {{company_name}}",
      body: "Hi {{first_name}},\n\nI hope this email finds you well. I'm reaching out because I believe our solutions at {{company_name}} could help address the challenges you might be facing at {{client_company}}.\n\nWould you be open to a brief call to discuss how we might be able to help?\n\nBest regards,\n{{sender_name}}\n{{sender_title}}\n{{company_name}}",
      variables: ["first_name", "company_name", "client_company", "sender_name", "sender_title"],
      category: "Prospecting",
      isDefault: true
    },
    {
      id: "template-2",
      name: "Follow-up After Meeting",
      description: "Send after initial sales call or meeting",
      subject: "Thank you for your time, {{first_name}}",
      body: "Hi {{first_name}},\n\nThank you for taking the time to meet with me today. I really enjoyed learning more about {{client_company}} and your role there.\n\nAs promised, I'm sending over the additional information about our {{product_name}} that we discussed. I've also included a case study that I think you'll find relevant.\n\nPlease let me know if you have any questions. I'm looking forward to our next conversation.\n\nBest regards,\n{{sender_name}}\n{{sender_title}}\n{{company_name}}",
      variables: ["first_name", "client_company", "product_name", "sender_name", "sender_title", "company_name"],
      category: "Follow-up"
    },
    {
      id: "template-3",
      name: "Proposal Email",
      description: "Email to accompany a formal proposal",
      subject: "{{client_company}} - Proposal for {{solution_type}}",
      body: "Dear {{first_name}},\n\nThank you for the opportunity to present this proposal for {{client_company}}.\n\nBased on our discussions, I've attached a comprehensive proposal that addresses your needs regarding {{pain_point}}. Our solution will help you {{benefit_1}} while ensuring {{benefit_2}}.\n\nThe proposal includes detailed pricing information, implementation timeline, and expected outcomes. I'd be happy to schedule a call to walk through the details and answer any questions you might have.\n\nI look forward to your feedback.\n\nBest regards,\n{{sender_name}}\n{{sender_title}}\n{{company_name}}\n{{sender_phone}}",
      variables: ["first_name", "client_company", "solution_type", "pain_point", "benefit_1", "benefit_2", "sender_name", "sender_title", "company_name", "sender_phone"],
      category: "Proposal"
    },
    {
      id: "template-4",
      name: "Re-engagement Email",
      description: "Reach out to dormant prospects",
      subject: "Checking in - {{client_company}}",
      body: "Hi {{first_name}},\n\nIt's been a while since we last connected, and I wanted to reach out to see how things are going at {{client_company}}.\n\nSince we last spoke, we've launched several new features that I believe would address the {{pain_point}} you mentioned previously. I'd love to share how these updates might benefit your team.\n\nWould you be open to a quick catch-up call in the next couple of weeks?\n\nBest regards,\n{{sender_name}}\n{{sender_title}}\n{{company_name}}",
      variables: ["first_name", "client_company", "pain_point", "sender_name", "sender_title", "company_name"],
      category: "Re-engagement"
    },
    {
      id: "template-5",
      name: "Meeting Request",
      description: "Request a meeting or call",
      subject: "Meeting request: {{topic}}",
      body: "Hi {{first_name}},\n\nI hope this email finds you well. I'd like to schedule a meeting to discuss {{topic}} and how {{company_name}} can help {{client_company}} with {{pain_point}}.\n\nWould you be available for a {{meeting_duration}}-minute call on {{proposed_date_1}} or {{proposed_date_2}}? If those times don't work, please let me know your availability and I'll be happy to accommodate your schedule.\n\nLooking forward to speaking with you.\n\nBest regards,\n{{sender_name}}\n{{sender_title}}\n{{company_name}}\n{{sender_phone}}",
      variables: ["first_name", "topic", "company_name", "client_company", "pain_point", "meeting_duration", "proposed_date_1", "proposed_date_2", "sender_name", "sender_title", "sender_phone"],
      category: "Meeting"
    }
  ];

  // If category is specified, filter templates
  if (category && category !== 'all') {
    return templates.filter(template => template.category === category);
  }
  
  return templates;
}

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