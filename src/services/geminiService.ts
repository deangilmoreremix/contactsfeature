// Gemini AI service for contact research and enhancement
import { ContactEnrichmentData } from './aiEnrichmentService';
import { logger } from './logger.service';

class GeminiAIService {
  private apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  private apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
  private model = 'gemini-1.5-flash:generateContent';

  setApiKey(key: string) {
    this.apiKey = key;
  }

  async researchContactByName(firstName: string, lastName: string, company?: string): Promise<ContactEnrichmentData> {
    logger.info(`Researching contact with Gemini: ${firstName} ${lastName} ${company ? `at ${company}` : ''}`);
    
    if (!this.apiKey) {
      throw new Error('Gemini API key is not configured. Please set the VITE_GEMINI_API_KEY environment variable.');
    }
    
    try {
      const response = await fetch(`${this.apiUrl}/${this.model}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Research information about a professional named ${firstName} ${lastName}${company ? ` who works at ${company}` : ''}.
              
              Return a JSON object with the following structure:
              {
                "firstName": "${firstName}",
                "lastName": "${lastName}",
                "name": "${firstName} ${lastName}",
                "email": "likely email",
                "phone": "likely phone if available",
                "title": "likely job title",
                "company": "${company || 'company name if known'}",
                "industry": "likely industry",
                "location": {
                  "city": "likely city",
                  "state": "likely state",
                  "country": "likely country"
                },
                "socialProfiles": {
                  "linkedin": "likely LinkedIn URL",
                  "twitter": "likely Twitter URL if available",
                  "website": "likely company website"
                },
                "bio": "brief professional bio",
                "confidence": "number between 40 and 85 indicating confidence level"
              }`
            }]
          }],
          generationConfig: {
            temperature: 0.2,
            topK: 32,
            topP: 0.8,
            maxOutputTokens: 1024
          }
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Gemini API error: ${errorData.error?.message || response.statusText}`);
      }
      
      const data = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!content) {
        throw new Error('Invalid response from Gemini');
      }
      
      try {
        // Extract JSON from the response text
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('No JSON found in response');
        }
        
        const parsedData = JSON.parse(jsonMatch[0]);
        logger.info(`Successfully researched contact: ${firstName} ${lastName}`);
        
        return {
          ...parsedData,
          confidence: parsedData.confidence || 60
        };
      } catch (parseError) {
        logger.error('Failed to parse Gemini response', parseError as Error);
        throw new Error('Failed to parse research response');
      }
    } catch (error) {
      logger.error('Gemini research failed', error as Error);
      
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
    logger.info(`Researching LinkedIn profile: ${linkedinUrl}`);
    
    if (!this.apiKey) {
      throw new Error('Gemini API key is not configured');
    }
    
    try {
      const response = await fetch(`${this.apiUrl}/${this.model}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Research a professional from this LinkedIn URL: ${linkedinUrl}.
              
              Return a JSON object with the following structure:
              {
                "firstName": "first name",
                "lastName": "last name",
                "name": "full name",
                "email": "likely email based on name and company",
                "title": "job title",
                "company": "company name",
                "industry": "industry",
                "location": {
                  "city": "city",
                  "state": "state",
                  "country": "country"
                },
                "socialProfiles": {
                  "linkedin": "${linkedinUrl}",
                  "twitter": "likely Twitter URL if available",
                  "website": "likely company website"
                },
                "bio": "professional summary",
                "confidence": "number between 50 and 90 indicating confidence level"
              }`
            }]
          }],
          generationConfig: {
            temperature: 0.2,
            topK: 32,
            topP: 0.8,
            maxOutputTokens: 1024
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }
      
      const data = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      // Extract JSON from the response text
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const parsedData = JSON.parse(jsonMatch[0]);
      
      return {
        ...parsedData,
        socialProfiles: {
          ...parsedData.socialProfiles,
          linkedin: linkedinUrl
        },
        confidence: parsedData.confidence || 75
      };
    } catch (error) {
      logger.error('LinkedIn profile research failed', error as Error);
      
      // Parse username from LinkedIn URL
      const username = linkedinUrl.split('/in/')[1]?.replace('/', '') || 'unknown';
      const nameParts = username.split('-');
      
      // Return minimal data to prevent UI breakage
      return {
        firstName: nameParts[0]?.charAt(0).toUpperCase() + nameParts[0]?.slice(1) || 'Unknown',
        lastName: nameParts[1]?.charAt(0).toUpperCase() + nameParts[1]?.slice(1) || '',
        name: `${nameParts[0]?.charAt(0).toUpperCase() + nameParts[0]?.slice(1) || 'Unknown'} ${nameParts[1]?.charAt(0).toUpperCase() + nameParts[1]?.slice(1) || ''}`,
        socialProfiles: {
          linkedin: linkedinUrl
        },
        confidence: 40,
        notes: 'API research failed, showing basic information derived from URL'
      };
    }
  }

  async generatePersonalizedMessage(contact: any, messageType: 'email' | 'linkedin' | 'cold-outreach'): Promise<string> {
    logger.info(`Generating ${messageType} message for ${contact.name}`);
    
    if (!this.apiKey) {
      throw new Error('Gemini API key is not configured');
    }
    
    try {
      const response = await fetch(`${this.apiUrl}/${this.model}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Generate a personalized ${messageType} message for a contact with the following information:
              ${JSON.stringify(contact, null, 2)}
              
              The message should be professional, concise, and tailored to their industry and role.`
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.candidates[0].content.parts[0].text;
    } catch (error) {
      logger.error('Message generation failed', error as Error);
      
      // Return a fallback message
      const templates = {
        email: `Hi ${contact.firstName || contact.name.split(' ')[0]},\n\nI hope this message finds you well. I noticed your profile and was impressed by your work at ${contact.company}.\n\nI'd love to connect and discuss how we might be able to help with your current initiatives.\n\nBest regards,\n[Your Name]`,
        linkedin: `Hi ${contact.firstName || contact.name.split(' ')[0]}, I noticed we share interests in ${contact.industry || 'your industry'}. Your experience at ${contact.company} is impressive! I'd love to connect.`,
        'cold-outreach': `Hello ${contact.firstName || contact.name.split(' ')[0]},\n\nI hope this message finds you well. I've been researching leaders in ${contact.industry || 'your industry'} and your work at ${contact.company} caught my attention.\n\nI'd love to schedule a brief call to discuss how we might be able to help with your goals.\n\nBest,\n[Your Name]`
      };
      
      return templates[messageType];
    }
  }
}

export const geminiService = new GeminiAIService();