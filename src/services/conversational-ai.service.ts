/**
 * Conversational AI Service
 * Real-time conversational interface for CRM with function calling
 */

import { logger } from './logger.service';
import { aiStream } from './aiClient';
import { supabase } from '../lib/supabase';
import { sdrAuthHeaders } from './sdrClient';
import models from '../config/models.json';
import {
  REALTIME_TOOLS, interpretRealtimeEvent, applyTranscriptAction, parseToolArgs, executeRealtimeTool,
  isTokenExpired, reconnectDelay, MAX_RECONNECTS, describeVoiceError,
} from './realtimeVoice';
import type { TranscriptMessage } from './realtimeVoice';

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'function';
  content: string;
  timestamp: string;
  metadata?: {
    functionCalls?: any[];
    functionResults?: any[];
    confidence?: number;
    intent?: string;
  };
}

export interface ConversationContext {
  sessionId: string;
  userId: string;
  currentContacts: string[];
  activeFilters: any;
  conversationHistory: ConversationMessage[];
  userPreferences: {
    responseStyle: 'concise' | 'detailed' | 'technical';
    autoExecuteFunctions: boolean;
    maxFunctionCalls: number;
  };
}

export interface RealtimeAIConfig {
  // No API key or model id here: text chat goes through the server-side AI proxy (aiClient.ts),
  // which resolves model ids from roles. Realtime voice mints a short-lived secret via netlify/functions/realtime-token.
  voice?: 'alloy' | 'ash' | 'ballad' | 'coral' | 'echo' | 'sage' | 'shimmer' | 'verse' | 'marin' | 'cedar';
  temperature?: number;
  maxTokens?: number;
}

