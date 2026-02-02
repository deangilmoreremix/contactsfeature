/**
 * Context Manager for GPT-5.2
 * Handles context compaction, reasoning item persistence, and memory management
 */

import { logger } from "./logger";

export interface ContextItem {
  id: string;
  type: "user" | "assistant" | "system" | "reasoning" | "function_call" | "function_result";
  content: string;
  timestamp: number;
  metadata?: {
    reasoningEffort?: string;
    confidence?: number;
    tokens?: number;
    importance?: number; // 0-1 scale for compaction decisions
  };
}

export interface CompactedContext {
  items: ContextItem[];
  summary: string;
  totalTokens: number;
  reasoningItems: string[]; // IDs of preserved reasoning items
  compactionRatio: number; // Original tokens / compacted tokens
}

export interface ContextManagerConfig {
  maxTokens: number;
  compactionThreshold: number; // When to trigger compaction (percentage of maxTokens)
  minImportanceThreshold: number; // Minimum importance to keep during compaction
  reasoningRetentionDays: number; // How long to keep reasoning items
  enableAutoCompaction: boolean;
}

export class ContextManager {
  private context: ContextItem[] = [];
  private reasoningItems: Map<string, ContextItem> = new Map();
  private config: ContextManagerConfig;

  constructor(config: Partial<ContextManagerConfig> = {}) {
    this.config = {
      maxTokens: 128000, // GPT-5.2 context window
      compactionThreshold: 0.8, // 80% of max tokens
      minImportanceThreshold: 0.3,
      reasoningRetentionDays: 7,
      enableAutoCompaction: true,
      ...config
    };
  }

  /**
   * Add a new item to the context
   */
  addItem(item: Omit<ContextItem, 'id' | 'timestamp'>): string {
    const contextItem: ContextItem = {
      ...item,
      id: this.generateId(),
      timestamp: Date.now()
    };

    this.context.push(contextItem);

    // Store reasoning items separately for persistence
    if (item.type === "reasoning") {
      this.reasoningItems.set(contextItem.id, contextItem);
    }

    // Auto-compact if enabled and threshold reached
    if (this.config.enableAutoCompaction) {
      this.checkAndCompact();
    }

    logger.debug("Added context item", {
      type: item.type,
      id: contextItem.id,
      contentLength: item.content.length
    });

    return contextItem.id;
  }

  /**
   * Get current context, potentially compacted
   */
  getContext(maxTokens?: number): ContextItem[] {
    const limit = maxTokens || this.config.maxTokens;

    if (this.getTotalTokens() <= limit) {
      return [...this.context];
    }

    return this.compactContext(limit).items;
  }

