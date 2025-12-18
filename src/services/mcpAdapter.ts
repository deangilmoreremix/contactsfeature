/**
 * MCP Adapter Service
 * Connects to Rube/Composio MCP server and exposes tools as OpenAI-compatible functions
 */

import { logger } from './logger.service';
import { cacheService } from './cacheService';

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
  metadata?: Record<string, any>;
}

export interface MCPToolResult {
  tool_call_id: string;
  result: any;
  error?: string;
}

export interface OpenAIToolFormat {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, any>;
      required?: string[];
    };
  };
}

export class MCPAdapter {
  private static instance: MCPAdapter;
  private rubeServerUrl: string;
  private metorialServerUrl: string;
  private connectionStatus: Record<string, 'disconnected' | 'connecting' | 'connected' | 'error'> = {
    rube: 'disconnected',
    metorial: 'disconnected'
  };
  private cachedTools: Map<string, MCPTool> = new Map();
  private toolCacheExpiry: number = 5 * 60 * 1000; // 5 minutes

  private constructor() {
    this.rubeServerUrl = (import.meta.env as any).VITE_RUBE_MCP_SERVER_URL || 'http://localhost:3001';
    this.metorialServerUrl = (import.meta.env as any).VITE_METORIAL_MCP_SERVER_URL || 'https://api.metorial.com';
  }

  static getInstance(): MCPAdapter {
    if (!MCPAdapter.instance) {
      MCPAdapter.instance = new MCPAdapter();
    }
    return MCPAdapter.instance;
  }

  /**
    * Connect to a specific MCP server
    */
   async connect(server: 'rube' | 'metorial' = 'rube'): Promise<boolean> {
     try {
       if (this.connectionStatus[server] === 'connected') {
         return true;
       }

       const serverUrl = server === 'rube' ? this.rubeServerUrl : this.metorialServerUrl;
       logger.info(`Connecting to ${server} MCP server`, { url: serverUrl });
       this.connectionStatus[server] = 'connecting';

       // Test connection by fetching server info
       const response = await fetch(`${serverUrl}/health`, {
         method: 'GET',
         headers: {
           'Content-Type': 'application/json',
           ...(server === 'metorial' && (import.meta.env as any).VITE_METORIAL_API_KEY ? {
             'Authorization': `Bearer ${(import.meta.env as any).VITE_METORIAL_API_KEY}`
           } : {})
         }
       });

       if (!response.ok) {
         throw new Error(`${server} MCP server health check failed: ${response.status}`);
       }

       this.connectionStatus[server] = 'connected';
       logger.info(`Successfully connected to ${server} MCP server`);
       return true;
     } catch (error) {
       this.connectionStatus[server] = 'error';
       logger.error(`Failed to connect to ${server} MCP server`, error as Error);
       return false;
     }
   }

  /**
    * Disconnect from MCP server
    */
   async disconnect(server: 'rube' | 'metorial' = 'rube'): Promise<void> {
     this.connectionStatus[server] = 'disconnected';
     // Clear tools cache if disconnecting from the primary server
     if (server === 'rube') {
       this.cachedTools.clear();
     }
     logger.info(`Disconnected from ${server} MCP server`);
   }

  /**
    * Get connection status for a specific server
    */
   getConnectionStatus(server: 'rube' | 'metorial' = 'rube'): string {
     return this.connectionStatus[server] || 'disconnected';
   }

  /**
    * Discover available tools from MCP server
    */
   async discoverTools(server: 'rube' | 'metorial' = 'rube'): Promise<MCPTool[]> {
     try {
       if (this.connectionStatus[server] !== 'connected') {
         await this.connect(server);
       }

       // Check localStorage cache first
       const cacheKey = `${server}_mcp_tools_cache`;
       const cachedData = localStorage.getItem(cacheKey);
       if (cachedData) {
         const cached = JSON.parse(cachedData);
         if (Date.now() - cached.timestamp < this.toolCacheExpiry) {
           // Load cached tools for this server
           const serverTools = new Map(Object.entries(cached.tools));
           // Merge with existing cached tools
           serverTools.forEach((tool, name) => {
             this.cachedTools.set(`${server}_${name}`, tool);
           });
           return Array.from(serverTools.values());
         }
       }

       const serverUrl = server === 'rube' ? this.rubeServerUrl : this.metorialServerUrl;
       logger.info(`Discovering tools from ${server} MCP server`);

       const response = await fetch(`${serverUrl}/tools`, {
         method: 'GET',
         headers: {
           'Content-Type': 'application/json',
           ...(server === 'metorial' && (import.meta.env as any).VITE_METORIAL_API_KEY ? {
             'Authorization': `Bearer ${(import.meta.env as any).VITE_METORIAL_API_KEY}`
           } : {})
         }
       });

       if (!response.ok) {
         throw new Error(`Failed to discover tools from ${server}: ${response.status}`);
       }

       const tools: MCPTool[] = await response.json();

       // Cache tools in localStorage with server prefix
       const serverTools = new Map();
       tools.forEach(tool => {
         const toolKey = `${server}_${tool.name}`;
         this.cachedTools.set(toolKey, tool);
         serverTools.set(tool.name, tool);
       });

       localStorage.setItem(cacheKey, JSON.stringify({
         tools: Object.fromEntries(serverTools),
         timestamp: Date.now()
       }));

       logger.info(`Discovered ${server} MCP tools`, { count: tools.length });
       return tools;
     } catch (error) {
       logger.error(`Failed to discover ${server} MCP tools`, error as Error);
       return [];
     }
   }

