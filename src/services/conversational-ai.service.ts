/**
 * Conversational AI Service
 * Real-time conversational interface for CRM with function calling
 */

import { aiOrchestrator } from './ai-orchestrator.service';
import { logger } from './logger.service';
import { aiStream } from './aiClient';
import { supabase } from '../lib/supabase';
import { sdrAuthHeaders } from './sdrClient';
import models from '../config/models.json';
import {
  REALTIME_TOOLS, interpretRealtimeEvent, applyTranscriptAction, parseToolArgs, executeRealtimeTool,
  isTokenExpired, reconnectDelay, MAX_RECONNECTS, describeVoiceError,
} from './realtimeVoice';

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
      body: offer.sdp
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
        if (context) context.conversationHistory = applyTranscriptAction(context.conversationHistory, action) as ConversationMessage[];
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

  // Execute CRM functions
  private async executeCRMFunction(functionCall: any, context: ConversationContext): Promise<any> {
    const { name, arguments: args } = functionCall;
    const params = JSON.parse(args);

    // Add context to parameters
    const enrichedParams = {
      ...params,
      context: {
        user_id: context.userId,
        session_id: context.sessionId,
        trigger_source: 'conversational_ai'
      }
    };

    // Route to appropriate function handler
    switch (name) {
      // Contact Analysis & Scoring
      case 'analyze_contact_profile':
        return this.analyzeContactProfile(enrichedParams, context);
      case 'analyze_bulk_engagement':
        return this.analyzeBulkEngagement(enrichedParams, context);
      case 'bulk_score_inactive_contacts':
        return this.bulkScoreInactiveContacts(enrichedParams, context);

      // Contact Enrichment
      case 'enrich_contact_profile':
        return this.enrichContactProfile(enrichedParams, context);
      case 'bulk_enrich_contacts':
        return this.bulkEnrichContacts(enrichedParams, context);
      case 'verify_social_profiles':
        return this.verifySocialProfiles(enrichedParams, context);

      // Communication & Email
      case 'optimize_email_timing':
        return this.optimizeEmailTiming(enrichedParams, context);
      case 'generate_personalized_email':
        return this.generatePersonalizedEmail(enrichedParams, context);
      case 'analyze_email_performance':
        return this.analyzeEmailPerformance(enrichedParams, context);

      // Contact Journey & Timeline
      case 'analyze_contact_journey':
        return this.analyzeContactJourney(enrichedParams, context);
      case 'predict_next_best_action':
        return this.predictNextBestAction(enrichedParams, context);
      case 'generate_journey_summary':
        return this.generateJourneySummary(enrichedParams, context);

      // Bulk Operations
      case 'bulk_analyze_segment':
        return this.bulkAnalyzeSegment(enrichedParams, context);
      case 'smart_export_segment':
        return this.smartExportSegment(enrichedParams, context);
      case 'bulk_apply_tags':
        return this.bulkApplyTags(enrichedParams, context);

      // Search & Filtering
      case 'find_similar_contacts':
        return this.findSimilarContacts(enrichedParams, context);
      case 'search_by_engagement':
        return this.searchByEngagement(enrichedParams, context);
      case 'rank_by_engagement':
        return this.rankByEngagement(enrichedParams, context);

      // Import/Export
      case 'intelligent_import':
        return this.intelligentImport(enrichedParams, context);
      case 'export_for_marketing':
        return this.exportForMarketing(enrichedParams, context);
      case 'import_linkedin_connections':
        return this.importLinkedInConnections(enrichedParams, context);

      // Analytics & Insights
      case 'predict_conversion_probability':
        return this.predictConversionProbability(enrichedParams, context);
      case 'analyze_segment_trends':
        return this.analyzeSegmentTrends(enrichedParams, context);
      case 'generate_acquisition_report':
        return this.generateAcquisitionReport(enrichedParams, context);

      // AI Research
      case 'research_company_news':
        return this.researchCompanyNews(enrichedParams, context);
      case 'discover_social_profiles':
        return this.discoverSocialProfiles(enrichedParams, context);
      case 'analyze_industry_trends':
        return this.analyzeIndustryTrends(enrichedParams, context);

      // Contact Editing
      case 'update_contact_field':
        return this.updateContactField(enrichedParams, context);
      case 'merge_duplicate_contacts':
        return this.mergeDuplicateContacts(enrichedParams, context);
      case 'bulk_update_missing_fields':
        return this.bulkUpdateMissingFields(enrichedParams, context);

      // Social Profile Management
      case 'verify_social_profile':
        return this.verifySocialProfile(enrichedParams, context);
      case 'bulk_find_social_profiles':
        return this.bulkFindSocialProfiles(enrichedParams, context);
      case 'analyze_social_engagement':
        return this.analyzeSocialEngagement(enrichedParams, context);

      // Email Automation
      case 'create_nurture_sequence':
        return this.createNurtureSequence(enrichedParams, context);
      case 'automate_followup_sequence':
        return this.automateFollowupSequence(enrichedParams, context);
      case 'generate_segmented_content':
        return this.generateSegmentedContent(enrichedParams, context);

      // Task & Follow-up Automation
      case 'bulk_create_followup_tasks':
        return this.bulkCreateFollowupTasks(enrichedParams, context);
      case 'schedule_milestone_reminders':
        return this.scheduleMilestoneReminders(enrichedParams, context);
      case 'prioritize_tasks_by_value':
        return this.prioritizeTasksByValue(enrichedParams, context);

      // Voice-Specific Functions
      case 'transcribe_voice_note':
        return this.transcribeVoiceNote(enrichedParams, context);
      case 'voice_command_analysis':
        return this.voiceCommandAnalysis(enrichedParams, context);
      case 'voice_sentiment_analysis':
        return this.voiceSentimentAnalysis(enrichedParams, context);
      case 'voice_meeting_summary':
        return this.voiceMeetingSummary(enrichedParams, context);
      case 'voice_prospect_qualification':
        return this.voiceProspectQualification(enrichedParams, context);

      // Additional Smart Functions
      case 'create_smart_contact':
        return this.createSmartContact(enrichedParams, context);
      case 'generate_contact_insights':
        return this.generateContactInsights(enrichedParams, context);

      default:
        throw new Error(`Unknown function: ${name}`);
    }
  }

  // Function implementations (delegate to AI Orchestrator)
  private async analyzeContactProfile(params: any, context: ConversationContext): Promise<any> {
    return aiOrchestrator.submitRequest({
      type: 'contact_scoring',
      priority: 'medium',
      data: params,
      context: params.context
    });
  }

  private async analyzeBulkEngagement(params: any, context: ConversationContext): Promise<any> {
    return aiOrchestrator.submitRequest({
      type: 'communication_analysis',
      priority: 'medium',
      data: params,
      context: params.context
    });
  }

  private async bulkScoreInactiveContacts(params: any, context: ConversationContext): Promise<any> {
    return aiOrchestrator.submitRequest({
      type: 'contact_scoring',
      priority: 'medium',
      data: params,
      context: params.context
    });
  }

  private async enrichContactProfile(params: any, context: ConversationContext): Promise<any> {
    return aiOrchestrator.submitRequest({
      type: 'contact_enrichment',
      priority: 'medium',
      data: params,
      context: params.context
    });
  }

  private async bulkEnrichContacts(params: any, context: ConversationContext): Promise<any> {
    return aiOrchestrator.submitRequest({
      type: 'contact_enrichment',
      priority: 'medium',
      data: params,
      context: params.context
    });
  }

  private async verifySocialProfiles(params: any, context: ConversationContext): Promise<any> {
    return aiOrchestrator.submitRequest({
      type: 'contact_enrichment',
      priority: 'medium',
      data: params,
      context: params.context
    });
  }

  private async optimizeEmailTiming(params: any, context: ConversationContext): Promise<any> {
    return aiOrchestrator.submitRequest({
      type: 'communication_analysis',
      priority: 'medium',
      data: params,
      context: params.context
    });
  }

  private async generatePersonalizedEmail(params: any, context: ConversationContext): Promise<any> {
    return aiOrchestrator.submitRequest({
      type: 'email_generation',
      priority: 'medium',
      data: params,
      context: params.context
    });
  }

  private async analyzeEmailPerformance(params: any, context: ConversationContext): Promise<any> {
    return aiOrchestrator.submitRequest({
      type: 'communication_analysis',
      priority: 'medium',
      data: params,
      context: params.context
    });
  }

  private async analyzeContactJourney(params: any, context: ConversationContext): Promise<any> {
    return aiOrchestrator.submitRequest({
      type: 'predictive_analytics',
      priority: 'medium',
      data: params,
      context: params.context
    });
  }

  private async predictNextBestAction(params: any, context: ConversationContext): Promise<any> {
    return aiOrchestrator.submitRequest({
      type: 'predictive_analytics',
      priority: 'high',
      data: params,
      context: params.context
    });
  }

  private async generateJourneySummary(params: any, context: ConversationContext): Promise<any> {
    return aiOrchestrator.submitRequest({
      type: 'insights_generation',
      priority: 'medium',
      data: params,
      context: params.context
    });
  }

  private async bulkAnalyzeSegment(params: any, context: ConversationContext): Promise<any> {
    return aiOrchestrator.submitRequest({
      type: 'predictive_analytics',
      priority: 'medium',
      data: params,
      context: params.context
    });
  }

  private async smartExportSegment(params: any, context: ConversationContext): Promise<any> {
    return aiOrchestrator.submitRequest({
      type: 'insights_generation',
      priority: 'medium',
      data: params,
      context: params.context
    });
  }

  private async bulkApplyTags(params: any, context: ConversationContext): Promise<any> {
    return aiOrchestrator.submitRequest({
      type: 'automation_suggestions',
      priority: 'medium',
      data: params,
      context: params.context
    });
  }

  private async findSimilarContacts(params: any, context: ConversationContext): Promise<any> {
    return aiOrchestrator.submitRequest({
      type: 'insights_generation',
      priority: 'medium',
      data: params,
      context: params.context
    });
  }

  private async searchByEngagement(params: any, context: ConversationContext): Promise<any> {
    return aiOrchestrator.submitRequest({
      type: 'communication_analysis',
      priority: 'medium',
      data: params,
      context: params.context
    });
  }

  private async rankByEngagement(params: any, context: ConversationContext): Promise<any> {
    return aiOrchestrator.submitRequest({
      type: 'insights_generation',
      priority: 'medium',
      data: params,
      context: params.context
    });
  }

  private async intelligentImport(params: any, context: ConversationContext): Promise<any> {
    return aiOrchestrator.submitRequest({
      type: 'insights_generation',
      priority: 'medium',
      data: params,
      context: params.context
    });
  }

  private async exportForMarketing(params: any, context: ConversationContext): Promise<any> {
    return aiOrchestrator.submitRequest({
      type: 'insights_generation',
      priority: 'medium',
      data: params,
      context: params.context
    });
  }

  private async importLinkedInConnections(params: any, context: ConversationContext): Promise<any> {
    return aiOrchestrator.submitRequest({
      type: 'insights_generation',
      priority: 'medium',
      data: params,
      context: params.context
    });
  }

  private async predictConversionProbability(params: any, context: ConversationContext): Promise<any> {
    return aiOrchestrator.submitRequest({
      type: 'predictive_analytics',
      priority: 'high',
      data: params,
      context: params.context
    });
  }

  private async analyzeSegmentTrends(params: any, context: ConversationContext): Promise<any> {
    return aiOrchestrator.submitRequest({
      type: 'predictive_analytics',
      priority: 'medium',
      data: params,
      context: params.context
    });
  }

  private async generateAcquisitionReport(params: any, context: ConversationContext): Promise<any> {
    return aiOrchestrator.submitRequest({
      type: 'insights_generation',
      priority: 'medium',
      data: params,
      context: params.context
    });
  }

  private async researchCompanyNews(params: any, context: ConversationContext): Promise<any> {
    return aiOrchestrator.submitRequest({
      type: 'insights_generation',
      priority: 'medium',
      data: params,
      context: params.context
    });
  }

  private async discoverSocialProfiles(params: any, context: ConversationContext): Promise<any> {
    return aiOrchestrator.submitRequest({
      type: 'contact_enrichment',
      priority: 'medium',
      data: params,
      context: params.context
    });
  }

  private async analyzeIndustryTrends(params: any, context: ConversationContext): Promise<any> {
    return aiOrchestrator.submitRequest({
      type: 'insights_generation',
      priority: 'medium',
      data: params,
      context: params.context
    });
  }

  private async updateContactField(params: any, context: ConversationContext): Promise<any> {
    return aiOrchestrator.submitRequest({
      type: 'insights_generation',
      priority: 'medium',
      data: params,
      context: params.context
    });
  }

  private async mergeDuplicateContacts(params: any, context: ConversationContext): Promise<any> {
    return aiOrchestrator.submitRequest({
      type: 'insights_generation',
      priority: 'medium',
      data: params,
      context: params.context
    });
  }

  private async bulkUpdateMissingFields(params: any, context: ConversationContext): Promise<any> {
    return aiOrchestrator.submitRequest({
      type: 'contact_enrichment',
      priority: 'medium',
      data: params,
      context: params.context
    });
  }

  private async verifySocialProfile(params: any, context: ConversationContext): Promise<any> {
    return aiOrchestrator.submitRequest({
      type: 'contact_enrichment',
      priority: 'medium',
      data: params,
      context: params.context
    });
  }

  private async bulkFindSocialProfiles(params: any, context: ConversationContext): Promise<any> {
    return aiOrchestrator.submitRequest({
      type: 'contact_enrichment',
      priority: 'medium',
      data: params,
      context: params.context
    });
  }

  private async analyzeSocialEngagement(params: any, context: ConversationContext): Promise<any> {
    return aiOrchestrator.submitRequest({
      type: 'communication_analysis',
      priority: 'medium',
      data: params,
      context: params.context
    });
  }

  private async createNurtureSequence(params: any, context: ConversationContext): Promise<any> {
    return aiOrchestrator.submitRequest({
      type: 'automation_suggestions',
      priority: 'medium',
      data: params,
      context: params.context
    });
  }

  private async automateFollowupSequence(params: any, context: ConversationContext): Promise<any> {
    return aiOrchestrator.submitRequest({
      type: 'automation_suggestions',
      priority: 'medium',
      data: params,
      context: params.context
    });
  }

  private async generateSegmentedContent(params: any, context: ConversationContext): Promise<any> {
    return aiOrchestrator.submitRequest({
      type: 'email_generation',
      priority: 'medium',
      data: params,
      context: params.context
    });
  }

  private async bulkCreateFollowupTasks(params: any, context: ConversationContext): Promise<any> {
    return aiOrchestrator.submitRequest({
      type: 'automation_suggestions',
      priority: 'medium',
      data: params,
      context: params.context
    });
  }

  private async scheduleMilestoneReminders(params: any, context: ConversationContext): Promise<any> {
    return aiOrchestrator.submitRequest({
      type: 'automation_suggestions',
      priority: 'medium',
      data: params,
      context: params.context
    });
  }

  private async prioritizeTasksByValue(params: any, context: ConversationContext): Promise<any> {
    return aiOrchestrator.submitRequest({
      type: 'automation_suggestions',
      priority: 'medium',
      data: params,
      context: params.context
    });
  }

  // Voice-Specific Function Implementations
  private async transcribeVoiceNote(params: any, context: ConversationContext): Promise<any> {
    const { audioData, contactId, noteType } = params;

    return aiOrchestrator.submitRequest({
      type: 'insights_generation',
      priority: 'medium',
      data: {
        audioData,
        contactId,
        noteType: noteType || 'general',
        transcription: true
      },
      context: params.context
    });
  }

  private async voiceCommandAnalysis(params: any, context: ConversationContext): Promise<any> {
    const { audioData, commandHistory, userPreferences } = params;

    return aiOrchestrator.submitRequest({
      type: 'insights_generation',
      priority: 'high',
      data: {
        audioData,
        commandHistory,
        userPreferences,
        analysisType: 'voice_command'
      },
      context: params.context
    });
  }

  private async voiceSentimentAnalysis(params: any, context: ConversationContext): Promise<any> {
    const { audioData, contactId, interactionType } = params;

    return aiOrchestrator.submitRequest({
      type: 'communication_analysis',
      priority: 'medium',
      data: {
        audioData,
        contactId,
        interactionType,
        analysisType: 'sentiment'
      },
      context: params.context
    });
  }

  private async voiceMeetingSummary(params: any, context: ConversationContext): Promise<any> {
    const { audioData, participants, meetingType, actionItems } = params;

    return aiOrchestrator.submitRequest({
      type: 'insights_generation',
      priority: 'high',
      data: {
        audioData,
        participants,
        meetingType,
        actionItems: actionItems !== false,
        summaryType: 'voice_meeting'
      },
      context: params.context
    });
  }

  private async voiceProspectQualification(params: any, context: ConversationContext): Promise<any> {
    const { audioData, contactData, qualificationCriteria } = params;

    return aiOrchestrator.submitRequest({
      type: 'contact_scoring',
      priority: 'high',
      data: {
        audioData,
        contact: contactData,
        criteria: qualificationCriteria,
        analysisType: 'voice_qualification'
      },
      context: params.context
    });
  }

  // Additional Smart Functions
  private async createSmartContact(params: any, context: ConversationContext): Promise<any> {
    const { contactData, autoEnrich, validateData, createTasks } = params;

    return aiOrchestrator.submitRequest({
      type: 'contact_enrichment',
      priority: 'high',
      data: {
        contact: contactData,
        autoEnrich: autoEnrich !== false,
        validateData: validateData !== false,
        createTasks: createTasks || false,
        smartCreation: true
      },
      context: params.context
    });
  }

  private async generateContactInsights(params: any, context: ConversationContext): Promise<any> {
    const { contactId, insightTypes, maxInsights } = params;

    return aiOrchestrator.submitRequest({
      type: 'insights_generation',
      priority: 'medium',
      data: {
        contactId,
        insightTypes: insightTypes || ['opportunities', 'recommendations', 'risks'],
        maxInsights: maxInsights || 5,
        analysisType: 'contact_insights'
      },
      context: params.context
    });
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
      const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
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

  // Convert blob to base64 for API
  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
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

  // Get all function definitions for the real-time API
  private getAllFunctionDefinitions(): any[] {
    return [
      // 🎯 Contact Analysis & Scoring Functions
      {
        type: 'function',
        name: 'analyze_contact_profile',
        description: 'Analyze a contact\'s potential as a client with detailed scoring and insights',
        parameters: {
          type: 'object',
          properties: {
            contactId: { type: 'string', description: 'Contact identifier' },
            contactData: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                title: { type: 'string' },
                company: { type: 'string' },
                industry: { type: 'string' },
                interestLevel: { type: 'string', enum: ['hot', 'medium', 'low', 'cold'] }
              },
              required: ['name']
            },
            analysisDepth: {
              type: 'string',
              enum: ['basic', 'detailed', 'comprehensive'],
              default: 'detailed'
            }
          },
          required: ['contactId', 'contactData']
        }
      },
      {
        type: 'function',
        name: 'analyze_bulk_engagement',
        description: 'Analyze engagement levels for multiple contacts',
        parameters: {
          type: 'object',
          properties: {
            contactIds: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of contact IDs to analyze'
            },
            timeframe: {
              type: 'string',
              description: 'Analysis timeframe',
              default: '30d'
            },
            segment: {
              type: 'string',
              description: 'Contact segment to analyze',
              enum: ['all', 'hot', 'medium', 'cold', 'enterprise', 'smb']
            }
          },
          required: ['contactIds']
        }
      },
      {
        type: 'function',
        name: 'bulk_score_inactive_contacts',
        description: 'Score contacts who haven\'t been contacted recently',
        parameters: {
          type: 'object',
          properties: {
            daysInactive: {
              type: 'number',
              description: 'Days since last contact',
              default: 30
            },
            minScore: {
              type: 'number',
              description: 'Minimum score threshold',
              default: 60
            },
            createTasks: {
              type: 'boolean',
              description: 'Automatically create follow-up tasks',
              default: true
            }
          }
        }
      },

      // 🔍 Contact Enrichment Functions
      {
        type: 'function',
        name: 'enrich_contact_profile',
        description: 'Enrich contact profile with web research and social media data',
        parameters: {
          type: 'object',
          properties: {
            contactId: { type: 'string', description: 'Contact identifier' },
            contactData: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                title: { type: 'string' },
                company: { type: 'string' },
                email: { type: 'string' }
              },
              required: ['name']
            },
            enrichmentTypes: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['social_profiles', 'company_info', 'professional_background', 'news', 'contact_info']
              },
              default: ['social_profiles', 'company_info']
            }
          },
          required: ['contactId', 'contactData']
        }
      },
      {
        type: 'function',
        name: 'bulk_enrich_contacts',
        description: 'Enrich multiple contacts with missing information',
        parameters: {
          type: 'object',
          properties: {
            contactIds: {
              type: 'array',
              items: { type: 'string' }
            },
            enrichmentPriority: {
              type: 'string',
              enum: ['missing_data', 'social_profiles', 'company_updates', 'all'],
              default: 'missing_data'
            },
            maxContacts: {
              type: 'number',
              description: 'Maximum contacts to process',
              default: 50
            }
          },
          required: ['contactIds']
        }
      },
      {
        type: 'function',
        name: 'verify_social_profiles',
        description: 'Verify and validate social media profiles for a contact',
        parameters: {
          type: 'object',
          properties: {
            contactId: { type: 'string' },
            profiles: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  platform: { type: 'string', enum: ['linkedin', 'twitter', 'facebook', 'instagram'] },
                  url: { type: 'string' }
                }
              }
            }
          },
          required: ['contactId']
        }
      },

      // 📧 Communication & Email Functions
      {
        type: 'function',
        name: 'optimize_email_timing',
        description: 'Determine optimal email sending time for a contact',
        parameters: {
          type: 'object',
          properties: {
            contactId: { type: 'string' },
            emailType: {
              type: 'string',
              enum: ['cold', 'followup', 'nurture', 'sales'],
              default: 'followup'
            },
            urgency: {
              type: 'string',
              enum: ['low', 'medium', 'high'],
              default: 'medium'
            }
          },
          required: ['contactId']
        }
      },
      {
        type: 'function',
        name: 'generate_personalized_email',
        description: 'Generate personalized email content',
        parameters: {
          type: 'object',
          properties: {
            contactId: { type: 'string' },
            contactData: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                title: { type: 'string' },
                company: { type: 'string' },
                email: { type: 'string' }
              }
            },
          }
        }
      },

      // 🎤 Voice-Specific Functions
      {
        type: 'function',
        name: 'transcribe_voice_note',
        description: 'Convert voice notes to contact updates',
        parameters: {
          type: 'object',
          properties: {
            audioData: { type: 'string', description: 'Base64 encoded audio data' },
            contactId: { type: 'string' },
            noteType: {
              type: 'string',
              enum: ['meeting', 'call', 'general'],
              default: 'general'
            }
          },
          required: ['audioData']
        }
      },
      {
        type: 'function',
        name: 'voice_command_analysis',
        description: 'Analyze voice commands for intent and context',
        parameters: {
          type: 'object',
          properties: {
            audioData: { type: 'string', required: true },
            commandHistory: { type: 'array' },
            userPreferences: { type: 'object' }
          },
          required: ['audioData']
        }
      },
      {
        type: 'function',
        name: 'voice_sentiment_analysis',
        description: 'Analyze sentiment in voice interactions',
        parameters: {
          type: 'object',
          properties: {
            audioData: { type: 'string', required: true },
            contactId: { type: 'string', required: true },
            interactionType: {
              type: 'string',
              enum: ['call', 'meeting', 'voicemail'],
              required: true
            }
          },
          required: ['audioData', 'contactId', 'interactionType']
        }
      },
      {
        type: 'function',
        name: 'voice_meeting_summary',
        description: 'Generate summaries from voice meeting recordings',
        parameters: {
          type: 'object',
          properties: {
            audioData: { type: 'string', required: true },
            participants: { type: 'array', required: true },
            meetingType: { type: 'string', required: true },
            actionItems: { type: 'boolean', default: true }
          },
          required: ['audioData', 'participants', 'meetingType']
        }
      },
      {
        type: 'function',
        name: 'voice_prospect_qualification',
        description: 'Qualify prospects based on voice interaction analysis',
        parameters: {
          type: 'object',
          properties: {
            audioData: { type: 'string', required: true },
            contactData: { type: 'object', required: true },
            qualificationCriteria: {
              type: 'array',
              default: ['budget', 'timeline', 'authority']
            }
          },
          required: ['audioData', 'contactData']
        }
      },

      // 🤖 Smart Functions
      {
        type: 'function',
        name: 'create_smart_contact',
        description: 'AI-assisted contact creation with validation',
        parameters: {
          type: 'object',
          properties: {
            contactData: { type: 'object', required: true },
            autoEnrich: { type: 'boolean', default: true },
            validateData: { type: 'boolean', default: true },
            createTasks: { type: 'boolean', default: false }
          },
          required: ['contactData']
        }
      },
      {
        type: 'function',
        name: 'generate_contact_insights',
        description: 'Generate actionable insights and recommendations',
        parameters: {
          type: 'object',
          properties: {
            contactId: { type: 'string', required: true },
            insightTypes: {
              type: 'array',
              default: ['opportunities', 'recommendations', 'risks']
            },
            maxInsights: { type: 'number', default: 5 }
          },
          required: ['contactId']
        }
      }
    ];
  }
}

// Export the service instance
export const conversationalAIService = new ConversationalAIService({
  voice: 'alloy',
  temperature: 0.7,
  maxTokens: 4096
});
