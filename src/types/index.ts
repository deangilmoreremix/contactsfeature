// Central export for all types
export * from './contact';
export * from './deal';

// Additional utility types
export interface ApiResponse<T = any> {
  data: T;
  status: number;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T = any> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface SearchFilters {
  search?: string;
  interestLevel?: string;
  status?: string;
  industry?: string;
  sources?: string[];
  tags?: string[];
  hasAIScore?: boolean;
  scoreRange?: { min: number; max: number };
  dateRange?: { start: string; end: string };
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AIAnalysisResult {
  contactId: string;
  score?: number;
  confidence?: number;
  insights?: string[];
  recommendations?: string[];
  categories?: string[];
  tags?: string[];
  provider?: string;
  model?: string;
  timestamp?: string;
  processingTime?: number;
}

export interface BulkOperationResult<T = any> {
  successful: T[];
  failed: Array<{ id: string; error: string }>;
  summary: {
    total: number;
    successful: number;
    failed: number;
    processingTime: number;
  };
}

// Common enums
export enum ContactStatus {
  ACTIVE = 'active',
  PENDING = 'pending',
  INACTIVE = 'inactive',
  LEAD = 'lead',
  PROSPECT = 'prospect',
  CUSTOMER = 'customer',
  CHURNED = 'churned'
}

export enum InterestLevel {
  HOT = 'hot',
  MEDIUM = 'medium',
  LOW = 'low',
  COLD = 'cold'
}

export enum DealStatus {
  OPEN = 'open',
  WON = 'won',
  LOST = 'lost',
  CANCELLED = 'cancelled'
}

export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}