  /**
   * Get reasoning items for a specific response or time period
   */
  getReasoningItems(responseId?: string, since?: number): ContextItem[] {
    let items = Array.from(this.reasoningItems.values());

    if (responseId) {
      items = items.filter(item => item.id.startsWith(`${responseId}_`));
    }

    if (since) {
      items = items.filter(item => item.timestamp >= since);
    }

    // Sort by timestamp, most recent first
    return items.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Compact context to fit within token limit
   */
  compactContext(maxTokens: number): CompactedContext {
    const originalTokens = this.getTotalTokens();
    let items = [...this.context];

    // Always keep system messages and recent high-importance items
    const protectedItems = items.filter(item =>
      item.type === "system" ||
      (item.metadata?.importance || 0) >= 0.8
    );

    const unprotectedItems = items.filter(item =>
      item.type !== "system" &&
      (item.metadata?.importance || 0) < 0.8
    );

    // Sort unprotected items by importance and recency
    unprotectedItems.sort((a, b) => {
      const aScore = (a.metadata?.importance || 0) + (a.timestamp / Date.now()) * 0.3;
      const bScore = (b.metadata?.importance || 0) + (b.timestamp / Date.now()) * 0.3;
      return bScore - aScore; // Higher score first
    });

    // Build compacted context
    let compactedItems: ContextItem[] = [...protectedItems];
    let currentTokens = this.calculateTokens(protectedItems);

    // Add items until we hit the token limit
    for (const item of unprotectedItems) {
      const itemTokens = this.calculateTokens([item]);
      if (currentTokens + itemTokens <= maxTokens) {
        compactedItems.push(item);
        currentTokens += itemTokens;
      } else {
        break;
      }
    }

    // Create summary of removed items
    const removedItems = items.filter(item => !compactedItems.includes(item));
    const summary = this.createCompactionSummary(removedItems);

    // Add summary as a system message if items were removed
    if (removedItems.length > 0) {
      compactedItems.unshift({
        id: this.generateId(),
        type: "system",
        content: `Context compacted: ${summary}`,
        timestamp: Date.now(),
        metadata: { importance: 1.0 }
      });
    }

    const compactedTokens = this.calculateTokens(compactedItems);
    const compactionRatio = originalTokens / Math.max(compactedTokens, 1);

    const result: CompactedContext = {
      items: compactedItems,
      summary,
      totalTokens: compactedTokens,
      reasoningItems: compactedItems
        .filter(item => item.type === "reasoning")
        .map(item => item.id),
      compactionRatio
    };

    logger.info("Context compacted", {
      originalTokens,
      compactedTokens,
      compactionRatio: compactionRatio.toFixed(2),
      removedItems: removedItems.length
    });

    return result;
  }

  /**
   * Clean up old reasoning items
   */
  cleanupOldReasoningItems(): number {
    const cutoffTime = Date.now() - (this.config.reasoningRetentionDays * 24 * 60 * 60 * 1000);
    let removedCount = 0;

    for (const [id, item] of this.reasoningItems) {
      if (item.timestamp < cutoffTime) {
        this.reasoningItems.delete(id);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      logger.info("Cleaned up old reasoning items", { removedCount });
    }

    return removedCount;
  }

  /**
   * Get context statistics
   */
  getStats() {
    const totalTokens = this.getTotalTokens();
    const itemCount = this.context.length;
    const reasoningItemCount = this.reasoningItems.size;

    const typeBreakdown = this.context.reduce((acc, item) => {
      acc[item.type] = (acc[item.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalTokens,
      itemCount,
      reasoningItemCount,
      typeBreakdown,
      utilizationPercent: (totalTokens / this.config.maxTokens) * 100,
      needsCompaction: totalTokens > this.config.maxTokens * this.config.compactionThreshold
    };
  }

  /**
   * Clear all context
   */
  clear(): void {
    this.context = [];
    this.reasoningItems.clear();
    logger.info("Context cleared");
  }

  /**
   * Private methods
   */
  private generateId(): string {
    return `ctx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getTotalTokens(): number {
    return this.calculateTokens(this.context);
  }

  private calculateTokens(items: ContextItem[]): number {
    // Rough estimation: ~4 characters per token
    return items.reduce((total, item) => total + Math.ceil(item.content.length / 4), 0);
  }

  private checkAndCompact(): void {
    const totalTokens = this.getTotalTokens();
    if (totalTokens > this.config.maxTokens * this.config.compactionThreshold) {
      this.compactContext(this.config.maxTokens * 0.9); // Leave 10% buffer
    }
  }

  private createCompactionSummary(removedItems: ContextItem[]): string {
    if (removedItems.length === 0) return "No items removed";

    const typeCounts = removedItems.reduce((acc, item) => {
      acc[item.type] = (acc[item.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const typeSummary = Object.entries(typeCounts)
      .map(([type, count]) => `${count} ${type}`)
      .join(", ");

    const oldestItem = removedItems.reduce((oldest, item) =>
      item.timestamp < oldest.timestamp ? item : oldest
    );

    const timeAgo = Math.floor((Date.now() - oldestItem.timestamp) / (1000 * 60 * 60)); // hours ago

    return `Removed ${removedItems.length} items (${typeSummary}) from ${timeAgo} hours ago`;
  }
}

// Export singleton instance
export const contextManager = new ContextManager();