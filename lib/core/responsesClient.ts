/**
 * GPT-5.2 Responses API Client
 * Advanced client supporting reasoning, verbosity, custom tools, and context management
 */

import { openai } from "./openaiClient";
import { logger } from "./logger";

export interface ReasoningConfig {
  effort: "none" | "low" | "medium" | "high" | "xhigh";
  generateSummary?: "auto" | "never";
  summary?: any[];
}

export interface VerbosityConfig {
  level: "low" | "medium" | "high";
}

export interface CustomTool {
  type: "custom" | "function";
  name: string;
  description: string;
  parameters?: any;
  grammar?: string; // For constrained outputs
}

export interface ToolChoice {
  type: "allowed_tools";
  mode: "auto" | "required";
  tools: string[]; // Tool names
}

export interface ResponsesAPIRequest {
  model: string;
  input: any[] | string;
  instructions?: string;
  reasoning?: ReasoningConfig;
  text?: {
    format?: any;
    verbosity?: "low" | "medium" | "high";
  };
  tools?: CustomTool[];
  toolChoice?: ToolChoice | "auto" | "required";
  previousResponseId?: string;
  include?: string[];
  store?: boolean;
  temperature?: number;
  maxOutputTokens?: number;
}

export interface ReasoningItem {
  id: string;
  type: "reasoning";
  summary?: any[];
  encryptedContent?: string;
}

export interface MessageItem {
  id: string;
  type: "message";
  role: "user" | "assistant";
  content: Array<{
    type: "input_text" | "output_text";
    text: string;
    annotations?: any[];
  }>;
  status: "completed" | "incomplete";
}

export interface FunctionCallItem {
  id: string;
  type: "function_call";
  name: string;
  arguments: string;
  callId: string;
  status: "completed" | "failed";
}

export type ResponseOutputItem = ReasoningItem | MessageItem | FunctionCallItem;

export interface ResponsesAPIResponse {
  id: string;
  createdAt: number;
  model: string;
  output: ResponseOutputItem[];
  usage: {
    inputTokens: number;
    inputTokensDetails: {
      cachedTokens: number;
    };
    outputTokens: number;
    outputTokensDetails: {
      reasoningTokens: number;
    };
    totalTokens: number;
  };
  reasoning?: {
    effort: string;
    generateSummary?: string;
    summary?: any[];
  };
  incompleteDetails?: any;
  error?: any;
  status: "completed" | "incomplete" | "failed";
}

/**
 * Enhanced GPT-5.2 Responses API client with full feature support
 */
export class ResponsesClient {
  private reasoningItems: Map<string, ReasoningItem> = new Map();

  /**
   * Make a request to GPT-5.2 using the Responses API
   */
  async createResponse(request: ResponsesAPIRequest): Promise<ResponsesAPIResponse> {
    const startTime = Date.now();

    try {
      logger.debug("Making GPT-5.2 Responses API request", {
        model: request.model,
        hasTools: !!request.tools?.length,
        reasoningEffort: request.reasoning?.effort,
        verbosity: request.text?.verbosity
      });

      // Add reasoning items from previous responses if available
      if (request.previousResponseId) {
        const previousItems = this.getReasoningItemsForResponse(request.previousResponseId);
        if (previousItems.length > 0) {
          request.input = Array.isArray(request.input)
            ? [...previousItems, ...request.input]
            : [request.input];
        }
      }

      const response = await openai.responses.create(request as any);

      const result: ResponsesAPIResponse = {
        id: response.id,
        createdAt: response.created_at,
        model: response.model,
        output: response.output,
        usage: response.usage,
        reasoning: response.reasoning,
        incompleteDetails: response.incomplete_details,
        error: response.error,
        status: response.status
      };

      // Store reasoning items for future use
      this.storeReasoningItems(result.id, result.output);

      logger.info("GPT-5.2 Responses API request completed", {
        responseId: result.id,
        model: result.model,
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        reasoningTokens: result.usage.outputTokensDetails.reasoningTokens,
        processingTime: Date.now() - startTime
      });

      return result;

    } catch (error) {
      logger.error("GPT-5.2 Responses API request failed", error as Error, {
        model: request.model,
        processingTime: Date.now() - startTime
      });
      throw error;
    }
  }

  /**
   * Extract text content from response output
   */
  extractTextContent(output: ResponseOutputItem[]): string {
    const messageItem = output.find(
      item => item.type === "message" && item.role === "assistant"
    ) as MessageItem;

    if (!messageItem?.content) return "";

    return messageItem.content
      .filter(content => content.type === "output_text")
      .map(content => content.text)
      .join("");
  }

  /**
   * Extract reasoning summaries from response
   */
  extractReasoningSummaries(output: ResponseOutputItem[]): any[] {
    const reasoningItem = output.find(item => item.type === "reasoning") as ReasoningItem;
    return reasoningItem?.summary || [];
  }

  /**
   * Extract function calls from response
   */
  extractFunctionCalls(output: ResponseOutputItem[]): FunctionCallItem[] {
    return output.filter(item => item.type === "function_call") as FunctionCallItem[];
  }

  /**
   * Store reasoning items for future responses
   */
  private storeReasoningItems(responseId: string, output: ResponseOutputItem[]): void {
    const reasoningItems = output.filter(item => item.type === "reasoning") as ReasoningItem[];
    reasoningItems.forEach(item => {
      this.reasoningItems.set(`${responseId}_${item.id}`, item);
    });
  }

  /**
   * Get reasoning items for a previous response
   */
  private getReasoningItemsForResponse(responseId: string): ReasoningItem[] {
    const items: ReasoningItem[] = [];
    for (const [key, item] of this.reasoningItems) {
      if (key.startsWith(`${responseId}_`)) {
        items.push(item);
      }
    }
    return items;
  }

  /**
   * Clear stored reasoning items (for memory management)
   */
  clearReasoningItems(responseId?: string): void {
    if (responseId) {
      // Clear items for specific response
      for (const key of this.reasoningItems.keys()) {
        if (key.startsWith(`${responseId}_`)) {
          this.reasoningItems.delete(key);
        }
      }
    } else {
      // Clear all items
      this.reasoningItems.clear();
    }
  }

  /**
   * Get usage statistics
   */
  getUsageStats(): {
    totalReasoningItems: number;
    cacheHitRate: number;
    averageReasoningTokens: number;
  } {
    // This would be enhanced with actual metrics tracking
    return {
      totalReasoningItems: this.reasoningItems.size,
      cacheHitRate: 0, // To be implemented
      averageReasoningTokens: 0 // To be implemented
    };
  }
}

// Export singleton instance
export const responsesClient = new ResponsesClient();