class ConversationalAIService {
  private config: RealtimeAIConfig;
  private activeConversations: Map<string, ConversationContext> = new Map();
  // Realtime voice (WebRTC) connection state
  private pc: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private micStream: MediaStream | null = null;
  private remoteAudio: HTMLAudioElement | null = null;
  private realtimeSessionId: string | null = null;
  private realtimeClosedByUser = false;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private handledCallIds: Set<string> = new Set();
  private voiceListeners: Set<(state: 'connecting' | 'connected' | 'reconnecting' | 'disconnected', detail?: string) => void> = new Set();
  private audioContext: AudioContext | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];

  constructor(config: RealtimeAIConfig) {
    this.config = config;
    this.initializeAudioContext();
  }

  /** Subscribe to voice connection state changes. Returns an unsubscribe function. */
  onVoiceState(listener: (state: 'connecting' | 'connected' | 'reconnecting' | 'disconnected', detail?: string) => void): () => void {
    this.voiceListeners.add(listener);
    return () => { this.voiceListeners.delete(listener); };
  }

  private emitVoiceState(state: 'connecting' | 'connected' | 'reconnecting' | 'disconnected', detail?: string): void {
    this.voiceListeners.forEach((l) => { try { l(state, detail); } catch { /* listener errors must not break the session */ } });
  }

  isRealtimeConnected(): boolean {
    return !!this.dataChannel && this.dataChannel.readyState === 'open';
  }

  /** Ask our server for a short-lived Realtime client secret (the API key never reaches the browser). */
  private async fetchRealtimeToken(): Promise<{ value: string; expiresAt: number | null; model: string }> {
    const res = await fetch('/.netlify/functions/realtime-token', {
      method: 'POST',
      headers: await sdrAuthHeaders(),
      body: JSON.stringify({
        role: 'default',
        voice: this.config.voice,
        instructions: this.getSystemInstructions().slice(0, 4000),
        tools: REALTIME_TOOLS
      })
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body.value) throw new Error(body.error || `Could not start a voice session (${res.status})`);
    return body;
  }

  /**
   * Open a Realtime voice session over WebRTC: mint an ephemeral secret server-side, capture the mic,
   * exchange SDP with POST /v1/realtime/calls using that secret, and talk over the `oai-events` data channel.
   * Transcripts land in the conversation history; function calls run through our authenticated endpoints.
   */
  async connectRealtime(sessionId: string): Promise<void> {
    const context = this.activeConversations.get(sessionId);
    if (!context) throw new Error('Conversation context not found');
    if (this.isRealtimeConnected() && this.realtimeSessionId === sessionId) return;

    this.closeRealtimeConnection();
    this.realtimeClosedByUser = false;
    this.realtimeSessionId = sessionId;
    this.emitVoiceState('connecting');
    try {
      await this.openRealtimeConnection(sessionId);
      this.reconnectAttempts = 0;
      this.emitVoiceState('connected');
    } catch (error) {
      this.closeRealtimeConnection();
      const message = describeVoiceError(error);
      this.emitVoiceState('disconnected', message);
      logger.error('Realtime voice connection failed', error as Error, undefined, {
        service: 'conversational-ai',
        operation: 'realtime_connect_error',
        sessionId
      });
      throw new Error(message);
    }
  }

  private async openRealtimeConnection(sessionId: string): Promise<void> {
    if (typeof RTCPeerConnection === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      throw new Error('Voice is not supported in this browser');
    }

    let token = await this.fetchRealtimeToken();
    // Mic first so a permission prompt cannot outlive the (short) secret.
    this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    if (isTokenExpired(token.expiresAt)) token = await this.fetchRealtimeToken();

    const pc = new RTCPeerConnection();
    this.pc = pc;
    const audio = new Audio();
    audio.autoplay = true;
    this.remoteAudio = audio;
    pc.ontrack = (e) => { audio.srcObject = e.streams[0] ?? null; };
    this.micStream.getTracks().forEach((t) => pc.addTrack(t, this.micStream as MediaStream));

    const dc = pc.createDataChannel('oai-events');
    this.dataChannel = dc;
    const opened = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timed out opening the voice channel')), 15000);
      dc.onopen = () => { clearTimeout(timer); resolve(); };
      dc.onerror = () => { clearTimeout(timer); reject(new Error('Voice channel error')); };
    });
    dc.onmessage = (e) => { void this.handleRealtimeMessage(e.data, sessionId); };
    dc.onclose = () => this.handleRealtimeDrop(sessionId);
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected' || pc.connectionState === 'closed') {
        this.handleRealtimeDrop(sessionId);
      }
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    const answer = await fetch('https://api.openai.com/v1/realtime/calls', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token.value}`, 'Content-Type': 'application/sdp' },
      ...(offer.sdp !== undefined ? { body: offer.sdp } : {})
    });
    if (!answer.ok) throw new Error(answer.status === 401 ? 'Voice session expired, please try again' : `Voice connection was rejected (${answer.status})`);
    await pc.setRemoteDescription({ type: 'answer', sdp: await answer.text() });
    await opened;

    // Show what the user says as text in the conversation.
    this.sendMessage({
      type: 'session.update',
      session: { type: 'realtime', audio: { input: { transcription: { model: models.audio.transcribe } } } }
    });
  }

  /** Connection dropped: re-mint a secret and reconnect a few times unless the user closed it. */
  private handleRealtimeDrop(sessionId: string): void {
    if (this.realtimeClosedByUser || this.realtimeSessionId !== sessionId || this.reconnectTimer) return;
    this.closeRealtimeConnection(false);
    if (this.reconnectAttempts >= MAX_RECONNECTS) {
      this.emitVoiceState('disconnected', 'Voice connection lost');
      return;
    }
    const delay = reconnectDelay(this.reconnectAttempts++);
    this.emitVoiceState('reconnecting');
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      if (this.realtimeClosedByUser) return;
      try {
        await this.openRealtimeConnection(sessionId);
        this.reconnectAttempts = 0;
        this.emitVoiceState('connected');
      } catch (error) {
        this.closeRealtimeConnection(false);
        this.handleRealtimeDrop(sessionId);
        if (this.reconnectAttempts >= MAX_RECONNECTS && !this.reconnectTimer) this.emitVoiceState('disconnected', describeVoiceError(error));
      }
    }, delay);
  }

  /** End the voice session and release the microphone. */
  disconnectRealtime(): void {
    this.realtimeClosedByUser = true;
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    this.closeRealtimeConnection();
    this.realtimeSessionId = null;
    this.emitVoiceState('disconnected');
  }

  private closeRealtimeConnection(clearCalls = true): void {
    try { this.micStream?.getTracks().forEach((t) => t.stop()); } catch { /* already stopped */ }
    this.micStream = null;
    if (this.dataChannel) {
      this.dataChannel.onopen = this.dataChannel.onclose = this.dataChannel.onerror = this.dataChannel.onmessage = null;
      try { this.dataChannel.close(); } catch { /* ignore */ }
    }
    this.dataChannel = null;
    if (this.pc) {
      this.pc.ontrack = null;
      this.pc.onconnectionstatechange = null;
      try { this.pc.close(); } catch { /* ignore */ }
    }
    this.pc = null;
    if (this.remoteAudio) { this.remoteAudio.srcObject = null; this.remoteAudio = null; }
    if (clearCalls) this.handledCallIds.clear();
  }

  // Handle incoming Realtime events from the data channel
  private async handleRealtimeMessage(data: unknown, sessionId: string): Promise<void> {
    let message: unknown;
    try { message = JSON.parse(String(data)); } catch { return; }
    const action = interpretRealtimeEvent(message);
    const context = this.activeConversations.get(sessionId);

    switch (action.kind) {
      case 'user_transcript':
      case 'assistant_delta':
      case 'assistant_done':
        if (context) context.conversationHistory = applyTranscriptAction(context.conversationHistory as TranscriptMessage[], action) as ConversationMessage[];
        break;
      case 'function_call':
        await this.handleFunctionCall(action, sessionId);
        break;
      case 'error':
        logger.error('Real-time AI error', new Error(action.message), undefined, {
          service: 'conversational-ai',
          operation: 'realtime_error',
          sessionId,
          errorCode: action.code
        });
        break;
      default:
        break;
    }
  }

  // Run a function call requested by the model and send the result back
  private async handleFunctionCall(call: { callId: string; name: string; args: string }, sessionId: string): Promise<void> {
    const context = this.activeConversations.get(sessionId);
    if (!context || this.handledCallIds.has(call.callId)) return;
    this.handledCallIds.add(call.callId);

    let output: unknown;
    try {
      output = await executeRealtimeTool(call.name, parseToolArgs(call.args), {
        userId: context.userId,
        db: supabase as unknown as { from: (table: string) => any },
        post: async (fn, body) => {
          const res = await fetch(`/.netlify/functions/${fn}`, { method: 'POST', headers: await sdrAuthHeaders(), body: JSON.stringify(body) });
          const json = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(json.error || `${fn} failed (${res.status})`);
          return json;
        }
      });
    } catch (error) {
      logger.error('Function execution failed', error as Error, undefined, {
        service: 'conversational-ai',
        operation: 'function_execution_error',
        sessionId,
        functionName: call.name
      });
      output = { error: (error as Error).message };
    }

    context.conversationHistory.push({
      id: `func_result_${call.callId}`,
      role: 'function',
      content: JSON.stringify(output),
      timestamp: new Date().toISOString(),
      metadata: { functionCalls: [{ name: call.name }], functionResults: [output] }
    });
    this.sendMessage({
      type: 'conversation.item.create',
      item: { type: 'function_call_output', call_id: call.callId, output: JSON.stringify(output) }
    });
    this.sendMessage({ type: 'response.create' });
  }

  // Send an event over the Realtime data channel
  private sendMessage(message: any): void {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      this.dataChannel.send(JSON.stringify(message));
    }
  }

  // Initialize conversation context
  startConversation(userId: string, sessionId: string): ConversationContext {
    const context: ConversationContext = {
      sessionId,
      userId,
      currentContacts: [],
      activeFilters: {},
      conversationHistory: [],
      userPreferences: {
        responseStyle: 'detailed',
        autoExecuteFunctions: true,
        maxFunctionCalls: 5
      }
    };

    this.activeConversations.set(sessionId, context);
    return context;
  }

  // Send user message
  async sendUserMessage(sessionId: string, message: string, audioData?: Blob): Promise<void> {
    const context = this.activeConversations.get(sessionId);
    if (!context) {
      throw new Error('Conversation context not found');
    }

    if (audioData) {
      // Voice: the microphone is streamed live over the Realtime connection (the recorded Blob itself is not
      // replayed). Spoken turns appear in the history via input transcription; any typed text is sent as well.
      if (!this.isRealtimeConnected() || this.realtimeSessionId !== sessionId) await this.connectRealtime(sessionId);
      const typed = message.trim();
      if (typed) {
        context.conversationHistory.push({ id: `user_${Date.now()}`, role: 'user', content: typed, timestamp: new Date().toISOString() });
        this.sendMessage({
          type: 'conversation.item.create',
          item: { type: 'message', role: 'user', content: [{ type: 'input_text', text: typed }] }
        });
        this.sendMessage({ type: 'response.create' });
      }
      return;
    }

    // Add user message to history
    context.conversationHistory.push({
      id: `user_${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    });

    // Text chat: stream from the server-side AI proxy, chaining the conversation history.
    const history = context.conversationHistory
      .filter(m => (m.role === 'user' || m.role === 'assistant') && m.content)
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    const assistantMessage: ConversationMessage = {
      id: `assistant_${Date.now()}`,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString()
    };
    context.conversationHistory.push(assistantMessage);

    try {
      const final = await aiStream(
        {
          role: 'default',
          instructions: this.getSystemInstructions(),
          input: history
        },
        { onDelta: (text) => { assistantMessage.content += text; } }
      );
      assistantMessage.content = final.text || assistantMessage.content;
    } catch (error) {
      // Remove the empty placeholder and surface the real error; never fabricate a reply.
      const idx = context.conversationHistory.indexOf(assistantMessage);
      if (idx !== -1 && !assistantMessage.content) context.conversationHistory.splice(idx, 1);
      logger.error('Conversational AI request failed', error as Error, undefined, {
        service: 'conversational-ai',
        operation: 'text_chat_error',
        sessionId
      });
      throw error;
    }
  }

  // Get conversation history
  getConversationHistory(sessionId: string): ConversationMessage[] {
    const context = this.activeConversations.get(sessionId);
    return context?.conversationHistory || [];
  }

  // Update user preferences
  updateUserPreferences(sessionId: string, preferences: Partial<ConversationContext['userPreferences']>): void {
    const context = this.activeConversations.get(sessionId);
    if (context) {
      context.userPreferences = { ...context.userPreferences, ...preferences };
    }
  }

  // Initialize audio context for voice input/output
  private initializeAudioContext(): void {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (error) {
      logger.warn('Audio context not supported', error as Error);
    }
  }

  // Start voice recording
  async startVoiceRecording(): Promise<void> {
    if (!navigator.mediaDevices || !this.audioContext) {
      throw new Error('Voice recording not supported');
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.mediaRecorder = new MediaRecorder(stream);

    this.audioChunks = [];

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    this.mediaRecorder.onstop = () => {
      // Process audio blob for real-time API
    };

    this.mediaRecorder.start();
  }

  // Stop voice recording
  stopVoiceRecording(): Blob | null {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.stop();
      return new Blob(this.audioChunks, { type: 'audio/wav' });
    }
    return null;
  }

  // Get system instructions for the AI
  private getSystemInstructions(): string {
    return `You are an intelligent CRM assistant with access to comprehensive contact management features.

You can help users with:
- Contact analysis and scoring
- Profile enrichment and data validation
- Email generation and optimization
- Journey analysis and predictions
- Bulk operations and automation
- Search and filtering
- Import/export operations
- Analytics and reporting
- Social profile management
- Task automation

Always be helpful, accurate, and provide actionable insights. Use the available functions to perform tasks when appropriate, and explain your actions clearly to the user.

When using functions, provide clear explanations of what you're doing and why. If multiple steps are needed, break them down clearly.`;
  }
}

// Export the service instance
export const conversationalAIService = new ConversationalAIService({
  voice: 'alloy',
  temperature: 0.7,
  maxTokens: 4096
});
