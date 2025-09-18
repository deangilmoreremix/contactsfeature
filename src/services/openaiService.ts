// OpenAI integration service using the latest Responses API for contact research and analysis
import { ContactEnrichmentData } from './aiEnrichmentService';
import { webSearchService, WebSearchOptions } from './webSearchService';
import { logger } from './logger.service';

interface ContactAnalysisResult {
  score: number;
  insights: string[];
  recommendations: string[];
  riskFactors: string[];
  opportunities: string[];
}

export const useOpenAI = () => {
  
  const analyzeContact = async (contact: any): Promise<ContactAnalysisResult> => {
    logger.info(`Analyzing contact via Netlify function: ${contact.name}`);

    try {
      const response = await fetch('/.netlify/functions/openai-contact-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contact,
          analysisType: 'full'
        })
      });

      if (!response.ok) {
        throw new Error(`Netlify function error: ${response.statusText}`);
      }

      const result = await response.json();

      logger.info('Contact analysis via Netlify function completed', {
        contactName: contact.name,
        score: result.score,
        provider: result.provider
      });

      return {
        score: result.score,
        insights: result.insights,
        recommendations: result.recommendations,
        riskFactors: result.riskFactors,
        opportunities: result.opportunities
      };
    } catch (error) {
      logger.error('Contact analysis via Netlify function failed', error as Error);
      // Fallback to a basic analysis to prevent UI breakage
      return {
        score: 50,
        insights: ['Analysis currently unavailable'],
        recommendations: ['Try again later'],
        riskFactors: ['Analysis incomplete'],
        opportunities: []
      };
    }
  };

  const generateEmailTemplate = async (contact: any, purpose: string) => {
    try {
      const response = await fetch('/.netlify/functions/openai-email-template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contact,
          purpose,
          templateType: 'professional'
        })
      });

      if (!response.ok) {
        throw new Error(`Netlify function error: ${response.statusText}`);
      }

      const result = await response.json();

      logger.info('Email template generation via Netlify function completed', {
        contactName: contact.name,
        purpose,
        provider: result.provider
      });

      return {
        subject: result.subject,
        body: result.body
      };
    } catch (error) {
      logger.error('Email template generation via Netlify function failed', error as Error);
      return {
        subject: `Following up on ${purpose} - ${contact.company}`,
        body: `Hi ${contact.firstName || contact.name?.split(' ')[0]},\n\nI hope this email finds you well. I wanted to follow up on our recent conversation regarding ${purpose}.`
      };
    }
  };

  const researchContactByEmail = async (email: string): Promise<ContactEnrichmentData> => {
    logger.info(`Researching contact by email via Netlify function: ${email}`);

    try {
      const response = await fetch('/.netlify/functions/openai-contact-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contact: { email },
          analysisType: 'research'
        })
      });

      if (!response.ok) {
        throw new Error(`Netlify function error: ${response.statusText}`);
      }

      const result = await response.json();

      return {
        ...result,
        email,
        confidence: result.confidence || 70
      };
    } catch (error) {
      logger.error('Contact research by email via Netlify function failed', error as Error);

      // Minimal fallback to prevent UI breakage
      const parts = email.split('@');
      const domain = parts[1] || 'company.com';
      const username = parts[0] || '';
      const nameParts = username.split('.');

      return {
        firstName: nameParts[0] ? nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1) : '',
        lastName: nameParts[1] ? nameParts[1].charAt(0).toUpperCase() + nameParts[1].slice(1) : '',
        email: email,
        company: domain.split('.')[0] || 'Unknown',
        confidence: 30,
        notes: 'API research failed, showing inferred data'
      };
    }
  };

  return {
    analyzeContact,
    generateEmailTemplate,
    researchContactByEmail,
  };
};