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

export interface AIModel {
  id: string;
  name: string;
  capabilities: string[];
  maxTokens: number;
  costPer1kTokens?: number;
  description: string;
}

export interface AIProviderConfig {
  name: string;
  enabled: boolean;
  apiKey?: string;
  endpoint: ApiEndpoint;
  capabilities: string[];
  priority: number;
  models: AIModel[];
  defaultModel: string;
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
    baseURL: import.meta.env.VITE_CONTACTS_API_URL || 'http://localhost:3001/api',
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
      apiKey: import.meta.env.VITE_OPENAI_API_KEY,
      endpoint: {
        baseURL: 'https://api.openai.com/v1',
        timeout: 45000,
        retries: 2,
        rateLimit: {
          maxRequests: 50,
          windowMs: 60000,
        },
      },
      capabilities: ['enrichment', 'analysis', 'categorization', 'tagging', 'chat', 'completion'],
      priority: 1,
      defaultModel: 'gpt-4o',
      models: [
        {
          id: 'gpt-4o',
          name: 'GPT-4 Omni',
          capabilities: ['chat', 'completion', 'analysis', 'enrichment'],
          maxTokens: 128000,
          costPer1kTokens: 0.005,
          description: 'Most capable GPT-4 model with vision and advanced reasoning'
        },
        {
          id: 'gpt-4o-mini',
          name: 'GPT-4 Omni Mini',
          capabilities: ['chat', 'completion', 'analysis'],
          maxTokens: 128000,
          costPer1kTokens: 0.00015,
          description: 'Faster and cheaper GPT-4 model for most tasks'
        },
        {
          id: 'gpt-4-turbo',
          name: 'GPT-4 Turbo',
          capabilities: ['chat', 'completion', 'analysis'],
          maxTokens: 128000,
          costPer1kTokens: 0.01,
          description: 'High-performance GPT-4 model with latest training data'
        },
        {
          id: 'gpt-3.5-turbo',
          name: 'GPT-3.5 Turbo',
          capabilities: ['chat', 'completion'],
          maxTokens: 16385,
          costPer1kTokens: 0.0005,
          description: 'Fast and efficient model for simple tasks'
        }
      ],
    },
    
    gemini: {
      name: 'Google Gemini & Gemma',
      enabled: true,
      apiKey: import.meta.env.VITE_GEMINI_API_KEY,
      endpoint: {
        baseURL: 'https://generativelanguage.googleapis.com/v1beta',
        timeout: 45000,
        retries: 2,
        rateLimit: {
          maxRequests: 60,
          windowMs: 60000,
        },
      },
      capabilities: ['enrichment', 'analysis', 'relationships', 'chat', 'completion', 'vision'],
      priority: 2,
      defaultModel: 'gemini-2.0-flash-exp',
      models: [
        // Gemini 2.5 Flash Models
        {
          id: 'gemini-2.0-flash-exp',
          name: 'Gemini 2.0 Flash (Experimental)',
          capabilities: ['chat', 'completion', 'analysis', 'vision', 'multimodal'],
          maxTokens: 1048576,
          description: 'Latest experimental Gemini 2.0 model with flash performance and multimodal capabilities'
        },
        {
          id: 'gemini-1.5-flash',
          name: 'Gemini 1.5 Flash',
          capabilities: ['chat', 'completion', 'analysis', 'vision'],
          maxTokens: 1048576,
          description: 'Fast and efficient Gemini model optimized for speed'
        },
        {
          id: 'gemini-1.5-flash-8b',
          name: 'Gemini 1.5 Flash 8B',
          capabilities: ['chat', 'completion', 'analysis'],
          maxTokens: 1048576,
          description: 'Smaller, faster version of Gemini 1.5 Flash'
        },
        {
          id: 'gemini-1.5-pro',
          name: 'Gemini 1.5 Pro',
          capabilities: ['chat', 'completion', 'analysis', 'vision', 'enrichment'],
          maxTokens: 2097152,
          description: 'Most capable Gemini model for complex reasoning tasks'
        },
        
        // Gemma Models on Gemini API
        {
          id: 'gemma-2-2b-it',
          name: 'Gemma 2 2B Instruct',
          capabilities: ['chat', 'completion', 'instruction-following'],
          maxTokens: 8192,
          description: 'Lightweight Gemma 2 model optimized for instruction following and chat'
        },
        {
          id: 'gemma-2-9b-it',
          name: 'Gemma 2 9B Instruct', 
          capabilities: ['chat', 'completion', 'analysis', 'instruction-following'],
          maxTokens: 8192,
          description: 'Balanced Gemma 2 model with good performance for various tasks'
        },
        {
          id: 'gemma-2-27b-it',
          name: 'Gemma 2 27B Instruct',
          capabilities: ['chat', 'completion', 'analysis', 'enrichment', 'instruction-following'],
          maxTokens: 8192,
          description: 'Large Gemma 2 model with advanced reasoning capabilities'
        },
        {
          id: 'gemma-1.1-2b-it',
          name: 'Gemma 1.1 2B Instruct',
          capabilities: ['chat', 'completion', 'instruction-following'],
          maxTokens: 8192,
          description: 'Improved version of Gemma 2B with better instruction following'
        },
        {
          id: 'gemma-1.1-7b-it',
          name: 'Gemma 1.1 7B Instruct',
          capabilities: ['chat', 'completion', 'analysis', 'instruction-following'],
          maxTokens: 8192,
          description: 'Improved version of Gemma 7B with enhanced capabilities'
        },
        
        // Code-specific Gemma models
        {
          id: 'codegemma-2b',
          name: 'CodeGemma 2B',
          capabilities: ['code-generation', 'code-completion', 'code-analysis'],
          maxTokens: 8192,
          description: 'Specialized Gemma model for code generation and programming tasks'
        },
        {
          id: 'codegemma-7b-it',
          name: 'CodeGemma 7B Instruct',
          capabilities: ['code-generation', 'code-completion', 'code-analysis', 'instruction-following'],
          maxTokens: 8192,
          description: 'Instruction-tuned CodeGemma model for code-related conversations'
        }
      ],
    },
    
    anthropic: {
      name: 'Anthropic Claude',
      enabled: false,
      apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
      endpoint: {
        baseURL: 'https://api.anthropic.com/v1',
        timeout: 45000,
        retries: 2,
        rateLimit: {
          maxRequests: 50,
          windowMs: 60000,
        },
      },
      capabilities: ['analysis', 'categorization', 'chat', 'completion'],
      priority: 3,
      defaultModel: 'claude-3-5-sonnet-20241022',
      models: [
        {
          id: 'claude-3-5-sonnet-20241022',
          name: 'Claude 3.5 Sonnet',
          capabilities: ['chat', 'completion', 'analysis', 'vision'],
          maxTokens: 200000,
          costPer1kTokens: 0.003,
          description: 'Most intelligent Claude model with advanced reasoning'
        },
        {
          id: 'claude-3-5-haiku-20241022',
          name: 'Claude 3.5 Haiku',
          capabilities: ['chat', 'completion'],
          maxTokens: 200000,
          costPer1kTokens: 0.00025,
          description: 'Fastest Claude model for quick responses'
        },
        {
          id: 'claude-3-opus-20240229',
          name: 'Claude 3 Opus',
          capabilities: ['chat', 'completion', 'analysis', 'vision'],
          maxTokens: 200000,
          costPer1kTokens: 0.015,
          description: 'Most capable Claude model for complex tasks'
        }
      ],
    },
  },
  
  dataProcessing: {
    enrichment: {
      baseURL: import.meta.env.VITE_ENRICHMENT_API_URL || 'http://localhost:3002/api',
      timeout: 30000,
      retries: 2,
      rateLimit: {
        maxRequests: 200,
        windowMs: 60000,
      },
    },
    validation: {
      baseURL: import.meta.env.VITE_VALIDATION_API_URL || 'http://localhost:3003/api',
      timeout: 15000,
      retries: 1,
      rateLimit: {
        maxRequests: 500,
        windowMs: 60000,
      },
    },
    analytics: {
      baseURL: import.meta.env.VITE_ANALYTICS_API_URL || 'http://localhost:3004/api',
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
      baseURL: import.meta.env.VITE_AUTH_API_URL || 'http://localhost:3000/auth',
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
    level: (import.meta.env.VITE_LOG_LEVEL as any) || 'info',
    endpoint: import.meta.env.VITE_LOGGING_ENDPOINT,
    enableConsole: import.meta.env.MODE === 'development',
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
  
  if (!config.aiProviders.anthropic.apiKey && config.aiProviders.anthropic.enabled) {
    errors.push('Anthropic API key is required when Anthropic is enabled');
  }
  
  // Validate model configurations
  Object.entries(config.aiProviders).forEach(([providerName, provider]) => {
    if (provider.enabled) {
      if (!provider.models || provider.models.length === 0) {
        errors.push(`Provider ${providerName} must have at least one model configured`);
      }
      
      if (provider.defaultModel && !provider.models.some(m => m.id === provider.defaultModel)) {
        errors.push(`Default model ${provider.defaultModel} not found in ${providerName} models`);
      }
    }
  });
  
  return errors;
};

// Utility functions for model selection
export const getModelsByCapability = (capability: string): AIModel[] => {
  const models: AIModel[] = [];
  
  Object.values(config.aiProviders).forEach(provider => {
    if (provider.enabled) {
      provider.models.forEach(model => {
        if (model.capabilities.includes(capability)) {
          models.push(model);
        }
      });
    }
  });
  
  return models.sort((a, b) => (a.costPer1kTokens || 0) - (b.costPer1kTokens || 0));
};

export const getProviderModels = (providerName: keyof typeof config.aiProviders): AIModel[] => {
  const provider = config.aiProviders[providerName];
  return provider?.enabled ? provider.models : [];
};

export const getDefaultModel = (providerName: keyof typeof config.aiProviders): AIModel | null => {
  const provider = config.aiProviders[providerName];
  if (!provider?.enabled || !provider.defaultModel) return null;
  
  return provider.models.find(m => m.id === provider.defaultModel) || null;
};

export const getBestModelForTask = (capability: string, maxCost?: number): AIModel | null => {
  const models = getModelsByCapability(capability);
  
  if (maxCost) {
    const affordableModels = models.filter(m => !m.costPer1kTokens || m.costPer1kTokens <= maxCost);
    return affordableModels[0] || null;
  }
  
  return models[0] || null;
};