/**
 * API Configuration
 * Central configuration for all API endpoints, authentication, and settings
 */

export interface ApiEndpoint {
  baseURL: string;
  timeout: number;
  retries: number;
  rateLimit: {
    maxRequests: number;
    windowMs: number;
  };
}

export interface AIProviderConfig {
  name: string;
  enabled: boolean;
  apiKey?: string;
  endpoint: ApiEndpoint;
  capabilities: string[];
  priority: number;
}

export interface ApiConfig {
  // Contact Management API
  contactsAPI: ApiEndpoint;
  
  // AI Providers
  aiProviders: {
    openai: AIProviderConfig;
    gemini: AIProviderConfig;
    anthropic: AIProviderConfig;
  };
  
  // Data Processing Services
  dataProcessing: {
    enrichment: ApiEndpoint;
    validation: ApiEndpoint;
    analytics: ApiEndpoint;
  };
  
  // Authentication
  auth: {
    endpoint: ApiEndpoint;
    tokenKey: string;
    refreshTokenKey: string;
    tokenExpiry: number;
  };
  
  // Cache Configuration
  cache: {
    defaultTTL: number;
    maxSize: number;
    keyPrefix: string;
  };
  
  // Logging
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    endpoint?: string;
    enableConsole: boolean;
  };
}

const config: ApiConfig = {
  contactsAPI: {
    baseURL: process.env.VITE_CONTACTS_API_URL || 'http://localhost:3001/api',
    timeout: 30000,
    retries: 3,
    rateLimit: {
      maxRequests: 100,
      windowMs: 60000, // 1 minute
    },
  },
  
  aiProviders: {
    openai: {
      name: 'OpenAI',
      enabled: true,
      apiKey: process.env.VITE_OPENAI_API_KEY,
      endpoint: {
        baseURL: 'https://api.openai.com/v1',
        timeout: 45000,
        retries: 2,
        rateLimit: {
          maxRequests: 50,
          windowMs: 60000,
        },
      },
      capabilities: ['enrichment', 'analysis', 'categorization', 'tagging'],
      priority: 1,
    },
    
    gemini: {
      name: 'Google Gemini',
      enabled: true,
      apiKey: process.env.VITE_GEMINI_API_KEY,
      endpoint: {
        baseURL: 'https://generativelanguage.googleapis.com/v1beta',
        timeout: 45000,
        retries: 2,
        rateLimit: {
          maxRequests: 60,
          windowMs: 60000,
        },
      },
      capabilities: ['enrichment', 'analysis', 'relationships'],
      priority: 2,
    },
    
    anthropic: {
      name: 'Anthropic Claude',
      enabled: false,
      apiKey: process.env.VITE_ANTHROPIC_API_KEY,
      endpoint: {
        baseURL: 'https://api.anthropic.com/v1',
        timeout: 45000,
        retries: 2,
        rateLimit: {
          maxRequests: 50,
          windowMs: 60000,
        },
      },
      capabilities: ['analysis', 'categorization'],
      priority: 3,
    },
  },
  
  dataProcessing: {
    enrichment: {
      baseURL: process.env.VITE_ENRICHMENT_API_URL || 'http://localhost:3002/api',
      timeout: 30000,
      retries: 2,
      rateLimit: {
        maxRequests: 200,
        windowMs: 60000,
      },
    },
    validation: {
      baseURL: process.env.VITE_VALIDATION_API_URL || 'http://localhost:3003/api',
      timeout: 15000,
      retries: 1,
      rateLimit: {
        maxRequests: 500,
        windowMs: 60000,
      },
    },
    analytics: {
      baseURL: process.env.VITE_ANALYTICS_API_URL || 'http://localhost:3004/api',
      timeout: 20000,
      retries: 2,
      rateLimit: {
        maxRequests: 100,
        windowMs: 60000,
      },
    },
  },
  
  auth: {
    endpoint: {
      baseURL: process.env.VITE_AUTH_API_URL || 'http://localhost:3000/auth',
      timeout: 10000,
      retries: 1,
      rateLimit: {
        maxRequests: 20,
        windowMs: 60000,
      },
    },
    tokenKey: 'smartcrm_access_token',
    refreshTokenKey: 'smartcrm_refresh_token',
    tokenExpiry: 3600000, // 1 hour
  },
  
  cache: {
    defaultTTL: 300000, // 5 minutes
    maxSize: 1000,
    keyPrefix: 'smartcrm_cache_',
  },
  
  logging: {
    level: (process.env.VITE_LOG_LEVEL as any) || 'info',
    endpoint: process.env.VITE_LOGGING_ENDPOINT,
    enableConsole: process.env.NODE_ENV === 'development',
  },
};

export default config;

// Environment validation
export const validateConfig = (): string[] => {
  const errors: string[] = [];
  
  if (!config.aiProviders.openai.apiKey && config.aiProviders.openai.enabled) {
    errors.push('OpenAI API key is required when OpenAI is enabled');
  }
  
  if (!config.aiProviders.gemini.apiKey && config.aiProviders.gemini.enabled) {
    errors.push('Gemini API key is required when Gemini is enabled');
  }
  
  // Add more validations as needed
  
  return errors;
};