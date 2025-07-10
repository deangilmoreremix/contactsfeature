import { createClient } from 'npm:@supabase/supabase-js@2.39.3';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }

  try {
    // Validate environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing required environment variables');
      return new Response(
        JSON.stringify({ 
          error: 'Server configuration error',
          details: 'Missing required environment variables'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Check if AI providers are configured
    const hasOpenAI = !!openaiApiKey;
    const hasGemini = !!geminiApiKey;
    
    if (!hasOpenAI && !hasGemini) {
      console.warn('No AI provider API keys configured, using fallback mode');
    }

    if (req.method === 'POST') {
      const { contact, platform, purpose, tone = 'professional', length = 'medium' } = await req.json();
      
      if (!contact || !platform) {
        return new Response(
          JSON.stringify({ 
            error: 'Missing required parameters',
            details: 'contact and platform are required'
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      let result;
      
      // Use real AI providers if available
      if (hasOpenAI || hasGemini) {
        try {
          // Prefer OpenAI if available, otherwise use Gemini
          if (hasOpenAI) {
            result = await generateMessageWithOpenAI(contact, platform, purpose, tone, length, openaiApiKey!);
          } else {
            result = await generateMessageWithGemini(contact, platform, purpose, tone, length, geminiApiKey!);
          }
        } catch (error) {
          console.error('AI message generation failed:', error);
          // Fall back to template-based generation
          result = generateTemplateMessage(contact, platform, purpose, tone, length);
        }
      } else {
        // Use template-based generation when no AI providers are available
        result = generateTemplateMessage(contact, platform, purpose, tone, length);
      }

      return new Response(
        JSON.stringify(result),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        error: 'Method not allowed',
        details: 'This endpoint only supports POST requests'
      }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Personalized message error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        message: error.message || 'An unexpected error occurred' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// Generate personalized message using OpenAI API
async function generateMessageWithOpenAI(
  contact: any,
  platform: string,
  purpose: string,
  tone: string,
  length: string,
  apiKey: string
): Promise<any> {
  // Get character limits for the platform
  const characterLimits = getCharacterLimits(platform, length);
  
  // Select model - using GPT-4o Mini is sufficient for short messages
  const model = 'gpt-4o-mini';
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: `You are an expert at writing personalized messages for various social and communication platforms.
          Create concise, effective messages that are appropriate for the specified platform and purpose.
          Adhere strictly to character limits and tone guidelines.`
        },
        {
          role: 'user',
          content: `Write a personalized ${platform} message for ${contact.name}, who works as ${contact.title || 'a professional'} at ${contact.company || 'their company'}.
          
          Platform: ${platform}
          Purpose: ${purpose || 'introduction'}
          Tone: ${tone}
          
          Character limits for ${platform}:
          Minimum: ${characterLimits.min}
          Maximum: ${characterLimits.max}
          Ideal: ${characterLimits.ideal}
          
          Additional context about the recipient:
          ${JSON.stringify(contact, null, 2)}
          
          Return only the message text, without any explanations or formatting.`
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const message = data.choices[0]?.message?.content?.trim();
  
  if (!message) {
    throw new Error('Empty response from OpenAI API');
  }
  
  return {
    message,
    platform,
    purpose: purpose || 'introduction',
    tone,
    length,
    characterCount: message.length,
    characterLimit: characterLimits,
    confidence: 90,
    model,
    timestamp: new Date().toISOString()
  };
}

// Generate personalized message using Gemini API
async function generateMessageWithGemini(
  contact: any,
  platform: string,
  purpose: string,
  tone: string,
  length: string,
  apiKey: string
): Promise<any> {
  // Get character limits for the platform
  const characterLimits = getCharacterLimits(platform, length);
  
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `Write a personalized ${platform} message for ${contact.name}, who works as ${contact.title || 'a professional'} at ${contact.company || 'their company'}.
          
          Platform: ${platform}
          Purpose: ${purpose || 'introduction'}
          Tone: ${tone}
          
          Character limits for ${platform}:
          Minimum: ${characterLimits.min}
          Maximum: ${characterLimits.max}
          Ideal: ${characterLimits.ideal}
          
          Additional context about the recipient:
          ${JSON.stringify(contact, null, 2)}
          
          Return only the message text, without any explanations or formatting.`
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: characterLimits.max + 100
      }
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Gemini API error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const message = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  
  if (!message) {
    throw new Error('Empty response from Gemini API');
  }
  
  return {
    message,
    platform,
    purpose: purpose || 'introduction',
    tone,
    length,
    characterCount: message.length,
    characterLimit: characterLimits,
    confidence: 85,
    model: 'gemini-1.5-flash',
    timestamp: new Date().toISOString()
  };
}

function getCharacterLimits(platform: string, length: string): { min: number; max: number; ideal: number } {
  switch (platform) {
    case 'linkedin':
      return { min: 50, max: 1300, ideal: 300 };
    case 'twitter':
      return { min: 10, max: 280, ideal: 240 };
    case 'sms':
      return { min: 10, max: 160, ideal: 120 };
    case 'whatsapp':
      return { min: 10, max: 1000, ideal: 200 };
    case 'email':
      return length === 'short' 
        ? { min: 50, max: 300, ideal: 200 }
        : length === 'medium'
          ? { min: 100, max: 500, ideal: 350 }
          : { min: 200, max: 1000, ideal: 750 };
    default:
      return { min: 50, max: 500, ideal: 250 };
  }
}

// Fallback template-based message generation
function generateTemplateMessage(
  contact: any,
  platform: string,
  purpose: string = 'introduction',
  tone: string = 'professional',
  length: string = 'medium'
): any {
  // Get character limits
  const characterLimits = getCharacterLimits(platform, length);
  
  // Generate appropriate message
  let message = '';
  
  // Generate greeting
  const greeting = platform === 'linkedin' || platform === 'email' 
    ? `Hi ${contact.firstName || contact.name.split(' ')[0]},` 
    : platform === 'sms' 
      ? `Hey ${contact.firstName || contact.name.split(' ')[0]},` 
      : '';

  // Generate message body based on purpose
  switch (purpose) {
    case 'introduction':
      if (platform === 'linkedin') {
        message = `${greeting}\n\nI noticed your profile and was impressed by your work at ${contact.company} as ${contact.title}. I work with professionals in the ${contact.industry || 'industry'} to help them solve ${generatePainPoint(contact.industry)}.\n\nWould you be open to connecting? I'd love to learn more about your work and share insights that might be valuable for you.\n\nLooking forward to connecting,\n[Your Name]`;
      } else if (platform === 'email') {
        message = `${greeting}\n\nI hope this email finds you well. I'm reaching out because I noticed your work at ${contact.company} and thought there might be an opportunity for us to collaborate.\n\nAt [Company Name], we help professionals like you in the ${contact.industry || 'industry'} to overcome challenges such as ${generatePainPoint(contact.industry)}.\n\nI'd love to learn more about your current initiatives and explore how we might be able to support your goals. Would you be open to a brief 15-minute call next week?\n\nBest regards,\n[Your Name]\n[Your Title]\n[Company Name]`;
      } else if (platform === 'sms' || platform === 'whatsapp') {
        message = `${greeting} I'm [Your Name] from [Company Name]. We help ${contact.industry || 'companies'} address ${generatePainPoint(contact.industry)}. Would you be open to a quick chat about how we might support your work at ${contact.company}?`;
      } else if (platform === 'twitter') {
        message = `Hi, I'm [Name] from [Company]. Noticed your work at ${contact.company}. We help with ${generatePainPoint(contact.industry)}. Open to connecting?`;
      }
      break;
      
    case 'follow-up':
      if (platform === 'linkedin') {
        message = `${greeting}\n\nI wanted to follow up on our recent conversation about ${generateIndustrySpecificPhrase(contact.industry)}. I thought you might find this resource helpful: [Resource Link]\n\nWould you be interested in discussing this further? I'm available next week if you'd like to connect.\n\nBest,\n[Your Name]`;
      } else if (platform === 'email') {
        message = `${greeting}\n\nI hope you're doing well. I wanted to follow up on our recent conversation about how we could help ${contact.company} with ${generatePainPoint(contact.industry)}.\n\nAs discussed, I've attached the information about our solution that helps companies like yours ${generateBenefit(contact.industry)}.\n\nDo you have any questions I can address? I'm happy to schedule a call to discuss this further.\n\nBest regards,\n[Your Name]\n[Your Title]\n[Company Name]`;
      } else if (platform === 'sms' || platform === 'whatsapp') {
        message = `${greeting} Following up on our conversation about ${generateIndustrySpecificPhrase(contact.industry)}. I'd be happy to provide more info or schedule a call. Let me know what works for you.`;
      } else if (platform === 'twitter') {
        message = `Thanks for our chat about ${generateIndustrySpecificPhrase(contact.industry)}. Thought you might like this resource: [Link]. Open to discussing further?`;
      }
      break;
      
    default:
      message = `${greeting}\n\nI hope you're doing well. I wanted to reach out about ${generateIndustrySpecificPhrase(contact.industry)}. Let me know if you'd like to discuss this further.\n\n[Your Name]`;
  }
  
  // Adjust tone
  message = adjustTone(message, tone);
  
  // Ensure message is within character limits
  if (message.length > characterLimits.max) {
    message = message.substring(0, characterLimits.max - 3) + '...';
  }
  
  return {
    message,
    platform,
    purpose: purpose || 'introduction',
    tone,
    length,
    characterCount: message.length,
    characterLimit: characterLimits,
    confidence: 75,
    model: 'template-based',
    timestamp: new Date().toISOString()
  };
}

function adjustTone(message: string, tone: string): string {
  let adjustedMessage = message;
  
  switch (tone) {
    case 'formal':
      adjustedMessage = adjustedMessage.replace(/Hi /g, 'Dear ')
        .replace(/Hey /g, 'Hello ')
        .replace(/Thanks/g, 'Thank you')
        .replace(/Let me know/g, 'Please inform me')
        .replace(/Get back to me/g, 'Please respond');
      break;
    case 'friendly':
      adjustedMessage = adjustedMessage.replace(/Dear /g, 'Hi ')
        .replace(/Hello /g, 'Hey ')
        .replace(/I hope this (email|message) finds you well./g, 'Hope you\'re doing great!')
        .replace(/Best regards/g, 'Cheers')
        .replace(/I would like to/g, 'I\'d love to');
      break;
    case 'direct':
      adjustedMessage = adjustedMessage.replace(/I hope this (email|message) finds you well.\s*/g, '')
        .replace(/I wanted to /g, 'I\'m writing to ')
        .replace(/Would you be open to/g, 'Are you available for')
        .replace(/I would like to/g, 'I want to');
      break;
    case 'persuasive':
      // Add persuasive elements
      if (!adjustedMessage.includes('opportunity')) {
        adjustedMessage = adjustedMessage.replace(
          /(would you be|are you) (open to|available for|interested in)/i, 
          'I\'d like to offer you the opportunity for'
        );
      }
      break;
  }
  
  return adjustedMessage;
}

// Helper function for industry-specific phrases
function generateIndustrySpecificPhrase(industry?: string): string {
  const phrases: Record<string, string[]> = {
    'Technology': ['digital transformation', 'cloud migration', 'IT infrastructure optimization', 'cybersecurity enhancement', 'data analytics solutions'],
    'Healthcare': ['patient experience improvement', 'healthcare operations efficiency', 'medical data management', 'telehealth solutions', 'compliance optimization'],
    'Finance': ['financial process automation', 'risk management solutions', 'investment strategy optimization', 'regulatory compliance', 'customer financial insights'],
    'Manufacturing': ['supply chain optimization', 'production efficiency', 'quality control enhancement', 'Industry 4.0 implementation', 'manufacturing automation'],
    'Retail': ['customer experience enhancement', 'omnichannel strategy', 'inventory management solutions', 'retail analytics', 'personalization technology'],
    'Education': ['learning management solutions', 'student engagement platforms', 'educational analytics', 'administrative efficiency', 'distance learning technology']
  };
  
  if (industry && phrases[industry]) {
    const industryPhrases = phrases[industry];
    return industryPhrases[Math.floor(Math.random() * industryPhrases.length)];
  }
  
  // Default phrases for unknown industry
  const defaultPhrases = ['business process optimization', 'operational efficiency', 'strategic growth initiatives', 'digital solutions', 'innovative approaches'];
  return defaultPhrases[Math.floor(Math.random() * defaultPhrases.length)];
}

// Helper function for pain points
function generatePainPoint(industry?: string): string {
  const painPoints: Record<string, string[]> = {
    'Technology': ['legacy system integration challenges', 'cybersecurity vulnerabilities', 'technical debt', 'siloed data systems', 'scaling limitations'],
    'Healthcare': ['patient data management inefficiencies', 'compliance burden', 'care coordination gaps', 'staff productivity challenges', 'billing complexity'],
    'Finance': ['risk assessment inefficiencies', 'compliance monitoring challenges', 'customer acquisition costs', 'legacy system limitations', 'fraud detection gaps'],
    'Manufacturing': ['supply chain disruptions', 'quality control inconsistencies', 'production bottlenecks', 'inventory management inefficiencies', 'equipment downtime'],
    'Retail': ['inventory forecasting challenges', 'customer retention issues', 'omnichannel integration difficulties', 'personalization limitations', 'operational inefficiencies'],
    'Education': ['student engagement challenges', 'administrative overhead', 'remote learning limitations', 'data management complexities', 'resource allocation inefficiencies']
  };
  
  if (industry && painPoints[industry]) {
    const industryPains = painPoints[industry];
    return industryPains[Math.floor(Math.random() * industryPains.length)];
  }
  
  // Default pain points for unknown industry
  const defaultPains = ['operational inefficiencies', 'growth challenges', 'resource constraints', 'competitive pressures', 'market adaptation difficulties'];
  return defaultPains[Math.floor(Math.random() * defaultPains.length)];
}

// Helper function for benefits
function generateBenefit(industry?: string): string {
  const benefits: Record<string, string[]> = {
    'Technology': ['streamline your development process', 'enhance system security', 'improve data integration', 'accelerate digital transformation', 'optimize IT infrastructure'],
    'Healthcare': ['improve patient outcomes', 'streamline clinical workflows', 'enhance regulatory compliance', 'reduce administrative burden', 'optimize resource utilization'],
    'Finance': ['mitigate financial risks', 'automate compliance processes', 'enhance customer financial insights', 'optimize investment strategies', 'streamline reporting'],
    'Manufacturing': ['optimize production efficiency', 'reduce supply chain disruptions', 'improve quality control', 'minimize equipment downtime', 'enhance inventory management'],
    'Retail': ['increase customer retention', 'optimize inventory forecasting', 'enhance omnichannel experience', 'personalize customer interactions', 'streamline operations'],
    'Education': ['boost student engagement', 'streamline administrative processes', 'enhance learning outcomes', 'improve data-driven decision making', 'optimize resource allocation']
  };
  
  if (industry && benefits[industry]) {
    const industryBenefits = benefits[industry];
    return industryBenefits[Math.floor(Math.random() * industryBenefits.length)];
  }
  
  // Default benefits for unknown industry
  const defaultBenefits = ['improve operational efficiency', 'drive strategic growth', 'enhance decision-making', 'streamline key processes', 'optimize resource utilization'];
  return defaultBenefits[Math.floor(Math.random() * defaultBenefits.length)];
}