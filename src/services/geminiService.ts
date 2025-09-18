// Gemini AI service for contact research and enhancement
import { ContactEnrichmentData } from './aiEnrichmentService';
import { logger } from './logger.service';

class GeminiAIService {
  private apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
  private model = 'gemini-1.5-flash:generateContent';

  setApiKey(key: string) {
    // API key is now handled server-side in Netlify functions
  }

  async researchContactByName(firstName: string, lastName: string, company?: string): Promise<ContactEnrichmentData> {
    logger.info(`Researching contact via Netlify function: ${firstName} ${lastName} ${company ? `at ${company}` : ''}`);

    try {
      const response = await fetch('/.netlify/functions/gemini-contact-research', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          firstName,
          lastName,
          company,
          researchType: 'basic'
        })
      });

      if (!response.ok) {
        throw new Error(`Netlify function error: ${response.statusText}`);
      }

      const result = await response.json();

      logger.info(`Successfully researched contact via Netlify function: ${firstName} ${lastName}`);

      return {
        ...result,
        confidence: result.confidence || 60
      };
    } catch (error) {
      logger.error('Gemini research via Netlify function failed', error as Error);

      // Return minimal data to prevent UI breakage
      return {
        firstName,
        lastName,
        name: `${firstName} ${lastName}`,
        company: company || '',
        confidence: 30,
        notes: 'API research failed, showing basic information'
      };
    }
  }

  async researchContactByLinkedIn(linkedinUrl: string): Promise<ContactEnrichmentData> {
    logger.info(`Researching LinkedIn profile via Netlify function: ${linkedinUrl}`);

    try {
      const response = await fetch('/.netlify/functions/gemini-contact-research', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          linkedinUrl,
          researchType: 'detailed'
        })
      });

      if (!response.ok) {
        throw new Error(`Netlify function error: ${response.statusText}`);
      }

      const result = await response.json();

      return {
        ...result,
        socialProfiles: {
          ...result.socialProfiles,
          linkedin: linkedinUrl
        },
        confidence: result.confidence || 75
      };
    } catch (error) {
      logger.error('LinkedIn profile research via Netlify function failed', error as Error);

      // Parse username from LinkedIn URL
      const username = linkedinUrl.split('/in/')[1]?.replace('/', '') || 'unknown';
      const nameParts = username.split('-');

      // Return minimal data to prevent UI breakage
      return {
        firstName: nameParts[0] ? nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1) : 'Unknown',
        lastName: nameParts[1] ? nameParts[1].charAt(0).toUpperCase() + nameParts[1].slice(1) : '',
        name: `${nameParts[0] ? nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1) : 'Unknown'} ${nameParts[1] ? nameParts[1].charAt(0).toUpperCase() + nameParts[1].slice(1) : ''}`,
        socialProfiles: {
          linkedin: linkedinUrl
        },
        confidence: 40,
        notes: 'API research failed, showing basic information derived from URL'
      };
    }
  }

  async generatePersonalizedMessage(contact: any, messageType: 'email' | 'linkedin' | 'cold-outreach'): Promise<string> {
    logger.info(`Generating ${messageType} message for ${contact.name} via Netlify function`);

    try {
      // For now, use the email template function for message generation
      const response = await fetch('/.netlify/functions/openai-email-template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contact,
          purpose: messageType,
          templateType: 'creative'
        })
      });

      if (!response.ok) {
        throw new Error(`Netlify function error: ${response.statusText}`);
      }

      const result = await response.json();
      return result.body || result.subject;
    } catch (error) {
      logger.error('Message generation via Netlify function failed', error as Error);

      // Return a fallback message
      const templates = {
        email: `Hi ${contact.firstName || contact.name?.split(' ')[0]},\n\nI hope this message finds you well. I noticed your profile and was impressed by your work at ${contact.company}.\n\nI'd love to connect and discuss how we might be able to help with your current initiatives.\n\nBest regards,\n[Your Name]`,
        linkedin: `Hi ${contact.firstName || contact.name?.split(' ')[0]}, I noticed we share interests in ${contact.industry || 'your industry'}. Your experience at ${contact.company} is impressive! I'd love to connect.`,
        'cold-outreach': `Hello ${contact.firstName || contact.name?.split(' ')[0]},\n\nI hope this message finds you well. I've been researching leaders in ${contact.industry || 'your industry'} and your work at ${contact.company} caught my attention.\n\nI'd love to schedule a brief call to discuss how we might be able to help with your goals.\n\nBest,\n[Your Name]`
      };

      return templates[messageType];
    }
  }
}

export const geminiService = new GeminiAIService();