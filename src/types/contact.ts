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
  customFields?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  activityLog?: any[];
  nextSendDate?: string;
  isTeamMember?: boolean;
  role?: string;
  gamificationStats?: Record<string, any>;
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
  customFields?: Record<string, any>;
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
  customFields?: Record<string, any>;
}