// Communication Context for unified messaging state management

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { isSupabaseConfigured } from '../lib/supabase';
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
import { groupMessagesIntoConversations, type UnifiedMessageRow } from '../lib/messageGrouping';

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

  const loadConversations = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const { data, error } = await supabase
        .from('unified_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      dispatch({ type: 'SET_CONVERSATIONS', payload: groupMessagesIntoConversations((data ?? []) as UnifiedMessageRow[]) });
    } catch (error) {
      // Signed out, offline or table not migrated yet: show an empty inbox rather than invented data.
      console.error('Failed to load conversations:', error);
      dispatch({ type: 'SET_CONVERSATIONS', payload: [] });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
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

  // Load on mount and keep live: any change to unified_messages reloads the (debounced) inbox.
  useEffect(() => {
    void loadConversations();
    void loadDrafts();

    if (!isSupabaseConfigured) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    const channel = supabase
      .channel('communication_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'unified_messages' }, () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => void loadConversations(), 300);
      })
      .subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [loadConversations, loadDrafts]);

  // The live subscription is owned by the provider effect above; these keep the context API stable.
  const subscribeToUpdates = useCallback(() => { void loadConversations(); }, [loadConversations]);
  const unsubscribeFromUpdates = useCallback(() => {}, []);

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
    // TODO: persist via a Supabase-backed messages table
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