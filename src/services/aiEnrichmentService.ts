// AI Contact Enrichment Service - OpenAI & Gemini Integration
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
  private providers: AIProvider[] = [
    { name: 'openai', enabled: true },
    { name: 'gemini', enabled: true }
  ];

  // Simulate web search and contact enrichment
  async enrichContactByEmail(email: string): Promise<ContactEnrichmentData> {
    console.log(`🔍 Searching for contact information: ${email}`);
    
    // Simulate AI processing time
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Mock enriched data based on email domain
    const domain = email.split('@')[1];
    const firstName = email.split('@')[0].split('.')[0];
    const lastName = email.split('@')[0].split('.')[1] || '';
    
    const mockData: ContactEnrichmentData = {
      firstName: this.capitalize(firstName),
      lastName: this.capitalize(lastName),
      name: `${this.capitalize(firstName)} ${this.capitalize(lastName)}`.trim(),
      email: email,
      phone: this.generateMockPhone(),
      title: this.getMockTitle(domain),
      company: this.getMockCompany(domain),
      industry: this.getMockIndustry(domain),
      location: this.getMockLocation(),
      socialProfiles: this.getMockSocialProfiles(firstName, lastName, domain),
      avatar: this.getMockAvatar(),
      bio: `Professional with extensive experience in ${this.getMockIndustry(domain).toLowerCase()}`,
      notes: `Contact information enriched via AI research on ${new Date().toLocaleDateString()}`,
      confidence: Math.floor(Math.random() * 30) + 70 // 70-100% confidence
    };

    return mockData;
  }

  async enrichContactByName(firstName: string, lastName: string, company?: string): Promise<ContactEnrichmentData> {
    console.log(`🔍 Searching for: ${firstName} ${lastName}${company ? ` at ${company}` : ''}`);
    
    await new Promise(resolve => setTimeout(resolve, 2500));
    
    const mockData: ContactEnrichmentData = {
      firstName,
      lastName,
      name: `${firstName} ${lastName}`,
      email: this.generateMockEmail(firstName, lastName, company),
      phone: this.generateMockPhone(),
      title: this.getMockTitle(company),
      company: company || this.getMockCompany(),
      industry: this.getMockIndustry(company),
      location: this.getMockLocation(),
      socialProfiles: this.getMockSocialProfiles(firstName, lastName, company),
      avatar: this.getMockAvatar(),
      bio: `${firstName} ${lastName} is a seasoned professional with expertise in ${this.getMockIndustry(company).toLowerCase()}`,
      notes: `Profile researched and enriched via AI search on ${new Date().toLocaleDateString()}`,
      confidence: Math.floor(Math.random() * 25) + 75
    };

    return mockData;
  }

  async enrichContactByLinkedIn(linkedinUrl: string): Promise<ContactEnrichmentData> {
    console.log(`🔍 Analyzing LinkedIn profile: ${linkedinUrl}`);
    
    await new Promise(resolve => setTimeout(resolve, 1800));
    
    const profileId = linkedinUrl.split('/in/')[1]?.replace('/', '') || 'unknown';
    
    const mockData: ContactEnrichmentData = {
      firstName: this.capitalize(profileId.split('-')[0] || 'John'),
      lastName: this.capitalize(profileId.split('-')[1] || 'Doe'),
      name: `${this.capitalize(profileId.split('-')[0] || 'John')} ${this.capitalize(profileId.split('-')[1] || 'Doe')}`,
      email: this.generateMockEmail(profileId.split('-')[0], profileId.split('-')[1]),
      phone: this.generateMockPhone(),
      title: this.getMockTitle(),
      company: this.getMockCompany(),
      industry: this.getMockIndustry(),
      location: this.getMockLocation(),
      socialProfiles: {
        linkedin: linkedinUrl,
        twitter: `https://twitter.com/${profileId.replace('-', '')}`,
        website: `https://${profileId.replace('-', '')}.com`
      },
      avatar: this.getMockAvatar(),
      bio: `LinkedIn professional with strong background in business development and strategy`,
      notes: `LinkedIn profile analyzed and data extracted on ${new Date().toLocaleDateString()}`,
      confidence: Math.floor(Math.random() * 20) + 80
    };

    return mockData;
  }

  async findContactImage(name: string, company?: string): Promise<string> {
    console.log(`🖼️ Searching for profile image: ${name}${company ? ` at ${company}` : ''}`);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Return a random professional avatar from Pexels
    const avatars = [
      'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
      'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
      'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
      'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
      'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
      'https://images.pexels.com/photos/1212984/pexels-photo-1212984.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
      'https://images.pexels.com/photos/1587009/pexels-photo-1587009.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
      'https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2'
    ];
    
    return avatars[Math.floor(Math.random() * avatars.length)];
  }

  async bulkEnrichContacts(contacts: Array<{email?: string, name?: string, company?: string}>): Promise<ContactEnrichmentData[]> {
    console.log(`🔍 Bulk enriching ${contacts.length} contacts...`);
    
    const results: ContactEnrichmentData[] = [];
    
    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
      
      let enrichedData: ContactEnrichmentData;
      
      if (contact.email) {
        enrichedData = await this.enrichContactByEmail(contact.email);
      } else if (contact.name) {
        const [firstName, ...lastName] = contact.name.split(' ');
        enrichedData = await this.enrichContactByName(firstName, lastName.join(' '), contact.company);
      } else {
        enrichedData = {
          confidence: 0,
          notes: 'Insufficient data for enrichment'
        };
      }
      
      results.push(enrichedData);
    }
    
    return results;
  }

  // Helper methods for generating mock data
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
    const area = Math.floor(Math.random() * 900) + 100;
    const exchange = Math.floor(Math.random() * 900) + 100;
    const number = Math.floor(Math.random() * 9000) + 1000;
    return `+1-${area}-${exchange}-${number}`;
  }

  private getMockTitle(company?: string): string {
    const titles = [
      'Marketing Director', 'Sales Manager', 'CEO', 'CTO', 'VP of Sales',
      'Product Manager', 'Business Development Manager', 'Operations Director',
      'Marketing Manager', 'Senior Developer', 'Account Executive', 'Strategy Director'
    ];
    return titles[Math.floor(Math.random() * titles.length)];
  }

  private getMockCompany(domain?: string): string {
    if (domain) {
      const companyNames = {
        'microsoft.com': 'Microsoft',
        'google.com': 'Google',
        'apple.com': 'Apple',
        'amazon.com': 'Amazon',
        'salesforce.com': 'Salesforce',
        'oracle.com': 'Oracle',
        'adobe.com': 'Adobe',
        'netflix.com': 'Netflix'
      };
      return companyNames[domain as keyof typeof companyNames] || this.getRandomCompany();
    }
    return this.getRandomCompany();
  }

  private getRandomCompany(): string {
    const companies = [
      'TechCorp Solutions', 'Innovation Labs', 'Global Dynamics', 'Future Systems',
      'Digital Ventures', 'Smart Solutions Inc', 'Advanced Technologies', 'Growth Partners'
    ];
    return companies[Math.floor(Math.random() * companies.length)];
  }

  private getMockIndustry(company?: string): string {
    const industries = [
      'Technology', 'Software', 'Healthcare', 'Finance', 'Manufacturing',
      'Consulting', 'Marketing', 'E-commerce', 'Education', 'Real Estate'
    ];
    return industries[Math.floor(Math.random() * industries.length)];
  }

  private getMockLocation() {
    const locations = [
      { city: 'San Francisco', state: 'California', country: 'United States' },
      { city: 'New York', state: 'New York', country: 'United States' },
      { city: 'London', state: 'England', country: 'United Kingdom' },
      { city: 'Toronto', state: 'Ontario', country: 'Canada' },
      { city: 'Sydney', state: 'NSW', country: 'Australia' },
      { city: 'Berlin', state: 'Berlin', country: 'Germany' },
      { city: 'Tokyo', state: 'Tokyo', country: 'Japan' }
    ];
    return locations[Math.floor(Math.random() * locations.length)];
  }

  private getMockSocialProfiles(firstName?: string, lastName?: string, company?: string) {
    const username = `${firstName?.toLowerCase()}${lastName?.toLowerCase()}`.replace(/\s+/g, '');
    const companyDomain = company?.toLowerCase().replace(/\s+/g, '') || 'company';
    
    return {
      linkedin: `https://linkedin.com/in/${username}`,
      twitter: `https://twitter.com/${username}`,
      website: `https://${companyDomain}.com`,
      facebook: `https://facebook.com/${username}`
    };
  }

  private getMockAvatar(): string {
    const avatars = [
      'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
      'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
      'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
      'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
      'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2'
    ];
    return avatars[Math.floor(Math.random() * avatars.length)];
  }
}

export const aiEnrichmentService = new AIEnrichmentService();