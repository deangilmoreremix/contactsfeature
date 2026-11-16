// AI Contact Enrichment Service
// All AI goes through the server-side proxy (aiClient -> hosted web_search). Failures are thrown;
// no mock/estimated data is ever returned as if it were enrichment output.
import { logger } from './logger.service';
import { aiRespond } from './aiClient';

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
  enrichmentType?: 'real' | 'mock' | 'gpt5' | 'real_time';
  isMockData?: boolean;
  sources?: Array<{ url: string; title?: string }>;
}

const nullableString = { type: ['string', 'null'] };
const PROFILE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    matched: { type: 'boolean' },
    confidence: { type: 'number' },
    firstName: nullableString,
    lastName: nullableString,
    email: nullableString,
    phone: nullableString,
    title: nullableString,
    company: nullableString,
    industry: nullableString,
    city: nullableString,
    state: nullableString,
    country: nullableString,
    linkedin: nullableString,
    twitter: nullableString,
    facebook: nullableString,
    website: nullableString,
    bio: nullableString,
    notes: nullableString
  },
  required: ['matched', 'confidence', 'firstName', 'lastName', 'email', 'phone', 'title', 'company', 'industry', 'city', 'state', 'country', 'linkedin', 'twitter', 'facebook', 'website', 'bio', 'notes']
} as const;

type ProfileJson = {
  matched: boolean;
  confidence: number;
  [k: string]: string | number | boolean | null;
};

const INSTRUCTIONS =
  'You are a B2B contact research assistant. Use web search to find ONLY publicly available professional information about the person/company described. ' +
  'Never guess or invent values: use null for anything you cannot verify from a source. If you cannot confidently identify the subject, set matched=false and confidence=0. ' +
  'confidence is 0-100. Put short caveats in notes.';

const str = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v.trim() : undefined);

class AIEnrichmentService {
  /** Research a subject with hosted web search and map the result to ContactEnrichmentData. */
  private async research(subject: string, hints: Partial<ContactEnrichmentData> = {}): Promise<ContactEnrichmentData> {
    const res = await aiRespond<ProfileJson>({
      role: 'default',
      instructions: INSTRUCTIONS,
      input: subject,
      schema: PROFILE_SCHEMA as unknown as Record<string, unknown>,
      schemaName: 'contact_profile',
      tools: [{ type: 'web_search' }],
      maxOutputTokens: 1500
    });
    const p = res.json;
    if (!p) throw new Error('AI did not return a usable enrichment result');

    const out: ContactEnrichmentData = { ...hints, enrichmentType: 'real', isMockData: false };
    out.confidence = p.matched ? Math.max(0, Math.min(100, Number(p.confidence) || 0)) : 0;
    const firstName = str(p.firstName), lastName = str(p.lastName);
    if (firstName) out.firstName = firstName;
    if (lastName) out.lastName = lastName;
    if (firstName || lastName) out.name = [firstName, lastName].filter(Boolean).join(' ');
    for (const k of ['email', 'phone', 'title', 'company', 'industry', 'bio', 'notes'] as const) {
      const v = str(p[k]);
      if (v) out[k] = v;
    }
    const city = str(p.city), state = str(p.state), country = str(p.country);
    if (city || state || country) {
      out.location = { ...(city ? { city } : {}), ...(state ? { state } : {}), ...(country ? { country } : {}) };
    }
    const social: NonNullable<ContactEnrichmentData['socialProfiles']> = { ...(hints.socialProfiles ?? {}) };
    for (const k of ['linkedin', 'twitter', 'facebook', 'website'] as const) {
      const v = str(p[k]);
      if (v) social[k] = v;
    }
    if (Object.keys(social).length) out.socialProfiles = social;
    if (res.citations?.length) out.sources = res.citations;
    return out;
  }

