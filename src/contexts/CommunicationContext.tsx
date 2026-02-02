// Communication Context for unified messaging state management

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import {
  CommunicationContextType,
  CommunicationState,
  UnifiedConversation,
  CommunicationFilters,
  ComposeMode,
  DraftMessage,
  QueuedMessage,
  MessageData
} from '../types/communication';

// Initial state
const initialState: CommunicationState = {
  conversations: [],
  activeConversationId: null,
  selectedConversationIds: [],
  isComposing: false,
  composeMode: null,
  sidebarCollapsed: false,
  isLoading: false,
  filters: {
    status: 'all',
    priority: 'all',
  },
  searchQuery: '',
  unreadCounts: {},
  typingIndicators: {},
  onlineContacts: [],
  drafts: [],
  messageQueue: [],
};

// Action types
type CommunicationAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_CONVERSATIONS'; payload: UnifiedConversation[] }
  | { type: 'ADD_CONVERSATION'; payload: UnifiedConversation }
  | { type: 'UPDATE_CONVERSATION'; payload: UnifiedConversation }
  | { type: 'REMOVE_CONVERSATION'; payload: string }
  | { type: 'SET_ACTIVE_CONVERSATION'; payload: string | null }
  | { type: 'SET_SELECTED_CONVERSATIONS'; payload: string[] }
  | { type: 'SET_COMPOSING'; payload: { isComposing: boolean; mode: ComposeMode | null } }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'UPDATE_FILTERS'; payload: Partial<CommunicationFilters> }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'UPDATE_UNREAD_COUNTS'; payload: Record<string, number> }
  | { type: 'SET_TYPING_INDICATOR'; payload: { conversationId: string; isTyping: boolean } }
  | { type: 'SET_ONLINE_CONTACTS'; payload: string[] }
  | { type: 'ADD_DRAFT'; payload: DraftMessage }
  | { type: 'UPDATE_DRAFT'; payload: DraftMessage }
  | { type: 'REMOVE_DRAFT'; payload: string }
  | { type: 'ADD_TO_QUEUE'; payload: QueuedMessage }
  | { type: 'REMOVE_FROM_QUEUE'; payload: string }
  | { type: 'UPDATE_QUEUE_ITEM'; payload: QueuedMessage };

// Reducer
function communicationReducer(
  state: CommunicationState,
  action: CommunicationAction
): CommunicationState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'SET_CONVERSATIONS':
      return { ...state, conversations: action.payload };

    case 'ADD_CONVERSATION':
      return {
        ...state,
        conversations: [action.payload, ...state.conversations],
      };

    case 'UPDATE_CONVERSATION':
      return {
        ...state,
        conversations: state.conversations.map(conv =>
          conv.id === action.payload.id ? action.payload : conv
        ),
      };

    case 'REMOVE_CONVERSATION':
      return {
        ...state,
        conversations: state.conversations.filter(conv => conv.id !== action.payload),
        activeConversationId: state.activeConversationId === action.payload
          ? null
          : state.activeConversationId,
        selectedConversationIds: state.selectedConversationIds.filter(id => id !== action.payload),
      };

    case 'SET_ACTIVE_CONVERSATION':
      return { ...state, activeConversationId: action.payload };

    case 'SET_SELECTED_CONVERSATIONS':
      return { ...state, selectedConversationIds: action.payload };

    case 'SET_COMPOSING':
      return {
        ...state,
        isComposing: action.payload.isComposing,
        composeMode: action.payload.mode,
      };

    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarCollapsed: !state.sidebarCollapsed };

    case 'UPDATE_FILTERS':
      return {
        ...state,
        filters: { ...state.filters, ...action.payload },
      };

    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload };

    case 'UPDATE_UNREAD_COUNTS':
      return { ...state, unreadCounts: action.payload };

    case 'SET_TYPING_INDICATOR':
      return {
        ...state,
        typingIndicators: {
          ...state.typingIndicators,
          [action.payload.conversationId]: action.payload.isTyping,
        },
      };

    case 'SET_ONLINE_CONTACTS':
      return { ...state, onlineContacts: action.payload };

    case 'ADD_DRAFT':
      return {
        ...state,
        drafts: [action.payload, ...state.drafts],
      };

    case 'UPDATE_DRAFT':
      return {
        ...state,
        drafts: state.drafts.map(draft =>
          draft.id === action.payload.id ? action.payload : draft
        ),
      };

    case 'REMOVE_DRAFT':
      return {
        ...state,
        drafts: state.drafts.filter(draft => draft.id !== action.payload),
      };

    case 'ADD_TO_QUEUE':
      return {
        ...state,
        messageQueue: [...state.messageQueue, action.payload],
      };

    case 'REMOVE_FROM_QUEUE':
      return {
        ...state,
        messageQueue: state.messageQueue.filter(item => item.id !== action.payload),
      };

    case 'UPDATE_QUEUE_ITEM':
      return {
        ...state,
        messageQueue: state.messageQueue.map(item =>
          item.id === action.payload.id ? action.payload : item
        ),
      };

    default:
      return state;
  }
}

// Context
const CommunicationContext = createContext<CommunicationContextType | undefined>(undefined);

