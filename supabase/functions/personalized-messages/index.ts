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
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    
    if (!openaiApiKey && !geminiApiKey) {
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

      // Generate personalized message based on contact data
      const result = await generatePersonalizedMessage(
        contact, 
        platform, 
        purpose || 'introduction', 
        tone, 
        length, 
        openaiApiKey, 
        geminiApiKey
      );

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

async function generatePersonalizedMessage(
  contact: any, 
  platform: string,
  purpose: string,
  tone: string,
  length: string,
  openaiApiKey?: string,
  geminiApiKey?: string
): Promise<any> {
  // Determine character limits based on platform and length
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
      message = generateIntroductionMessage(contact, platform, greeting);
      break;
    case 'follow-up':
      message = generateFollowUpMessage(contact, platform, greeting);
      break;
    case 'meeting-request':
      message = generateMeetingRequestMessage(contact, platform, greeting);
      break;
    case 'thank-you':
      message = generateThankYouMessage(contact, platform, greeting);
      break;
    case 'check-in':
      message = generateCheckInMessage(contact, platform, greeting);
      break;
    default:
      message = generateGenericMessage(contact, platform, greeting);
  }
  
  // Adjust tone
  message = adjustTone(message, tone);
  
  // Ensure message is within character limits
  if (message.length > characterLimits.max) {
    message = message.substring(0, characterLimits.max - 3) + '...';
  }
  
  // Generate confidence level - higher if we have real AI available
  const confidence = (openaiApiKey || geminiApiKey) ? 90 : 75;
  
  return {
    message,
    platform,
    purpose,
    tone,
    length,
    characterCount: message.length,
    characterLimit: characterLimits,
    confidence,
    model: openaiApiKey ? 'gpt-4o-mini' : geminiApiKey ? 'gemini-1.5-flash' : 'mock-model',
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

function generateIntroductionMessage(contact: any, platform: string, greeting: string): string {
  if (platform === 'linkedin') {
    return `${greeting}\n\nI noticed your profile and was impressed by your work at ${contact.company} as ${contact.title}. I work with professionals in the ${contact.industry || 'industry'} to help them solve ${generatePainPoint(contact.industry)}.\n\nWould you be open to connecting? I'd love to learn more about your work and share insights that might be valuable for you.\n\nLooking forward to connecting,\n[Your Name]`;
  } else if (platform === 'email') {
    return `${greeting}\n\nI hope this email finds you well. I'm reaching out because I noticed your work at ${contact.company} and thought there might be an opportunity for us to collaborate.\n\nAt [Company Name], we help professionals like you in the ${contact.industry || 'industry'} to overcome challenges such as ${generatePainPoint(contact.industry)}.\n\nI'd love to learn more about your current initiatives and explore how we might be able to support your goals. Would you be open to a brief 15-minute call next week?\n\nBest regards,\n[Your Name]\n[Your Title]\n[Company Name]`;
  } else if (platform === 'sms' || platform === 'whatsapp') {
    return `${greeting} I'm [Your Name] from [Company Name]. We help ${contact.industry || 'companies'} address ${generatePainPoint(contact.industry)}. Would you be open to a quick chat about how we might support your work at ${contact.company}?`;
  } else if (platform === 'twitter') {
    return `Hi, I'm [Name] from [Company]. Noticed your work at ${contact.company}. We help with ${generatePainPoint(contact.industry)}. Open to connecting?`;
  }
  
  return `${greeting}\n\nI'd like to introduce myself and learn more about your work at ${contact.company}. Would you be open to connecting?\n\n[Your Name]`;
}

function generateFollowUpMessage(contact: any, platform: string, greeting: string): string {
  if (platform === 'linkedin') {
    return `${greeting}\n\nI wanted to follow up on our recent conversation about ${generateIndustrySpecificPhrase(contact.industry)}. I thought you might find this resource helpful: [Resource Link]\n\nWould you be interested in discussing this further? I'm available next week if you'd like to connect.\n\nBest,\n[Your Name]`;
  } else if (platform === 'email') {
    return `${greeting}\n\nI hope you're doing well. I wanted to follow up on our recent conversation about how we could help ${contact.company} with ${generatePainPoint(contact.industry)}.\n\nAs discussed, I've attached the information about our solution that helps companies like yours ${generateBenefit(contact.industry)}.\n\nDo you have any questions I can address? I'm happy to schedule a call to discuss this further.\n\nBest regards,\n[Your Name]\n[Your Title]\n[Company Name]`;
  } else if (platform === 'sms' || platform === 'whatsapp') {
    return `${greeting} Following up on our conversation about ${generateIndustrySpecificPhrase(contact.industry)}. I'd be happy to provide more info or schedule a call. Let me know what works for you.`;
  } else if (platform === 'twitter') {
    return `Thanks for our chat about ${generateIndustrySpecificPhrase(contact.industry)}. Thought you might like this resource: [Link]. Open to discussing further?`;
  }
  
  return `${greeting}\n\nJust following up on our previous conversation. Let me know if you'd like to discuss further.\n\n[Your Name]`;
}

function generateMeetingRequestMessage(contact: any, platform: string, greeting: string): string {
  if (platform === 'linkedin') {
    return `${greeting}\n\nI'd like to schedule a meeting to discuss how we could help ${contact.company} with ${generatePainPoint(contact.industry)}.\n\nWould you be available for a 30-minute call next Tuesday or Thursday afternoon? If not, please let me know what times work best for you.\n\nLooking forward to speaking with you,\n[Your Name]`;
  } else if (platform === 'email') {
    return `${greeting}\n\nI hope this email finds you well. I'd like to schedule a meeting to discuss how [Company Name] can help ${contact.company} with ${generatePainPoint(contact.industry)}.\n\nOur team has worked with several companies in the ${contact.industry || 'industry'} to help them ${generateBenefit(contact.industry)}.\n\nWould you be available for a 30-minute call next Tuesday at 10am or Thursday at 2pm? If those times don't work, please let me know your availability and I'll be happy to accommodate your schedule.\n\nBest regards,\n[Your Name]\n[Your Title]\n[Company Name]\n[Phone Number]`;
  } else if (platform === 'sms' || platform === 'whatsapp') {
    return `${greeting} Would you be available for a quick call next week to discuss how we could help with ${generatePainPoint(contact.industry)}? I'm free Tuesday 10-12 or Thursday 2-4. Let me know what works for you.`;
  } else if (platform === 'twitter') {
    return `Hi ${contact.firstName || contact.name.split(' ')[0]}! Would love to schedule a quick call about ${generateIndustrySpecificPhrase(contact.industry)}. Available next Tues/Thurs?`;
  }
  
  return `${greeting}\n\nI'd like to schedule a meeting with you. Would you be available next week?\n\n[Your Name]`;
}

function generateThankYouMessage(contact: any, platform: string, greeting: string): string {
  if (platform === 'linkedin') {
    return `${greeting}\n\nThank you for taking the time to meet with me today. I really enjoyed our conversation about ${generateIndustrySpecificPhrase(contact.industry)} and learning more about your work at ${contact.company}.\n\nI'll follow up with the additional information we discussed. Looking forward to our next conversation!\n\nBest,\n[Your Name]`;
  } else if (platform === 'email') {
    return `${greeting}\n\nThank you for taking the time to meet with me today. I really enjoyed our conversation and learning more about your current initiatives at ${contact.company}.\n\nAs promised, I'll send over the additional information about how our solutions can help you ${generateBenefit(contact.industry)} by the end of the week.\n\nPlease don't hesitate to reach out if you have any questions in the meantime.\n\nBest regards,\n[Your Name]\n[Your Title]\n[Company Name]`;
  } else if (platform === 'sms' || platform === 'whatsapp') {
    return `${greeting} Thanks for your time today! I enjoyed learning about your work at ${contact.company}. I'll send the information we discussed shortly. Feel free to reach out with any questions!`;
  } else if (platform === 'twitter') {
    return `Thanks for the great conversation today, ${contact.firstName || contact.name.split(' ')[0]}! Looking forward to our next steps. Will follow up soon.`;
  }
  
  return `${greeting}\n\nThank you for your time. I really appreciate it and look forward to our next conversation.\n\n[Your Name]`;
}

function generateCheckInMessage(contact: any, platform: string, greeting: string): string {
  if (platform === 'linkedin') {
    return `${greeting}\n\nI hope you're doing well! I wanted to check in and see how things are going with ${generateIndustrySpecificPhrase(contact.industry)} at ${contact.company}.\n\nHave you had a chance to consider the solution we discussed for addressing ${generatePainPoint(contact.industry)}?\n\nI'm happy to answer any questions or provide additional information.\n\nBest,\n[Your Name]`;
  } else if (platform === 'email') {
    return `${greeting}\n\nI hope you've been well since we last connected. I wanted to check in and see how things are progressing with your initiatives at ${contact.company}.\n\nHave you had a chance to review the information I sent regarding how our solutions can help you ${generateBenefit(contact.industry)}?\n\nI'm available to discuss any questions you might have or to provide any additional information that would be helpful.\n\nBest regards,\n[Your Name]\n[Your Title]\n[Company Name]`;
  } else if (platform === 'sms' || platform === 'whatsapp') {
    return `${greeting} Just checking in to see how things are going at ${contact.company}. Have you had a chance to consider our discussion about ${generateIndustrySpecificPhrase(contact.industry)}? Happy to provide more info if needed.`;
  } else if (platform === 'twitter') {
    return `Hi ${contact.firstName || contact.name.split(' ')[0]}! Hope all is well. Any thoughts on our discussion about ${generateIndustrySpecificPhrase(contact.industry)}? Happy to help further!`;
  }
  
  return `${greeting}\n\nJust checking in to see how things are going. Let me know if there's anything I can help with.\n\n[Your Name]`;
}

function generateGenericMessage(contact: any, platform: string, greeting: string): string {
  if (platform === 'linkedin') {
    return `${greeting}\n\nI hope you're doing well. I wanted to connect regarding ${generateIndustrySpecificPhrase(contact.industry)} and how it relates to your work at ${contact.company}.\n\nWould you be open to continuing this conversation?\n\nBest,\n[Your Name]`;
  } else if (platform === 'email') {
    return `${greeting}\n\nI hope this email finds you well. I wanted to reach out regarding ${generateIndustrySpecificPhrase(contact.industry)} and how it might apply to your current initiatives at ${contact.company}.\n\nI'd welcome the opportunity to learn more about your specific needs and share how we've helped similar companies in the ${contact.industry || 'industry'}.\n\nWould you be open to a brief conversation in the coming weeks?\n\nBest regards,\n[Your Name]\n[Your Title]\n[Company Name]`;
  } else if (platform === 'sms' || platform === 'whatsapp') {
    return `${greeting} I wanted to touch base about ${generateIndustrySpecificPhrase(contact.industry)}. Would you be interested in discussing how this applies to your work at ${contact.company}?`;
  } else if (platform === 'twitter') {
    return `Hi ${contact.firstName || contact.name.split(' ')[0]}! Reaching out about ${generateIndustrySpecificPhrase(contact.industry)}. Would love to discuss how it applies to ${contact.company}.`;
  }
  
  return `${greeting}\n\nI hope you're doing well. I wanted to reach out about ${generateIndustrySpecificPhrase(contact.industry)}. Let me know if you'd like to discuss this further.\n\n[Your Name]`;
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

// Reusing helper functions from email-composer
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