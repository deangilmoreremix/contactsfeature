// AI Contact Enrichment Service - OpenAI & Gemini Integration
import { httpClient } from './http-client.service';
import { logger } from './logger.service';
import apiConfig from '../config/api.config';

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
  // New Multimodal fields
  inferredPersonalityTraits?: Record<string, string>;
  communicationStyle?: string;
  professionalDemeanor?: string;
  imageAnalysisNotes?: string;
}

export interface AIProvider {
  name: 'openai' | 'gemini';
  enabled: boolean;
  apiKey?: string;
}

class AIEnrichmentService {
  private apiUrl: string;
  private isMockMode = import.meta.env.DEV || import.meta.env.VITE_ENV === 'development';
  private openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY;
  private geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY;

  constructor() {
    // Get Supabase URL and anon key from environment
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
    
    if (!supabaseUrl || !supabaseKey) {
      console.warn('Supabase environment variables not defined, using fallback mode');
      this.apiUrl = apiConfig.dataProcessing.enrichment.baseURL;
      this.isMockMode = true;
    } else {
      this.apiUrl = `${supabaseUrl}/functions/v1/ai-enrichment`; 
      console.log('Using AI Enrichment Edge Function URL:', this.apiUrl); 
      // When using Supabase Edge Functions, we don't need client-side API keys
      // The Edge Functions handle the AI provider keys server-side
      this.isMockMode = false;
    }
  }

  private providers: AIProvider[] = [
    { name: 'openai', enabled: !!this.openaiApiKey, apiKey: this.openaiApiKey },
    { name: 'gemini', enabled: !!this.geminiApiKey, apiKey: this.geminiApiKey },
  ];

  async enrichContactByEmail(email: string): Promise<ContactEnrichmentData> {
    logger.info(`Enriching contact by email: ${email}`);
    
    // Check if any providers are configured before making the request
    if (!this.hasConfiguredProviders()) {
      logger.warn(`No AI providers configured for email enrichment: ${email}`);
      return this.generateMockData({ email });
    }
    
    try {
      const response = await httpClient.post<ContactEnrichmentData>(
        this.apiUrl,
        { 
          authorization: 'anon-key',
          contactId: 'client-enrichment-request',
          enrichmentRequest: { email },
          type: 'email'
        },
        {
          timeout: 30000,
          retries: 2,
          headers: {
            'Authorization': `Bearer ${this.isMockMode ? '' : import.meta.env.VITE_SUPABASE_ANON_KEY}`
          }
        }
      );
      
      logger.info(`Contact enriched successfully by email`);
      return response.data;
    } catch (error) {
      logger.error('Contact enrichment by email failed', error as Error);
      // Return graceful fallback data instead of throwing error
      return this.generateMockData({ email });
    }
  }

