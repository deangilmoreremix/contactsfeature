// Unipile API Types and Interfaces

export interface UnipileAccount {
  id: string;
  platform: Platform;
  accountId: string;
  name: string;
  email?: string;
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
  lastSync?: Date;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export interface PlatformConnection {
  platform: Platform;
  isConnected: boolean;
  accountId?: string;
  displayName?: string;
  profilePicture?: string;
  permissions: string[];
}

export type Platform =
  | 'gmail'
  | 'outlook'
  | 'yahoo'
  | 'linkedin'
  | 'whatsapp'
  | 'telegram'
  | 'sms'
  | 'phone';

export interface MessageData {
  id?: string;
  platform: Platform;
  accountId: string;
  direction: 'inbound' | 'outbound';
  sender: ContactInfo;
  recipient: ContactInfo;
  subject?: string;
  content: string;
  attachments?: Attachment[];
  metadata?: Record<string, any>;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  status: MessageStatus;
}

export interface ContactInfo {
  id?: string;
  name: string;
  email?: string;
  phone?: string;
  platformId?: string;
  avatar?: string;
}

export type MessageStatus =
  | 'sending'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed'
  | 'scheduled';

export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url?: string;
  data?: Blob;
  thumbnail?: string;
}

export interface UnifiedConversation {
  id: string;
  contactId: string;
  contact: ContactInfo;
  platforms: Platform[];
  lastMessage: MessageData;
  unreadCount: number;
  priority: number;
  tags: string[];
  lastActivity: Date;
  messages: MessageData[];
}

export interface ConversationFilter {
  platform?: Platform;
  status?: 'unread' | 'read' | 'all';
  dateRange?: {
    start: Date;
    end: Date;
  };
  searchQuery?: string;
  contactId?: string;
}

export interface SendMessageRequest {
  platform: Platform;
  accountId: string;
  recipient: ContactInfo;
  subject?: string;
  content: string;
  attachments?: Attachment[];
  scheduleAt?: Date;
}

export interface MessageResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  scheduledFor?: Date;
}

export interface WebhookPayload {
  type: 'message' | 'status_update' | 'connection';
  platform: Platform;
  accountId: string;
  data: any;
  timestamp: Date;
}

export interface PlatformConfig {
  name: string;
  displayName: string;
  icon: string;
  color: string;
  capabilities: string[];
  authType: 'oauth' | 'api_key' | 'credentials';
  maxMessageLength?: number;
  supportsAttachments: boolean;
  supportsScheduling: boolean;
}

// Platform-specific types
export interface EmailMessage extends MessageData {
  platform: 'gmail' | 'outlook' | 'yahoo';
  subject: string;
  cc?: ContactInfo[];
  bcc?: ContactInfo[];
  htmlContent?: string;
}

export interface LinkedInMessage extends MessageData {
  platform: 'linkedin';
  conversationId: string;
  isInMail?: boolean;
}

export interface WhatsAppMessage extends MessageData {
  platform: 'whatsapp';
  isGroup?: boolean;
  groupId?: string;
}

export interface SMSMessage extends MessageData {
  platform: 'sms';
  characterCount: number;
  segmentCount: number;
}

// API Response types
export interface UnipileApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}

export interface PaginatedResponse<T> extends UnipileApiResponse<T[]> {
  meta: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

// Client configuration
export interface UnipileConfig {
  apiKey: string;
  baseUrl?: string;
  webhookUrl?: string;
  timeout?: number;
  retryAttempts?: number;
}

// Error types
export class UnipileError extends Error {
  constructor(
    message: string,
    public code: string,
    public platform?: Platform,
    public originalError?: any
  ) {
    super(message);
    this.name = 'UnipileError';
  }
}

export class ConnectionError extends UnipileError {
  constructor(platform: Platform, message: string) {
    super(`Connection failed for ${platform}: ${message}`, 'CONNECTION_ERROR', platform);
  }
}

export class AuthenticationError extends UnipileError {
  constructor(platform: Platform, message: string) {
    super(`Authentication failed for ${platform}: ${message}`, 'AUTH_ERROR', platform);
  }
}

export class RateLimitError extends UnipileError {
  constructor(platform: Platform, retryAfter?: number) {
    super(
      `Rate limit exceeded for ${platform}${retryAfter ? `. Retry after ${retryAfter}s` : ''}`,
      'RATE_LIMIT',
      platform
    );
  }
}