// Provider component
export const CommunicationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(communicationReducer, initialState);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
    subscribeToUpdates();
    loadDrafts();

    return () => {
      unsubscribeFromUpdates();
    };
  }, []);

  const loadConversations = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      // This would integrate with Supabase to load conversations
      // For now, using placeholder
      const conversations: UnifiedConversation[] = [];
      dispatch({ type: 'SET_CONVERSATIONS', payload: conversations });
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const subscribeToUpdates = useCallback(() => {
    // Subscribe to Supabase realtime updates
    const channel = supabase
      .channel('communication_updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'unified_messages'
      }, (payload) => {
        // Handle real-time message updates
        handleRealtimeUpdate(payload);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const unsubscribeFromUpdates = useCallback(() => {
    // Cleanup subscriptions
  }, []);

  const handleRealtimeUpdate = useCallback((payload: any) => {
    // Handle different types of real-time updates
    switch (payload.eventType) {
      case 'INSERT':
        // New message received
        break;
      case 'UPDATE':
        // Message status updated
        break;
      case 'DELETE':
        // Message deleted
        break;
    }
  }, []);

  const loadDrafts = useCallback(async () => {
    try {
      // Load drafts from localStorage or Supabase
      const savedDrafts = localStorage.getItem('communication_drafts');
      if (savedDrafts) {
        const drafts: DraftMessage[] = JSON.parse(savedDrafts);
        drafts.forEach(draft => dispatch({ type: 'ADD_DRAFT', payload: draft }));
      }
    } catch (error) {
      console.error('Failed to load drafts:', error);
    }
  }, []);

  // Action implementations
  const setActiveConversation = useCallback((id: string | null) => {
    dispatch({ type: 'SET_ACTIVE_CONVERSATION', payload: id });
  }, []);

  const selectConversations = useCallback((ids: string[]) => {
    dispatch({ type: 'SET_SELECTED_CONVERSATIONS', payload: ids });
  }, []);

  const updateFilters = useCallback((filters: Partial<CommunicationFilters>) => {
    dispatch({ type: 'UPDATE_FILTERS', payload: filters });
  }, []);

  const setSearchQuery = useCallback((query: string) => {
    dispatch({ type: 'SET_SEARCH_QUERY', payload: query });
  }, []);

  const startComposing = useCallback((mode: ComposeMode) => {
    dispatch({ type: 'SET_COMPOSING', payload: { isComposing: true, mode } });
  }, []);

  const cancelComposing = useCallback(() => {
    dispatch({ type: 'SET_COMPOSING', payload: { isComposing: false, mode: null } });
  }, []);

  const sendMessage = useCallback(async (messageData: Partial<MessageData>) => {
    // Implementation for sending messages
    console.log('Sending message:', messageData);
    // This would integrate with Unipile client
  }, []);

  const saveDraft = useCallback(async (draft: Partial<DraftMessage>) => {
    const fullDraft: DraftMessage = {
      id: draft.id || `draft_${Date.now()}`,
      conversationId: draft.conversationId,
      platforms: draft.platforms || [],
      recipient: draft.recipient || '',
      subject: draft.subject,
      content: draft.content || '',
      attachments: draft.attachments || [],
      scheduledFor: draft.scheduledFor,
      createdAt: draft.createdAt || new Date(),
      updatedAt: new Date(),
    };

    dispatch({ type: 'ADD_DRAFT', payload: fullDraft });

    // Save to localStorage
    try {
      const currentDrafts = state.drafts;
      const updatedDrafts = currentDrafts.filter(d => d.id !== fullDraft.id);
      updatedDrafts.push(fullDraft);
      localStorage.setItem('communication_drafts', JSON.stringify(updatedDrafts));
    } catch (error) {
      console.error('Failed to save draft:', error);
    }
  }, [state.drafts]);

  const deleteDraft = useCallback(async (draftId: string) => {
    dispatch({ type: 'REMOVE_DRAFT', payload: draftId });

    // Remove from localStorage
    try {
      const currentDrafts = state.drafts.filter(d => d.id !== draftId);
      localStorage.setItem('communication_drafts', JSON.stringify(currentDrafts));
    } catch (error) {
      console.error('Failed to delete draft:', error);
    }
  }, [state.drafts]);

  const markAsRead = useCallback((conversationId: string) => {
    // Mark conversation as read
    console.log('Marking conversation as read:', conversationId);
  }, []);

  const archiveConversation = useCallback((conversationId: string) => {
    dispatch({ type: 'REMOVE_CONVERSATION', payload: conversationId });
  }, []);

  const toggleSidebar = useCallback(() => {
    dispatch({ type: 'TOGGLE_SIDEBAR' });
  }, []);

  // Bulk operations
  const bulkMarkAsRead = useCallback((conversationIds: string[]) => {
    conversationIds.forEach(id => markAsRead(id));
  }, [markAsRead]);

  const bulkArchive = useCallback((conversationIds: string[]) => {
    conversationIds.forEach(id => archiveConversation(id));
  }, [archiveConversation]);

  const bulkDelete = useCallback((conversationIds: string[]) => {
    conversationIds.forEach(id => dispatch({ type: 'REMOVE_CONVERSATION', payload: id }));
  }, []);

  // Context value
  const contextValue: CommunicationContextType = {
    ...state,
    setActiveConversation,
    selectConversations,
    updateFilters,
    setSearchQuery,
    startComposing,
    cancelComposing,
    sendMessage,
    saveDraft,
    deleteDraft,
    markAsRead,
    archiveConversation,
    toggleSidebar,
    bulkMarkAsRead,
    bulkArchive,
    bulkDelete,
    subscribeToUpdates,
    unsubscribeFromUpdates,
  };

  return (
    <CommunicationContext.Provider value={contextValue}>
      {children}
    </CommunicationContext.Provider>
  );
};

// Hook to use communication context
export const useCommunication = (): CommunicationContextType => {
  const context = useContext(CommunicationContext);
  if (context === undefined) {
    throw new Error('useCommunication must be used within a CommunicationProvider');
  }
  return context;
};

export default CommunicationContext;