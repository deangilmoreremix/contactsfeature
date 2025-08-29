// AI Contact Enrichment Service - OpenAI & Gemini Integration
import { logger } from './logger.service';
import { supabase } from './supabaseClient';

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
  enrichmentType?: 'real' | 'mock'; // NEW: Track enrichment type
  isMockData?: boolean; // NEW: Flag for mock data
}

export interface AIProvider {
  name: 'openai' | 'gemini';
  enabled: boolean;
  apiKey?: string;
}

class AIEnrichmentService {
  private openaiApiKey = import.meta.env['VITE_OPENAI_API_KEY'];
  private geminiApiKey = import.meta.env['VITE_GEMINI_API_KEY'];

  constructor() {
    // Log API keys for debugging (without revealing full keys)
    console.log('🔍 AI Enrichment Service - Environment Check:');
    console.log('OpenAI API Key:', this.openaiApiKey ? `${this.openaiApiKey.substring(0, 10)}...` : '❌ Not configured');
    console.log('Gemini API Key:', this.geminiApiKey ? `${this.geminiApiKey.substring(0, 10)}...` : '❌ Not configured');
    console.log('Using Supabase Edge Functions for AI enrichment');
  }

  private providers: AIProvider[] = [
    { name: 'openai', enabled: !!this.openaiApiKey, apiKey: this.openaiApiKey },
    { name: 'gemini', enabled: !!this.geminiApiKey, apiKey: this.geminiApiKey },
  ];

  async enrichContactByEmail(
    email: string,
    options: {
      isMockData?: boolean;
      forceRealAI?: boolean;
      skipIfMock?: boolean;
    } = {}
  ): Promise<ContactEnrichmentData> {
    logger.info(`Enriching contact by email: ${email} (Mock: ${options.isMockData || false})`);

    // Determine enrichment strategy based on data classification
    const shouldUseRealAI = this.shouldUseRealAI(options);
    const shouldSkipEnrichment = options.skipIfMock && options.isMockData;

    if (shouldSkipEnrichment) {
      logger.info(`Skipping enrichment for mock contact: ${email}`);
      return {
        email,
        confidence: 0,
        notes: 'Enrichment skipped for mock data',
        enrichmentType: 'mock',
        isMockData: true
      };
    }

    // Check if any providers are configured before making the request
    if (!this.hasConfiguredProviders()) {
      logger.warn(`No AI providers configured for email enrichment: ${email}`);
      return this.generateMockData({ email }, options.isMockData);
    }

    try {
      const { data, error } = await supabase.functions.invoke('ai-enrichment', {
        body: {
          type: 'email',
          email: email,
          contactId: options.isMockData ? 'mock-enrichment-request' : 'real-enrichment-request',
          useRealAI: shouldUseRealAI,
          isMockData: options.isMockData
        },
        {
          timeout: 30000,
          retries: 2,
          headers: {
            'Authorization': `Bearer ${import.meta.env['VITE_SUPABASE_ANON_KEY']}`
          }
        }
      });

      if (error) {
        throw error;
      }
      logger.info(`Contact enriched successfully by email (${shouldUseRealAI ? 'real AI' : 'mock'})`);
      const enrichedData = data.success ? data.data || data : data;
      return {
        ...enrichedData,
        enrichmentType: shouldUseRealAI ? 'real' : 'mock',
        isMockData: options.isMockData || false
      };
    } catch (error) {
      logger.error('Contact enrichment by email failed', error as Error);
      // Return graceful fallback data instead of throwing error
      return this.generateMockData({ email }, options.isMockData);
    }
  }

  private shouldUseRealAI(options: {
    isMockData?: boolean;
    forceRealAI?: boolean;
    skipIfMock?: boolean;
  }): boolean {
    // Always use real AI if explicitly requested
    if (options.forceRealAI) return true;

    // Don't use real AI for mock data unless forced
    if (options.isMockData) return false;

    // Use real AI for real data if providers are available
    return this.hasConfiguredProviders();
  }

