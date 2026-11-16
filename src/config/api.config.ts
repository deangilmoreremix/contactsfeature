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
    [provider: string]: AIProviderConfig;
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

// Get Supabase URL and anon key from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const isDevMode = import.meta.env.DEV || import.meta.env.VITE_ENV === 'development';

// Updated base URL for API endpoints to use Supabase Edge Functions
// Use a safe fallback for development mode to prevent unnecessary errors
const apiBaseUrl = supabaseUrl ? 
  `${supabaseUrl}/functions/v1` : 
  'http://localhost:3001/api';

const config: ApiConfig = {
  contactsAPI: {
    baseURL: apiBaseUrl,
    timeout: 30000,
    retries: 3,
    rateLimit: {
      maxRequests: 100,
      windowMs: 60000, // 1 minute
    },
  },
  
  // AI is served exclusively through the server-side proxy (src/services/aiClient.ts).
  // No provider keys or vendor endpoints exist in browser code; "models" are roles, and the
  // real model ids are resolved server-side from src/config/models.json.
  aiProviders: {
    openai: {
      name: 'SmartCRM AI (server proxy)',
      enabled: true,
      endpoint: {
        baseURL: '/.netlify/functions',
        timeout: 60000,
        retries: 1,
        rateLimit: {
          maxRequests: 50,
          windowMs: 60000,
        },
      },
      capabilities: ['enrichment', 'analysis', 'categorization', 'tagging', 'chat', 'completion'],
      priority: 1,
      defaultModel: 'default',
      models: [
        { id: 'default', name: 'Balanced', capabilities: ['chat', 'completion', 'analysis', 'enrichment'], maxTokens: 128000, description: 'Balanced role for general tasks' },
        { id: 'thinking', name: 'Deep reasoning', capabilities: ['chat', 'completion', 'analysis', 'enrichment'], maxTokens: 128000, description: 'Deep reasoning role for research and analysis' },
        { id: 'fast', name: 'Fast', capabilities: ['chat', 'completion'], maxTokens: 128000, description: 'Fast role for summaries and UI helpers' },
        { id: 'pro', name: 'Pro', capabilities: ['analysis', 'enrichment'], maxTokens: 128000, description: 'Heavy analytics role' },
      ],
    },
  },
  
  dataProcessing: {
    enrichment: {
      baseURL: `${apiBaseUrl}/ai-enrichment`,
      timeout: 30000,
      retries: 2,
      rateLimit: {
        maxRequests: 200,
        windowMs: 60000,
      },
    },
    validation: {
      baseURL: `${apiBaseUrl}/validation`,
      timeout: 15000,
      retries: 1,
      rateLimit: {
        maxRequests: 500,
        windowMs: 60000,
      },
    },
    analytics: {
      baseURL: `${apiBaseUrl}/analytics`,
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
      baseURL: import.meta.env.VITE_AUTH_API_URL || `${apiBaseUrl}/auth`,
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