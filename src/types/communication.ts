// Communication-specific types for the unified interface

import { Platform, MessageData, UnifiedConversation, ConversationFilter } from './unipile';

export interface CommunicationFilters extends ConversationFilter {
  priority?: 'high' | 'medium' | 'low' | 'all';
  hasAttachments?: boolean;
  isArchived?: boolean;
  assignedTo?: string;
}

export interface ComposeMode {
  type: 'new' | 'reply' | 'forward' | 'edit';
  conversationId?: string;
  messageId?: string;
}

export interface DraftMessage {
  id: string;
  conversationId?: string;
  platforms: Platform[];
  recipient: string;
  subject?: string;
  content: string;
  attachments: string[];
  scheduledFor?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CommunicationState {
  // Conversations
  conversations: UnifiedConversation[];
  activeConversationId: string | null;
  selectedConversationIds: string[];

  // UI State
  isComposing: boolean;
  composeMode: ComposeMode | null;
  sidebarCollapsed: boolean;
  isLoading: boolean;

  // Filters and Search
  filters: CommunicationFilters;
  searchQuery: string;

  // Real-time features
  unreadCounts: Record<string, number>;
  typingIndicators: Record<string, boolean>;
  onlineContacts: string[];

  // Drafts and Queue
  drafts: DraftMessage[];
  messageQueue: QueuedMessage[];
}

export interface QueuedMessage {
  id: string;
  message: MessageData;
  retryCount: number;
  maxRetries: number;
  nextRetryAt?: Date;
  error?: string;
}

export interface CommunicationContextType extends CommunicationState {
  // Actions
  setActiveConversation: (id: string | null) => void;
  selectConversations: (ids: string[]) => void;
  updateFilters: (filters: Partial<CommunicationFilters>) => void;
  setSearchQuery: (query: string) => void;
  startComposing: (mode: ComposeMode) => void;
  cancelComposing: () => void;
  sendMessage: (messageData: Partial<MessageData>) => Promise<void>;
  saveDraft: (draft: Partial<DraftMessage>) => Promise<void>;
  deleteDraft: (draftId: string) => Promise<void>;
  markAsRead: (conversationId: string) => void;
  archiveConversation: (conversationId: string) => void;
  toggleSidebar: () => void;

  // Bulk operations
  bulkMarkAsRead: (conversationIds: string[]) => void;
  bulkArchive: (conversationIds: string[]) => void;
  bulkDelete: (conversationIds: string[]) => void;

  // Real-time updates
  subscribeToUpdates: () => void;
  unsubscribeFromUpdates: () => void;
}

export interface MessageThreadProps {
  conversation: UnifiedConversation;
  onReply: (messageId: string) => void;
  onForward: (messageId: string) => void;
  onDelete: (messageId: string) => void;
  onMarkAsRead: (messageId: string) => void;
}

export interface ConversationItemProps {
  conversation: UnifiedConversation;
  isActive: boolean;
  isSelected: boolean;
  onClick: () => void;
  onSelect: (selected: boolean) => void;
  onContextMenu: (event: React.MouseEvent) => void;
}

export interface ComposePanelProps {
  isOpen: boolean;
  mode: ComposeMode | null;
  conversation?: UnifiedConversation;
  onClose: () => void;
  onSend: (messageData: Partial<MessageData>) => Promise<void>;
  onSaveDraft: (draft: Partial<DraftMessage>) => Promise<void>;
}

export interface PlatformSelectorProps {
  selectedPlatforms: Platform[];
  availablePlatforms: Platform[];
  onSelectionChange: (platforms: Platform[]) => void;
  contactId?: string;
}

export interface MessageEditorProps {
  content: string;
  platform: Platform;
  onChange: (content: string) => void;
  onTemplateSelect: (templateId: string) => void;
  onAttachmentAdd: (files: File[]) => void;
  attachments: string[];
  onAttachmentRemove: (attachmentId: string) => void;
}

export interface QuickActionBarProps {
  conversation: UnifiedConversation;
  onReply: () => void;
  onForward: () => void;
  onArchive: () => void;
  onMarkAsRead: () => void;
  onComposeNew: () => void;
}

export interface BulkActionsBarProps {
  selectedCount: number;
  onMarkAsRead: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onClearSelection: () => void;
  onAssign: (userId: string) => void;
  onTag: (tags: string[]) => void;
}

// Analytics and reporting types
export interface CommunicationAnalytics {
  totalMessages: number;
  messagesByPlatform: Record<Platform, number>;
  responseRate: number;
  averageResponseTime: number;
  topPlatforms: Platform[];
  engagementTrends: {
    date: string;
    sent: number;
    received: number;
    responses: number;
  }[];
}

export interface PlatformPerformance {
  platform: Platform;
  totalSent: number;
  totalReceived: number;
  responseRate: number;
  averageResponseTime: number;
  openRate?: number;
  clickRate?: number;
}

// Sequence and automation types
export interface CommunicationSequence {
  id: string;
  name: string;
  description?: string;
  steps: SequenceStep[];
  targetContacts: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SequenceStep {
  id: string;
  order: number;
  platform: Platform;
  delay: number; // minutes after previous step
  templateId?: string;
  customContent?: string;
  conditions?: SequenceCondition[];
}

export interface SequenceCondition {
  type: 'response' | 'no_response' | 'opened' | 'clicked';
  value?: any;
  timeout?: number; // minutes
}

// Notification types
export interface CommunicationNotification {
  id: string;
  type: 'new_message' | 'sequence_step' | 'reminder' | 'error';
  title: string;
  message: string;
  conversationId?: string;
  actionUrl?: string;
  createdAt: Date;
  isRead: boolean;
}

// Settings and preferences
export interface CommunicationPreferences {
  defaultPlatforms: Platform[];
  autoRead: boolean;
  soundNotifications: boolean;
  desktopNotifications: boolean;
  emailNotifications: boolean;
  autoArchive: boolean;
  archiveAfterDays: number;
  signature?: string;
  timezone: string;
}

export interface PlatformSettings {
  platform: Platform;
  isEnabled: boolean;
  autoSync: boolean;
  syncFrequency: number; // minutes
  notificationSettings: {
    newMessages: boolean;
    mentions: boolean;
    statusUpdates: boolean;
  };
  signature?: string;
  customFields: Record<string, any>;
}