  async enrichContactByEmail(
    email: string,
    options: {
      isMockData?: boolean;
      isExample?: boolean;
      createdBy?: 'system' | 'user' | 'demo';
      dataSource?: 'mock' | 'real' | 'imported' | 'manual';
      forceRealAI?: boolean;
      skipIfMock?: boolean;
    } = {}
  ): Promise<ContactEnrichmentData> {
    logger.info('Enriching contact by email');

    const isDemoData = options.isExample || options.createdBy === 'demo';
    if (options.skipIfMock && (options.isMockData || isDemoData)) {
      // Explicit demo flag preserved for callers that rely on it; no AI result is claimed.
      return {
        email,
        confidence: 0,
        notes: `Enrichment skipped for ${isDemoData ? 'demo' : 'mock'} data`,
        enrichmentType: 'mock',
        isMockData: true
      };
    }

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('Invalid email format');
    return this.research(`Find public professional information for the person with this email address: ${email}. Also identify their company from the email domain if it is a business domain.`, { email });
  }

  async enrichContactByName(firstName: string, lastName: string, company?: string): Promise<ContactEnrichmentData> {
    logger.info('Enriching contact by name');
    return this.research(`Find public professional information for ${firstName} ${lastName}${company ? ` who works at or is associated with ${company}` : ''}.`, {
      firstName,
      lastName,
      name: `${firstName} ${lastName}`.trim(),
      ...(company ? { company } : {})
    });
  }

  async enrichContactByLinkedIn(linkedinUrl: string): Promise<ContactEnrichmentData> {
    logger.info('Enriching contact by LinkedIn URL');
    return this.research(`Find public professional information for the person with this LinkedIn profile: ${linkedinUrl}`, {
      socialProfiles: { linkedin: linkedinUrl }
    });
  }

  async enrichContactBySocialNetwork(platform: string, profileUrl: string): Promise<ContactEnrichmentData> {
    logger.info(`Enriching contact by ${platform} URL`);
    const key = platform.toLowerCase();
    const known = ['linkedin', 'twitter', 'facebook', 'website'].includes(key);
    return this.research(`Find public professional information for the person with this ${platform} profile: ${profileUrl}`, known ? {
      socialProfiles: { [key]: profileUrl }
    } : {});
  }

  async enrichContactByMultipleSocialNetworks(socialProfiles: {
    linkedin?: string;
    twitter?: string;
    facebook?: string;
    instagram?: string;
    whatsapp?: string;
    website?: string;
  }): Promise<ContactEnrichmentData> {
    const entries = Object.entries(socialProfiles).filter(([, v]) => !!v);
    if (!entries.length) throw new Error('No social profiles provided');
    logger.info(`Enriching contact by ${entries.length} social profiles`);
    const { linkedin, twitter, facebook, website } = socialProfiles;
    return this.research(
      `Find public professional information for the person who owns these profiles (they should all be the same person):\n${entries.map(([k, v]) => `- ${k}: ${v}`).join('\n')}`,
      { socialProfiles: { ...(linkedin ? { linkedin } : {}), ...(twitter ? { twitter } : {}), ...(facebook ? { facebook } : {}), ...(website ? { website } : {}) } }
    );
  }

  async enrichContactMultiModal(
    contactData: {
      email?: string;
      name?: string;
      company?: string;
      linkedin?: string;
      images?: string[];
      documents?: string[];
    },
    options: {
      useGPT5?: boolean;
      includeWebResearch?: boolean;
      realTimeUpdates?: boolean;
    } = {}
  ): Promise<ContactEnrichmentData> {
    void options;
    const known = [
      contactData.name && `name: ${contactData.name}`,
      contactData.email && `email: ${contactData.email}`,
      contactData.company && `company: ${contactData.company}`,
      contactData.linkedin && `linkedin: ${contactData.linkedin}`
    ].filter(Boolean);
    if (!known.length) throw new Error('Not enough information to enrich this contact');
    return this.research(`Find public professional information for the person described by:\n${known.join('\n')}`, {
      ...(contactData.email ? { email: contactData.email } : {}),
      ...(contactData.company ? { company: contactData.company } : {})
    });
  }

