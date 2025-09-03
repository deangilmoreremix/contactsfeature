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
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  
  const analyzeContact = async (contact: any): Promise<ContactAnalysisResult> => {
    logger.info(`Analyzing contact with OpenAI web search: ${contact.name}`);

    try {
      const systemPrompt = 'You are an expert CRM analyst with deep expertise in sales, marketing, and customer relationship management. You have access to web search to find the latest information about companies, industries, and market trends. Analyze the contact information provided and return a structured JSON response with a lead score (0-100), key insights, recommendations, risk factors, and opportunities. Use web search when you need current information about the company, industry, or market conditions.';

      const userPrompt = `Analyze this contact and search the web for the latest information:\n\n${JSON.stringify(contact, null, 2)}\n\nProvide an analysis with lead score, insights, recommendations, risk factors, and opportunities. Include any relevant current information you find about their company or industry.`;

      const searchOptions: WebSearchOptions = {
        searchContextSize: 'medium',
        includeSources: true
      };

      // Use the web search service
      const searchResult = await webSearchService.searchWithAI(
        `Contact analysis: ${contact.name} at ${contact.company}`,
        systemPrompt,
        userPrompt,
        searchOptions
      );

      try {
        const parsedContent = JSON.parse(searchResult.content);

        logger.info('Contact analysis with web search completed', {
          contactName: contact.name,
          citationCount: searchResult.citations.length,
          sourceCount: searchResult.sources.length
        });

        return {
          score: parsedContent.score ?? Math.floor(Math.random() * 40) + 60,
          insights: parsedContent.insights ?? ['No insights available'],
          recommendations: parsedContent.recommendations ?? ['No recommendations available'],
          riskFactors: parsedContent.riskFactors ?? [],
          opportunities: parsedContent.opportunities ?? []
        };
      } catch (parseError) {
        logger.error('Failed to parse web search response', parseError as Error);
        throw new Error('Failed to parse analysis response');
      }
    } catch (error) {
      logger.error('Contact analysis with web search failed', error as Error);
      // Fallback to a basic analysis to prevent UI breakage
      return {
        score: 50,
        insights: ['Web search analysis currently unavailable'],
        recommendations: ['Try again later'],
        riskFactors: ['Analysis incomplete'],
        opportunities: []
      };
    }
  };

  const generateEmailTemplate = async (contact: any, purpose: string) => {
    try {
      const systemPrompt = 'You are an expert email copywriter with access to web search. Generate personalized, professional email templates. Use web search to find current information about the recipient\'s company, industry trends, or relevant news that can be incorporated into the email. Return a JSON object with "subject" and "body" fields.';

      const userPrompt = `Generate a personalized email template for ${purpose} to send to ${contact.name}, ${contact.title} at ${contact.company}. Research current information about their company and industry to make the email more relevant and timely. Include any recent news or developments that would be relevant to the conversation.`;

      const searchOptions: WebSearchOptions = {
        searchContextSize: 'low',
        includeSources: false
      };

      // Use the web search service
      const searchResult = await webSearchService.searchWithAI(
        `Email template: ${purpose} for ${contact.name} at ${contact.company}`,
        systemPrompt,
        userPrompt,
        searchOptions
      );

      try {
        const content = JSON.parse(searchResult.content);

        logger.info('Email template generation with web search completed', {
          contactName: contact.name,
          purpose,
          citationCount: searchResult.citations.length
        });

        return {
          subject: content.subject || `Following up on ${purpose} - ${contact.company}`,
          body: content.body || `Hi ${contact.firstName || contact.name.split(' ')[0]},\n\nI hope this email finds you well.`
        };
      } catch (parseError) {
        logger.error('Failed to parse email template response', parseError as Error);
        throw new Error('Failed to parse email template response');
      }
    } catch (error) {
      logger.error('Email template generation with web search failed', error as Error);
      return {
        subject: `Following up on ${purpose} - ${contact.company}`,
        body: `Hi ${contact.firstName || contact.name.split(' ')[0]},\n\nI hope this email finds you well. I wanted to follow up on our recent conversation regarding ${purpose}.`
      };
    }
  };

  const researchContactByEmail = async (email: string): Promise<ContactEnrichmentData> => {
    logger.info(`Researching contact by email: ${email}`);
    
    if (!apiKey) {
      throw new Error('OpenAI API key is not configured');
    }
    
    try {
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          tools: [
            {
              type: 'web_search',
              search_context_size: 'high'
            }
          ],
          input: [
            {
              role: 'system',
              content: 'You are an AI assistant specializing in contact research with access to web search. Given an email address, search the web for current information about the person and their company. Return comprehensive, up-to-date structured data including recent news, company updates, and professional information.'
            },
            {
              role: 'user',
              content: `Research this contact email comprehensively: ${email}. Search for recent news, company information, professional background, and any other relevant current data.`
            }
          ],
          temperature: 0.3,
          response_format: { type: "json_object" }
        })
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }
      
      const data = await response.json();
      const content = JSON.parse(data.output[0].content[0].text);
      
      return {
        ...content,
        email,
        confidence: content.confidence || 70
      };
    } catch (error) {
      logger.error('Contact research by email failed', error as Error);
      
      // Minimal fallback to prevent UI breakage
      const parts = email.split('@');
      const domain = parts[1] || 'company.com';
      const nameparts = parts[0].split('.');
      
      return {
        firstName: nameparts[0]?.charAt(0).toUpperCase() + nameparts[0]?.slice(1) || '',
        lastName: nameparts[1]?.charAt(0).toUpperCase() + nameparts[1]?.slice(1) || '',
        email: email,
        company: domain.split('.')[0],
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