  async enrichContactByName(firstName: string, lastName: string, company?: string): Promise<ContactEnrichmentData> {
    logger.info(`Enriching contact by name: ${firstName} ${lastName} ${company ? `at ${company}` : ''}`);

    // Check if any providers are configured before making the request
    if (!this.hasConfiguredProviders()) {
      logger.warn(`No AI providers configured for name enrichment: ${firstName} ${lastName}`);
      return this.generateMockData({ firstName, lastName, company });
    }

    try {
      const { data, error } = await supabase.functions.invoke('ai-enrichment', {
        body: {
          type: 'name',
          name: `${firstName} ${lastName}`,
          firstName,
          lastName,
          company,
          contactId: 'client-enrichment-request'
        }
      });

      if (error) {
        throw error;
      }
      logger.info(`Contact enriched successfully by name`);
      return data.success ? data.data || data : data;
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
      const { data, error } = await supabase.functions.invoke('ai-enrichment', {
        body: {
          type: 'linkedin',
          linkedin: linkedinUrl,
          contactId: 'client-enrichment-request'
        }
      });

      if (error) {
        throw error;
      }
      logger.info(`Contact enriched successfully by LinkedIn`);
      return data.success ? data.data || data : data;
    } catch (error) {
      logger.error('Contact enrichment by LinkedIn failed', error as Error);
      // Return graceful fallback data instead of throwing error
      return this.generateMockData({ linkedinUrl });
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
      const { data, error } = await supabase.functions.invoke('ai-enrichment', {
        body: {
          type: 'image',
          name,
          company,
          contactId: 'client-enrichment-request'
        }
      });

      if (error) {
        throw error;
      }
      logger.info(`Found contact image successfully`);
      return data.imageUrl || 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2';
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
      const { data, error } = await supabase.functions.invoke('ai-enrichment', {
        body: {
          contactId: 'client-bulk-enrichment-request',
          contacts,
          type: 'bulk',
          options: {
            maxConcurrency: 5,
            timeout: 60000
          }
        }
      });
      
      if (error) {
        throw error;
      }
      
      const enrichedContacts = data.success ? data.data || [] : [];
      logger.info(`Successfully bulk enriched ${enrichedContacts.length} contacts`);
      return enrichedContacts;
    } catch (error) {
      logger.error('Bulk contact enrichment failed', error as Error);
      // Generate mock data for each contact
      return contacts.map(contact => this.generateMockData(contact));
    }
  }

  // Check if there are any configured providers
  private hasConfiguredProviders(): boolean {
    // More verbose checking to help debug
    const hasProviders = this.providers.some(p => p.enabled && p.apiKey && p.apiKey.length > 0);
    
    if (!hasProviders) {
      console.warn("No AI providers are properly configured:");
      this.providers.forEach(p => {
        console.warn(`- ${p.name}: enabled=${p.enabled}, apiKey=${p.apiKey ? 'present' : 'missing'}`);
      });
    } else {
      console.log("AI providers configured successfully");
    }
    
    return hasProviders;
  }

  // Get an available provider, or return a default if none are configured
  private getAvailableProvider(): string {
    const enabledProviders = this.providers.filter(p => p.enabled);

    if (enabledProviders.length === 0) {
      logger.warn('No AI providers are configured. Using fallback mode.');
      return 'fallback';
    }

    const firstProvider = enabledProviders[0];
    return firstProvider ? firstProvider.name : 'fallback';
  }

  // Generate mock data when API enrichment is not available
  private generateMockData(data: any): ContactEnrichmentData {
    logger.info('Generating mock enrichment data for fallback');
    
    let mockData: ContactEnrichmentData = {
      confidence: 30,
      notes: 'API enrichment unavailable. Using estimated data. To enable AI features, please set up API keys for OpenAI or Gemini.'
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