  async enrichContactRealTime(
    contactData: Partial<ContactEnrichmentData>,
    webContext?: {
      searchQuery?: string;
      industryData?: any;
      companyNews?: any[];
    }
  ): Promise<ContactEnrichmentData> {
    const known = JSON.stringify({
      name: contactData.name || [contactData.firstName, contactData.lastName].filter(Boolean).join(' ') || undefined,
      email: contactData.email,
      company: contactData.company,
      title: contactData.title,
      linkedin: contactData.socialProfiles?.linkedin
    });
    const out = await this.research(
      `Find current public professional information (including recent role or company changes) for this contact: ${known}${webContext?.searchQuery ? `\nFocus: ${webContext.searchQuery}` : ''}`,
      contactData
    );
    return { ...out, enrichmentType: 'real_time' };
  }

  // Quality scoring for enriched data
  calculateEnrichmentQuality(data: ContactEnrichmentData): {
    overallScore: number;
    breakdown: {
      dataCompleteness: number;
      sourceReliability: number;
      recencyScore: number;
      consistencyScore: number;
    };
    recommendations: string[];
  } {
    const fields = ['firstName', 'lastName', 'email', 'phone', 'title', 'company', 'industry'];
    const filledFields = fields.filter(field => data[field as keyof ContactEnrichmentData]);
    const dataCompleteness = (filledFields.length / fields.length) * 100;
    const sourceReliability = data.sources?.length ? 90 : data.enrichmentType === 'mock' ? 0 : 60;
    const recencyScore = data.confidence || 0;
    const consistencyScore = data.confidence || 0;

    const score = dataCompleteness * 0.4 + sourceReliability * 0.3 + recencyScore * 0.2 + consistencyScore * 0.1;

    const recommendations: string[] = [];
    if (dataCompleteness < 70) recommendations.push('Add more contact information for better enrichment');
    if (sourceReliability < 80) recommendations.push('Few or no cited sources; verify the details manually');
    if (recencyScore < 75) recommendations.push('Low confidence; verify before relying on this data');

    return {
      overallScore: Math.round(score),
      breakdown: { dataCompleteness, sourceReliability, recencyScore, consistencyScore },
      recommendations
    };
  }

  /**
   * Web search cannot reliably return a verified photo of a person, so this returns an empty
   * string (meaning "no image found") rather than a stock/placeholder image.
   */
  async findContactImage(name: string, company?: string): Promise<string> {
    logger.info(`Image lookup requested for ${name}${company ? ` at ${company}` : ''}: not supported`);
    return '';
  }

  /**
   * Enrich many contacts. A contact that fails comes back with confidence 0 and a notes message
   * explaining the failure (never fabricated data).
   */
  async bulkEnrichContacts(contacts: Array<{email?: string, name?: string, company?: string}>): Promise<ContactEnrichmentData[]> {
    logger.info(`Bulk enriching ${contacts.length} contacts`);
    const results: ContactEnrichmentData[] = new Array(contacts.length);
    let next = 0;
    const worker = async () => {
      while (next < contacts.length) {
        const i = next++;
        const c = contacts[i]!;
        try {
          if (c.email) results[i] = await this.enrichContactByEmail(c.email);
          else if (c.name) {
            const [first = '', ...rest] = c.name.trim().split(/\s+/);
            results[i] = await this.enrichContactByName(first, rest.join(' '), c.company);
          } else throw new Error('Contact needs an email or name');
        } catch (error) {
          logger.error('Bulk enrichment item failed', error as Error);
          results[i] = {
            ...(c.email ? { email: c.email } : {}),
            ...(c.name ? { name: c.name } : {}),
            ...(c.company ? { company: c.company } : {}),
            confidence: 0,
            notes: `Enrichment failed: ${(error as Error).message}`
          };
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(3, contacts.length) }, worker));
    return results;
  }
}

export const aiEnrichmentService = new AIEnrichmentService();
