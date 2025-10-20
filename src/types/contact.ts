/**
 * Activity log entry for tracking contact interactions
 */
export interface ActivityLogEntry {
  id: string;
  type: 'email' | 'call' | 'meeting' | 'note' | 'ai_analysis' | 'import' | 'export';
  description: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

/**
 * Custom fields with proper typing
 */
export interface CustomFields {
  [key: string]: string | number | boolean | Date | null;
}

/**
 * Gamification statistics for user engagement
 */
export interface GamificationStats {
  points: number;
  level: number;
  badges: string[];
  achievements: Array<{
    id: string;
    name: string;
    description: string;
    unlockedAt: string;
  }>;
  streak: {
    current: number;
    longest: number;
    lastActivity: string;
  };
}

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  phone?: string;
  title: string;
  company: string;
  industry?: string;
  avatarSrc: string;
  sources: string[];
  interestLevel: 'hot' | 'medium' | 'low' | 'cold';
  status: 'active' | 'pending' | 'inactive' | 'lead' | 'prospect' | 'customer' | 'churned';
  lastConnected?: string;
  notes?: string;
  aiScore?: number;
  tags?: string[];
  isFavorite?: boolean;
  socialProfiles?: {
    linkedin?: string;
    twitter?: string;
    website?: string;
    whatsapp?: string;
    facebook?: string;
    instagram?: string;
  };
  customFields?: CustomFields;
  createdAt: string;
  updatedAt: string;
  activityLog?: ActivityLogEntry[];
  nextSendDate?: string;
  isTeamMember?: boolean;
  role?: string;
  gamificationStats?: GamificationStats;

  // NEW: Mock data classification fields
  isMockData?: boolean;           // Flag for mock/example data
  isExample?: boolean;            // Flag for demo/example records
  dataSource?: 'mock' | 'real' | 'imported' | 'manual'; // Source of data
  createdBy?: 'system' | 'user' | 'demo'; // Who created this record
  mockDataType?: 'sample' | 'demo' | 'test'; // Type of mock data
}

export interface ContactCreateRequest {
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  phone?: string;
  title: string;
  company: string;
  industry?: string;
  avatarSrc?: string;
  sources?: string[];
  interestLevel?: Contact['interestLevel'];
  status?: Contact['status'];
  notes?: string;
  tags?: string[];
  isFavorite?: boolean;
  socialProfiles?: Contact['socialProfiles'];
  customFields?: CustomFields;

  // NEW: Mock data classification fields
  isMockData?: boolean;
  isExample?: boolean;
  dataSource?: Contact['dataSource'];
  createdBy?: Contact['createdBy'];
  mockDataType?: Contact['mockDataType'];
}

export interface ContactUpdateRequest {
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  phone?: string;
  title?: string;
  company?: string;
  industry?: string;
  avatarSrc?: string;
  sources?: string[];
  interestLevel?: Contact['interestLevel'];
  status?: Contact['status'];
  lastConnected?: string;
  notes?: string;
  aiScore?: number;
  tags?: string[];
  isFavorite?: boolean;
  socialProfiles?: Contact['socialProfiles'];
  customFields?: CustomFields;

  // NEW: Mock data classification fields
  isMockData?: boolean;
  isExample?: boolean;
  dataSource?: Contact['dataSource'];
  createdBy?: Contact['createdBy'];
  mockDataType?: Contact['mockDataType'];
}