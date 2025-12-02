import { supabase } from './supabaseClient';
import { logger } from './logger.service';

export interface NetlifyFunctionCall {
  functionName: string;
  payload: Record<string, any>;
  userId: string;
}

export interface NetlifyFunctionResponse {
  success: boolean;
  data?: any;
  error?: string;
  executionTime: number;
}

class NetlifyAdapter {
  private readonly NETLIFY_BASE_URL = '/.netlify/functions';

  /**
   * Call a Netlify function with authentication
   */
  async callFunction(call: NetlifyFunctionCall): Promise<NetlifyFunctionResponse> {
    const startTime = Date.now();

    try {
      // Get authentication token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('User must be authenticated');
      }

      const response = await fetch(`${this.NETLIFY_BASE_URL}/${call.functionName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(call.payload)
      });

      const executionTime = Date.now() - startTime;

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(`Function ${call.functionName} failed: ${errorData.error || response.statusText}`);
      }

      const data = await response.json();

      logger.info(`Netlify function ${call.functionName} executed successfully`, {
        executionTime,
        userId: call.userId
      });

      return {
        success: true,
        data,
        executionTime
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;

      logger.error(`Netlify function call failed: ${call.functionName}`, error as Error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime
      };
    }
  }

  /**
   * Batch call multiple functions
   */
  async batchCallFunctions(calls: NetlifyFunctionCall[]): Promise<NetlifyFunctionResponse[]> {
    const promises = calls.map(call => this.callFunction(call));
    return await Promise.all(promises);
  }

  /**
   * Get function metadata for tool definitions
   */
  getFunctionMetadata(functionName: string): {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, any>;
      required?: string[];
    };
  } | null {
    const functionMetadata: Record<string, any> = {
      'ai-enrichment': {
        name: 'ai-enrichment',
        description: 'AI contact scoring and lead qualification using GPT-4 and Gemini',
        parameters: {
          type: 'object',
          properties: {
            contact_id: {
              type: 'string',
              description: 'Contact ID to analyze'
            },
            include_social: {
              type: 'boolean',
              description: 'Include social media analysis'
            }
          },
          required: ['contact_id']
        }
      },
      'email-composer': {
        name: 'email-composer',
        description: 'Generate personalized emails with optional banner images',
        parameters: {
          type: 'object',
          properties: {
            contact: {
              type: 'object',
              description: 'Contact information'
            },
            purpose: {
              type: 'string',
              description: 'Email purpose (introduction, follow-up, proposal, etc.)'
            },
            generate_images: {
              type: 'boolean',
              description: 'Generate email banner images'
            }
          },
          required: ['contact', 'purpose']
        }
      },
      'deal-health-analysis': {
        name: 'deal-health-analysis',
        description: 'Analyze deal health and provide recommendations',
        parameters: {
          type: 'object',
          properties: {
            deal_id: {
              type: 'string',
              description: 'Deal ID to analyze'
            }
          },
          required: ['deal_id']
        }
      },
      'sales-forecasting': {
        name: 'sales-forecasting',
        description: 'Generate sales forecasts and predictions',
        parameters: {
          type: 'object',
          properties: {
            contact_id: {
              type: 'string',
              description: 'Contact ID'
            },
            deal_id: {
              type: 'string',
              description: 'Deal ID'
            },
            timeframe: {
              type: 'string',
              description: 'Forecast timeframe'
            }
          }
        }
      },
      'communication-optimization': {
        name: 'communication-optimization',
        description: 'Optimize communication strategies and sequences',
        parameters: {
          type: 'object',
          properties: {
            contact_id: {
              type: 'string',
              description: 'Contact ID'
            },
            communication_type: {
              type: 'string',
              description: 'Type of communication (email, call, social)'
            }
          },
          required: ['contact_id', 'communication_type']
        }
      },
      'discovery-questions': {
        name: 'discovery-questions',
        description: 'Generate strategic discovery questions for calls',
        parameters: {
          type: 'object',
          properties: {
            contact_id: {
              type: 'string',
              description: 'Contact ID'
            },
            industry: {
              type: 'string',
              description: 'Contact industry'
            }
          },
          required: ['contact_id']
        }
      },
      'semantic-search': {
        name: 'semantic-search',
        description: 'Search contacts and deals using semantic similarity',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query'
            },
            limit: {
              type: 'number',
              description: 'Maximum results'
            }
          },
          required: ['query']
        }
      },
      'generate-demo-visuals': {
        name: 'generate-demo-visuals',
        description: 'Generate presentation visuals using Gemini 2.5 Flash',
        parameters: {
          type: 'object',
          properties: {
            prompt: {
              type: 'string',
              description: 'Description of visuals needed'
            },
            contact_id: {
              type: 'string',
              description: 'Contact ID for context'
            },
            deal_id: {
              type: 'string',
              description: 'Deal ID for context'
            }
          },
          required: ['prompt']
        }
      },
      'contact-analytics': {
        name: 'contact-analytics',
        description: 'Analyze contact engagement and behavior patterns',
        parameters: {
          type: 'object',
          properties: {
            contact_id: {
              type: 'string',
              description: 'Contact ID to analyze'
            },
            timeframe: {
              type: 'string',
              description: 'Analysis timeframe'
            }
          },
          required: ['contact_id']
        }
      },
      'adaptive-playbook': {
        name: 'adaptive-playbook',
        description: 'Generate adaptive sales playbooks based on contact profile',
        parameters: {
          type: 'object',
          properties: {
            contact_id: {
              type: 'string',
              description: 'Contact ID'
            },
            deal_stage: {
              type: 'string',
              description: 'Current deal stage'
            }
          },
          required: ['contact_id']
        }
      }
    };

    return functionMetadata[functionName] || null;
  }

  /**
   * Validate function call parameters
   */
  validateFunctionCall(functionName: string, parameters: Record<string, any>): { valid: boolean; errors: string[] } {
    const metadata = this.getFunctionMetadata(functionName);
    if (!metadata) {
      return { valid: false, errors: [`Unknown function: ${functionName}`] };
    }

    const errors: string[] = [];
    const required = metadata.parameters.required || [];

    // Check required parameters
    for (const param of required) {
      if (!(param in parameters) || parameters[param] === null || parameters[param] === undefined) {
        errors.push(`Missing required parameter: ${param}`);
      }
    }

    return { valid: errors.length === 0, errors };
  }
}

export const netlifyAdapter = new NetlifyAdapter();