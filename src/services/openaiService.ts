import { openaiConfig } from '../config/api.config';
import { LoggerService } from './logger.service';
import { Contact } from '../types/contact';

interface OpenAIAnalysisResult {
  leadScore: number;
  insights: string[];
  nextActions: string[];
  riskFactors: string[];
  opportunities: string[];
}

class OpenAIService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = openaiConfig.apiKey;
    this.baseUrl = openaiConfig.baseUrl;
  }

  private validateApiKey(): boolean {
    return this.apiKey && 
           this.apiKey !== 'sk-your-openai-key' && 
           this.apiKey.startsWith('sk-') && 
           this.apiKey.length > 20;
  }

  async analyzeContact(contact: Contact): Promise<OpenAIAnalysisResult> {
    try {
      // Validate API key before making request
      if (!this.validateApiKey()) {
        throw new Error('OpenAI API key is not configured or invalid. Please set a valid API key in your environment variables.');
      }

      const prompt = this.buildAnalysisPrompt(contact);
      
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are a CRM AI assistant that analyzes contacts and provides insights.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          max_tokens: 1000,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`;
        throw new Error(`OpenAI API error: ${errorMessage}`);
      }

      const data = await response.json();
      const analysis = this.parseAnalysisResponse(data.choices[0]?.message?.content || '');
      
      LoggerService.info('OpenAI analysis completed successfully', {
        contactId: contact.id,
        leadScore: analysis.leadScore
      });

      return analysis;
    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error occurred during OpenAI analysis';
      LoggerService.error('OpenAI analysis failed', {
        contactId: contact.id,
        error: errorMessage
      });
      
      // Return a fallback analysis instead of throwing
      return this.getFallbackAnalysis(contact);
    }
  }

  private getFallbackAnalysis(contact: Contact): OpenAIAnalysisResult {
    return {
      leadScore: contact.lead_score || 50,
      insights: ['AI analysis temporarily unavailable. Manual review recommended.'],
      nextActions: ['Contact via preferred communication method', 'Schedule follow-up call'],
      riskFactors: ['Unable to analyze - manual assessment needed'],
      opportunities: ['Potential for engagement - requires manual evaluation']
    };
  }

  private buildAnalysisPrompt(contact: Contact): string {
    return `
Analyze this contact and provide insights in JSON format:

Contact Details:
- Name: ${contact.first_name} ${contact.last_name}
- Email: ${contact.email}
- Company: ${contact.company || 'Not specified'}
- Position: ${contact.position || 'Not specified'}
- Status: ${contact.status}
- Lead Score: ${contact.lead_score || 0}
- Last Activity: ${contact.last_activity || 'No recent activity'}
- Source: ${contact.source || 'Unknown'}

Please respond with a JSON object containing:
{
  "leadScore": number (0-100),
  "insights": array of strings,
  "nextActions": array of strings,
  "riskFactors": array of strings,
  "opportunities": array of strings
}
    `.trim();
  }

  private parseAnalysisResponse(content: string): OpenAIAnalysisResult {
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          leadScore: Math.min(100, Math.max(0, parsed.leadScore || 50)),
          insights: Array.isArray(parsed.insights) ? parsed.insights : ['Analysis completed'],
          nextActions: Array.isArray(parsed.nextActions) ? parsed.nextActions : ['Follow up with contact'],
          riskFactors: Array.isArray(parsed.riskFactors) ? parsed.riskFactors : [],
          opportunities: Array.isArray(parsed.opportunities) ? parsed.opportunities : []
        };
      }
    } catch (error) {
      LoggerService.warn('Failed to parse OpenAI analysis response', { content, error });
    }

    // Fallback parsing
    return {
      leadScore: 50,
      insights: ['Analysis completed - see full response for details'],
      nextActions: ['Review contact details', 'Plan follow-up strategy'],
      riskFactors: [],
      opportunities: ['Potential for engagement']
    };
  }

  async generateEmailTemplate(contact: Contact, purpose: string): Promise<string> {
    try {
      if (!this.validateApiKey()) {
        return this.getFallbackEmailTemplate(contact, purpose);
      }

      const prompt = `Generate a professional email template for ${purpose} to ${contact.first_name} ${contact.last_name} at ${contact.company || 'their company'}.`;
      
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are a professional email writer. Generate concise, engaging emails.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          max_tokens: 500,
          temperature: 0.8,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || this.getFallbackEmailTemplate(contact, purpose);
    } catch (error: any) {
      LoggerService.error('Email template generation failed', {
        contactId: contact.id,
        purpose,
        error: error.message
      });
      return this.getFallbackEmailTemplate(contact, purpose);
    }
  }

  private getFallbackEmailTemplate(contact: Contact, purpose: string): string {
    return `Subject: ${purpose} - ${contact.company || 'Follow Up'}

Dear ${contact.first_name},

I hope this email finds you well.

[Your message content here]

Best regards,
[Your name]`;
  }
}

export default new OpenAIService();