  async enrichContactByName(firstName: string, lastName: string, company?: string): Promise<ContactEnrichmentData> {
    logger.info(`Enriching contact by name: ${firstName} ${lastName} ${company ? `at ${company}` : ''}`);
    
    // Check if any providers are configured before making the request
    if (!this.hasConfiguredProviders()) {
      logger.warn(`No AI providers configured for name enrichment: ${firstName} ${lastName}`);
      return this.generateMockData({ firstName, lastName, company });
    }
    
    try {
      const response = await httpClient.post<ContactEnrichmentData>(
        this.apiUrl,
        { 
          contactId: 'client-enrichment-request',
          enrichmentRequest: { firstName, lastName, company },
          type: 'name'
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
      // Return graceful fallback data instead of throwing error
      return this.generateMockData({ firstName, lastName, company });
    }
  }

  async enrichContactByLinkedIn(linkedinUrl: string): Promise<ContactEnrichmentData> {
    logger.info(`Enriching contact by LinkedIn URL: ${linkedinUrl}`);
    
    // Check if any providers are configured before making the request
    if (!this.hasConfiguredProviders()) {
      logger.warn(`No AI providers configured for LinkedIn enrichment: ${linkedinUrl}`);
      return this.generateMockData({ linkedinUrl });
    }
    
    try {
      const response = await httpClient.post<ContactEnrichmentData>(
        this.apiUrl,
        { 
          contactId: 'client-enrichment-request',
          enrichmentRequest: { linkedinUrl },
          type: 'linkedin'
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
      // Return graceful fallback data instead of throwing error
      return this.generateMockData({ linkedinUrl });
    }
  }

  // New method for multimodal enrichment
  async enrichContactMultimodal(contact: any, imageUrl: string): Promise<ContactEnrichmentData> {
    logger.info(`Enriching contact multimodal: ${contact.name}, Image: ${imageUrl}`);

    if (!this.hasConfiguredProviders()) {
      logger.warn(`No AI providers configured for multimodal enrichment: ${contact.name}`);
      return this.generateMockMultimodalData(contact);
    }

    if (!imageUrl) {
      throw new Error('Image URL is required for multimodal enrichment');
    }

    try {
      const response = await httpClient.post<ContactEnrichmentData>(
        this.apiUrl,
        {
          contactId: contact.id,
          enrichmentRequest: { contact, imageUrl },
          type: 'multimodal'
        },
        {
          timeout: 60000, // Increased timeout for multimodal
          retries: 1 // Multimodal can be complex, less aggressive retries
        }
      );

      logger.info(`Contact enriched successfully with multimodal data`);
      return response.data;
    } catch (error) {
      logger.error('Contact multimodal enrichment failed', error as Error);
      return this.generateMockMultimodalData(contact); // Fallback
    }
  }

  async findContactImage(name: string, company?: string): Promise<string> {
    logger.info(`Finding contact image for: ${name}${company ? ` at ${company}` : ''}`);
    
    // Check if any providers are configured before making the request
    if (!this.hasConfiguredProviders()) {
      logger.warn(`No AI providers configured for image search: ${name}`);
      // Return a default avatar
      return 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2';
    }
    
    try {
      // For Supabase Edge Functions, construct the full URL
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase configuration missing');
      }
      
      const url = `${supabaseUrl}/functions/v1/ai-enrichment`;
      console.log('Calling image search function:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`
        },
        body: JSON.stringify({
          contactId: 'client-enrichment-request',
          enrichmentRequest: { name, company },
          type: 'image'
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Edge function error:', response.status, errorText);
        throw new Error(`Edge function error: ${response.status} ${errorText}`);
      }
      
      const result = await response.json();
      
      logger.info(`Found contact image successfully`);
      return result.imageUrl || result.avatar || 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2';
    } catch (error) {
      logger.error('Finding contact image failed', error as Error);
      
      // Return a default avatar from Pexels if the API call fails
      return 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2';
    }
  }

  async bulkEnrichContacts(contacts: Array<{email?: string, name?: string, company?: string}>): Promise<ContactEnrichmentData[]> {
    logger.info(`Bulk enriching ${contacts.length} contacts`);
    
    // Check if any providers are configured before making the request
    if (!this.hasConfiguredProviders()) {
      logger.warn(`No AI providers configured for bulk enrichment of ${contacts.length} contacts`);
      // Generate mock data for each contact
      return contacts.map(contact => this.generateMockData(contact));
    }
    
    try {
      const response = await httpClient.post<ContactEnrichmentData[]>(
        this.apiUrl,
        {
          contactId: 'client-bulk-enrichment-request',
          contacts,
          type: 'bulk',
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
      // Generate mock data for each contact
      return contacts.map(contact => this.generateMockData(contact));
    }
  }

  // Check if there are any configured providers
  private hasConfiguredProviders(): boolean {
    // When using Supabase Edge Functions, we don't check client-side API keys
    // The Edge Functions handle AI provider authentication server-side
    if (!this.isMockMode) {
      return true; // Assume providers are configured in Edge Functions
    }
    
    // Only check client-side API keys when in mock mode
    return this.providers.some(p => p.enabled && p.apiKey && p.apiKey.length > 0);
  }

  // Get an available provider, or return a default if none are configured
  private getAvailableProvider(): string {
    const enabledProviders = this.providers.filter(p => p.enabled);
    
    if (enabledProviders.length === 0) {
      logger.warn('No AI providers are configured. Using fallback mode.');
      return 'fallback';
    }
    
    return enabledProviders[0].name;
  }

  // Generate mock data when API enrichment is not available
  private generateMockData(data: any): ContactEnrichmentData {
    logger.info('Generating mock enrichment data for fallback', { isMockMode: this.isMockMode });
    
    let mockData: ContactEnrichmentData = {
      confidence: 30,
      notes: this.isMockMode 
        ? 'API enrichment unavailable. Using estimated data. To enable AI features, please set up API keys for OpenAI or Gemini.'
        : 'Using estimated data based on available information.'
    };
    
    if (data.email) {
      // Extract data from email
      const [username, domain] = data.email.split('@');
      const nameParts = username.split('.');
      
      mockData = {
        ...mockData,
        firstName: nameParts[0] ? this.capitalize(nameParts[0]) : '',
        lastName: nameParts[1] ? this.capitalize(nameParts[1]) : '',
        email: data.email,
        company: domain && domain.split('.')[0] ? this.capitalize(domain.split('.')[0]) : '',
        socialProfiles: {
          linkedin: data.linkedinUrl || `https://linkedin.com/in/${username.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
          website: `https://${domain}`
        }
      };
    } else if (data.firstName || data.lastName) {
      // Use provided name data
      mockData = {
        ...mockData,
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        name: `${data.firstName || ''} ${data.lastName || ''}`.trim(),
        company: data.company || 'Unknown Company',
        email: data.email || this.generateMockEmail(data.firstName, data.lastName, data.company),
        socialProfiles: {
          linkedin: data.linkedinUrl || `https://linkedin.com/in/${(data.firstName || '').toLowerCase().replace(/[^a-z0-9]/g, '-')}${
            data.lastName ? `-${(data.lastName || '').toLowerCase().replace(/[^a-z0-9]/g, '-')}` : ''}`,
        }
      };
    } else if (data.linkedinUrl) {
      // Extract name from LinkedIn URL if possible
      const urlPath = data.linkedinUrl.split('/in/')[1] || '';
      const nameParts = urlPath.split('-');
      
      mockData = {
        ...mockData,
        firstName: nameParts[0] ? this.capitalize(nameParts[0]) : 'Unknown',
        lastName: nameParts[1] ? this.capitalize(nameParts[1]) : '',
        socialProfiles: {
          linkedin: data.linkedinUrl
        }
      };
    }
    
    return mockData;
  }

  // Generate mock multimodal data when API enrichment is not available
  private generateMockMultimodalData(contact: any): ContactEnrichmentData {
    logger.info('Generating mock multimodal enrichment data for fallback');

    // Generate realistic personality traits based on title and industry
    const personalityTraits: Record<string, string> = {};
    
    if (contact.title) {
      const title = contact.title.toLowerCase();
      if (title.includes('ceo') || title.includes('founder')) {
        personalityTraits.extroversion = 'high';
        personalityTraits.conscientiousness = 'high';
        personalityTraits.openness = 'high';
      } else if (title.includes('director') || title.includes('vp')) {
        personalityTraits.extroversion = 'medium';
        personalityTraits.conscientiousness = 'high';
        personalityTraits.openness = 'medium';
      } else if (title.includes('engineer') || title.includes('developer')) {
        personalityTraits.extroversion = 'medium';
        personalityTraits.conscientiousness = 'high';
        personalityTraits.openness = 'high';
      } else {
        personalityTraits.extroversion = 'medium';
        personalityTraits.conscientiousness = 'medium';
        personalityTraits.openness = 'medium';
      }
    }

    // Generate communication style based on inferred traits
    let communicationStyle = 'Professional and collaborative';
    if (personalityTraits.extroversion === 'high') {
      communicationStyle = 'Direct and confident';
    } else if (personalityTraits.extroversion === 'low') {
      communicationStyle = 'Thoughtful and reserved';
    }

    // Generate professional demeanor
    let professionalDemeanor = 'Approachable and business-focused';
    if (contact.industry === 'Technology') {
      professionalDemeanor = 'Innovation-oriented and detail-focused';
    } else if (contact.industry === 'Finance') {
      professionalDemeanor = 'Analytical and results-driven';
    }

    return {
      ...contact,
      inferredPersonalityTraits: personalityTraits,
      communicationStyle,
      professionalDemeanor,
      imageAnalysisNotes: 'Mock analysis: Professional appearance with confident posture. Suggests good communication skills and leadership qualities.',
      confidence: 45,
      notes: (contact.notes || '') + '\n\nMultimodal AI enrichment completed (mock data). To enable real multimodal analysis, please configure OpenAI or Gemini API keys.'
    };
  }

  // Utility functions for mock data generation
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }
  
  private generateMockEmail(firstName?: string, lastName?: string, company?: string): string {
    const first = firstName || 'contact';
    const last = lastName || 'person';
    const domain = company ? `${company.toLowerCase().replace(/\s+/g, '')}.com` : 'company.com';
    return `${first.toLowerCase()}.${last.toLowerCase()}@${domain}`;
  }
}

export const aiEnrichmentService = new AIEnrichmentService();