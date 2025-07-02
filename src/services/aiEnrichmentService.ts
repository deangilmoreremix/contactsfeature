// AI Contact Enrichment Service - OpenAI & Gemini Integration
import { httpClient } from './http-client.service';
import { logger } from './logger.service';

export interface ContactEnrichmentData {
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  phone?: string;
  title?: string;
  company?: string;
  industry?: string;
  location?: {
    city?: string;
    state?: string;
    country?: string;
  };
  socialProfiles?: {
    linkedin?: string;
    twitter?: string;
    facebook?: string;
    website?: string;
  };
  avatar?: string;
  bio?: string;
  notes?: string;
  confidence?: number;
}

export interface AIProvider {
  name: 'openai' | 'gemini';
  enabled: boolean;
  apiKey?: string;
}

class AIEnrichmentService {
  private apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
  private openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY;
  private geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY;

  private providers: AIProvider[] = [
    { name: 'openai', enabled: !!this.openaiApiKey, apiKey: this.openaiApiKey },
    { name: 'gemini', enabled: !!this.geminiApiKey, apiKey: this.geminiApiKey }
  ];

  async enrichContactByEmail(email: string): Promise<ContactEnrichmentData> {
    logger.info(`Enriching contact by email: ${email}`);
    
    try {
      const response = await httpClient.post<ContactEnrichmentData>(
        `${this.apiUrl}/ai/enrich`,
        { 
          enrichmentRequest: { email },
          provider: this.getAvailableProvider()
        },
        {
          timeout: 30000,
          retries: 2
        }
      );
      
      logger.info(`Contact enriched successfully by email`);
      return response.data;
    } catch (error) {
      logger.error('Contact enrichment by email failed', error as Error);
      throw error;
    }
  }

  async enrichContactByName(firstName: string, lastName: string, company?: string): Promise<ContactEnrichmentData> {
    logger.info(`Enriching contact by name: ${firstName} ${lastName} ${company ? `at ${company}` : ''}`);
    
    try {
      const response = await httpClient.post<ContactEnrichmentData>(
        `${this.apiUrl}/ai/enrich`,
        { 
          enrichmentRequest: { firstName, lastName, company },
          provider: this.getAvailableProvider()
        },
        {
          timeout: 30000,
          retries: 2
        }
      );
      
      logger.info(`Contact enriched successfully by name`);
      return response.data;
    } catch (error) {
      logger.error('Contact enrichment by name failed', error as Error);
      throw error;
    }
  }

  async enrichContactByLinkedIn(linkedinUrl: string): Promise<ContactEnrichmentData> {
    logger.info(`Enriching contact by LinkedIn URL: ${linkedinUrl}`);
    
    try {
      const response = await httpClient.post<ContactEnrichmentData>(
        `${this.apiUrl}/ai/enrich`,
        { 
          enrichmentRequest: { linkedinUrl },
          provider: this.getAvailableProvider()
        },
        {
          timeout: 30000,
          retries: 2
        }
      );
      
      logger.info(`Contact enriched successfully by LinkedIn`);
      return response.data;
    } catch (error) {
      logger.error('Contact enrichment by LinkedIn failed', error as Error);
      throw error;
    }
  }

  async findContactImage(name: string, company?: string): Promise<string> {
    logger.info(`Finding contact image for: ${name}${company ? ` at ${company}` : ''}`);
    
    try {
      const response = await httpClient.post<{ imageUrl: string }>(
        `${this.apiUrl}/ai/find-image`,
        { 
          name,
          company,
          provider: this.getAvailableProvider()
        },
        {
          timeout: 15000,
          retries: 1
        }
      );
      
      logger.info(`Found contact image successfully`);
      return response.data.imageUrl;
    } catch (error) {
      logger.error('Finding contact image failed', error as Error);
      
      // Return a default avatar from Pexels if the API call fails
      return 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2';
    }
  }

  async bulkEnrichContacts(contacts: Array<{email?: string, name?: string, company?: string}>): Promise<ContactEnrichmentData[]> {
    logger.info(`Bulk enriching ${contacts.length} contacts`);
    
    try {
      const response = await httpClient.post<ContactEnrichmentData[]>(
        `${this.apiUrl}/ai/enrich/bulk`,
        {
          contacts,
          provider: this.getAvailableProvider(),
          options: {
            maxConcurrency: 5,
            timeout: 60000
          }
        },
        {
          timeout: 120000,
          retries: 2
        }
      );
      
      logger.info(`Successfully bulk enriched ${response.data.length} contacts`);
      return response.data;
    } catch (error) {
      logger.error('Bulk contact enrichment failed', error as Error);
      throw error;
    }
  }

  private getAvailableProvider(): string {
    const enabledProviders = this.providers.filter(p => p.enabled);
    
    if (enabledProviders.length === 0) {
      throw new Error('No AI providers are configured. Please set up API keys for OpenAI or Gemini.');
    }
    
    return enabledProviders[0].name;
  }

  // For backward compatibility during transition
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }
  
  private generateMockEmail(firstName?: string, lastName?: string, company?: string): string {
    const first = firstName || 'contact';
    const last = lastName || 'person';
    const domain = company ? `${company.toLowerCase().replace(/\s+/g, '')}.com` : 'company.com';
    return `${first.toLowerCase()}.${last.toLowerCase()}@${domain}`;
  }
  
  private generateMockPhone(): string {
    return `+1-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`;
  }
}

export const aiEnrichmentService = new AIEnrichmentService();