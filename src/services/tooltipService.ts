/**
 * Tooltip Service
 * Manages tooltip configurations from Supabase with in-memory caching
 */

import { supabase } from '../lib/supabase';

export interface TooltipConfiguration {
  id: string;
  feature_id: string;
  feature_name: string;
  tooltip_title: string;
  tooltip_description: string;
  tooltip_features: string[];
  tooltip_category: string | null;
  position_preference: 'top' | 'bottom' | 'left' | 'right';
  delay_ms: number;
  show_arrow: boolean;
  max_width: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TooltipCategory {
  id: string;
  category_name: string;
  category_description: string | null;
  display_order: number;
  created_at: string;
}

class TooltipService {
  private tooltipCache: Map<string, TooltipConfiguration> = new Map();
  private categoryCache: Map<string, TooltipCategory> = new Map();
  private isInitialized: boolean = false;
  private initializationPromise: Promise<void> | null = null;
  private lastFetchTime: number = 0;
  private readonly CACHE_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

  /**
   * Initialize the tooltip service by loading all configurations from Supabase
   */
  async initialize(): Promise<void> {
    // If already initializing, return the existing promise
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    // If already initialized and cache is fresh, skip
    if (this.isInitialized && Date.now() - this.lastFetchTime < this.CACHE_REFRESH_INTERVAL) {
      return;
    }

    this.initializationPromise = this.loadTooltipConfigurations();

    try {
      await this.initializationPromise;
      this.isInitialized = true;
    } finally {
      this.initializationPromise = null;
    }
  }

  /**
   * Load all active tooltip configurations from Supabase
   */
  private async loadTooltipConfigurations(): Promise<void> {
    try {
      console.log('Loading tooltip configurations from Supabase...');

      // Fetch categories
      const { data: categories, error: categoryError } = await supabase
        .from('tooltip_categories')
        .select('*')
        .order('display_order', { ascending: true });

      if (categoryError) {
        console.error('Failed to load tooltip categories:', categoryError);
      } else if (categories) {
        this.categoryCache.clear();
        categories.forEach(category => {
          this.categoryCache.set(category.category_name, category);
        });
        console.log(`Loaded ${categories.length} tooltip categories`);
      }

      // Fetch tooltip configurations
      const { data: tooltips, error: tooltipError } = await supabase
        .from('tooltip_configurations')
        .select('*')
        .eq('is_active', true);

      if (tooltipError) {
        console.error('Failed to load tooltip configurations:', tooltipError);
        // Don't throw - use default fallback tooltips
        return;
      }

      if (tooltips) {
        this.tooltipCache.clear();
        tooltips.forEach((tooltip: any) => {
          this.tooltipCache.set(tooltip.feature_id, tooltip);
        });
        this.lastFetchTime = Date.now();
        console.log(`Loaded ${tooltips.length} tooltip configurations into cache`);
      }
    } catch (error) {
      console.error('Error loading tooltip configurations:', error);
      // Service continues with empty cache or previous cache
    }
  }

  /**
   * Get tooltip configuration by feature ID
   */
  getTooltip(featureId: string): TooltipConfiguration | null {
    // Check if we need to refresh cache
    if (Date.now() - this.lastFetchTime > this.CACHE_REFRESH_INTERVAL) {
      // Trigger background refresh without blocking
      this.initialize().catch(err =>
        console.warn('Background tooltip refresh failed:', err)
      );
    }

    return this.tooltipCache.get(featureId) || null;
  }

  /**
   * Get all tooltips for a specific category
   */
  getTooltipsByCategory(categoryName: string): TooltipConfiguration[] {
    const tooltips: TooltipConfiguration[] = [];
    this.tooltipCache.forEach(tooltip => {
      if (tooltip.tooltip_category === categoryName) {
        tooltips.push(tooltip);
      }
    });
    return tooltips;
  }

  /**
   * Get all available categories
   */
  getCategories(): TooltipCategory[] {
    return Array.from(this.categoryCache.values());
  }

  /**
   * Force refresh the tooltip cache
   */
  async refresh(): Promise<void> {
    this.lastFetchTime = 0;
    await this.initialize();
  }

  /**
   * Check if tooltip exists for a feature
   */
  hasTooltip(featureId: string): boolean {
    return this.tooltipCache.has(featureId);
  }

  /**
   * Get tooltip count (useful for debugging)
   */
  getTooltipCount(): number {
    return this.tooltipCache.size;
  }

  /**
   * Create a default tooltip configuration for fallback
   */
  createDefaultTooltip(
    featureId: string,
    title: string,
    description: string
  ): TooltipConfiguration {
    return {
      id: `default-${featureId}`,
      feature_id: featureId,
      feature_name: title,
      tooltip_title: title,
      tooltip_description: description,
      tooltip_features: [],
      tooltip_category: null,
      position_preference: 'top',
      delay_ms: 300,
      show_arrow: true,
      max_width: '320px',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  /**
   * Clear all caches (useful for testing)
   */
  clearCache(): void {
    this.tooltipCache.clear();
    this.categoryCache.clear();
    this.isInitialized = false;
    this.lastFetchTime = 0;
  }
}

// Export singleton instance
export const tooltipService = new TooltipService();

// Auto-initialize on module load (non-blocking)
tooltipService.initialize().catch(err =>
  console.warn('Failed to initialize tooltip service on load:', err)
);