  /**
   * Get a specific tool by name
   */
  async getTool(toolName: string): Promise<MCPTool | null> {
    // Check cache first
    if (this.cachedTools.has(toolName)) {
      return this.cachedTools.get(toolName)!;
    }

    // Discover all tools if not cached
    await this.discoverTools();
    return this.cachedTools.get(toolName) || null;
  }

  /**
   * Convert MCP tools to OpenAI tool format
   */
  async getOpenAITools(toolNames?: string[]): Promise<OpenAIToolFormat[]> {
    const tools = await this.discoverTools();
    const filteredTools = toolNames
      ? tools.filter(tool => toolNames.includes(tool.name))
      : tools;

    return filteredTools.map(tool => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema
      }
    }));
  }

  /**
   * Execute a tool via MCP server
   */
  async executeTool(toolName: string, args: Record<string, any>): Promise<any> {
    try {
      if (this.connectionStatus !== 'connected') {
        await this.connect();
      }

      logger.info('Executing MCP tool', { toolName, args: Object.keys(args) });

      const response = await fetch(`${this.mcpServerUrl}/tools/${toolName}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          arguments: args
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Tool execution failed: ${errorData.error || response.statusText}`);
      }

      const result = await response.json();
      logger.info('MCP tool executed successfully', { toolName });
      return result;
    } catch (error) {
      logger.error('MCP tool execution failed', error as Error, { toolName });
      throw error;
    }
  }

  /**
   * Execute multiple tools and format results for OpenAI
   */
  async executeTools(toolCalls: Array<{ id: string; name: string; arguments: Record<string, any> }>): Promise<MCPToolResult[]> {
    const results: MCPToolResult[] = [];

    for (const toolCall of toolCalls) {
      try {
        const result = await this.executeTool(toolCall.name, toolCall.arguments);
        results.push({
          tool_call_id: toolCall.id,
          result
        });
      } catch (error) {
        results.push({
          tool_call_id: toolCall.id,
          result: null,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  }

  /**
   * Handle OAuth authentication for external services
   */
  async initiateOAuth(service: string): Promise<{ authUrl: string; state: string }> {
    try {
      const response = await fetch(`${this.mcpServerUrl}/auth/${service}/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`OAuth initiation failed: ${response.status}`);
      }

      const authData = await response.json();
      return authData;
    } catch (error) {
      logger.error('OAuth initiation failed', error as Error, { service });
      throw error;
    }
  }

  /**
   * Complete OAuth flow
   */
  async completeOAuth(service: string, code: string, state: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.mcpServerUrl}/auth/${service}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code, state })
      });

      if (!response.ok) {
        throw new Error(`OAuth completion failed: ${response.status}`);
      }

      logger.info('OAuth flow completed successfully', { service });
      return true;
    } catch (error) {
      logger.error('OAuth completion failed', error as Error, { service });
      return false;
    }
  }

  /**
   * Check if a service is authenticated
   */
  async isAuthenticated(service: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.mcpServerUrl}/auth/${service}/status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        return false;
      }

      const status = await response.json();
      return status.authenticated || false;
    } catch (error) {
      logger.error('Failed to check authentication status', error as Error, { service });
      return false;
    }
  }

  /**
   * Refresh authentication tokens
   */
  async refreshAuth(service: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.mcpServerUrl}/auth/${service}/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.status}`);
      }

      logger.info('Authentication tokens refreshed', { service });
      return true;
    } catch (error) {
      logger.error('Token refresh failed', error as Error, { service });
      return false;
    }
  }
}

export const mcpAdapter = MCPAdapter.getInstance();
