/**
 * Conversational AI Service
 * Real-time conversational interface for CRM with function calling
 */

import { aiOrchestrator } from './ai-orchestrator.service';
import { logger } from './logger.service';

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
  apiKey: string;
  model: string;
  voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  temperature?: number;
  maxTokens?: number;
}

class ConversationalAIService {
  private config: RealtimeAIConfig;
  private activeConversations: Map<string, ConversationContext> = new Map();
  private websocket: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];

  constructor(config: RealtimeAIConfig) {
    this.config = config;
    this.initializeAudioContext();
  }

  // Initialize WebSocket connection for real-time communication
  async connectRealtime(sessionId: string): Promise<void> {
    const wsUrl = `wss://api.openai.com/v1/realtime?model=${this.config.model}`;

    this.websocket = new WebSocket(wsUrl, [], {
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'OpenAI-Beta': 'realtime=v1'
      }
    });

    this.websocket.onopen = () => {
      logger.info('Real-time AI connection established', undefined, {
        service: 'conversational-ai',
        operation: 'websocket_connected',
        sessionId
      });

      // Send session configuration
      this.sendMessage({
        type: 'session.update',
        session: {
          modalities: ['text', 'audio'],
          instructions: this.getSystemInstructions(),
          voice: this.config.voice || 'alloy',
          input_audio_format: 'pcm16',
          output_audio_format: 'pcm16',
          input_audio_transcription: {
            model: 'whisper-1'
          },
          turn_detection: {
            type: 'server_vad',
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 500
          },
          tools: this.getAllFunctionDefinitions(),
          tool_choice: 'auto',
          temperature: this.config.temperature || 0.8,
          max_response_output_tokens: this.config.maxTokens || 4096
        }
      });
    };

    this.websocket.onmessage = (event) => {
      this.handleRealtimeMessage(event.data, sessionId);
    };

    this.websocket.onerror = (error) => {
      logger.error('Real-time AI connection error', error as Error, undefined, {
        service: 'conversational-ai',
        operation: 'websocket_error',
        sessionId
      });
    };

    this.websocket.onclose = () => {
      logger.info('Real-time AI connection closed', undefined, {
        service: 'conversational-ai',
        operation: 'websocket_closed',
        sessionId
      });
    };
  }

  // Handle incoming real-time messages
  private async handleRealtimeMessage(data: any, sessionId: string): Promise<void> {
    const message = JSON.parse(data);

    switch (message.type) {
      case 'session.created':
        logger.info('AI session created', undefined, {
          service: 'conversational-ai',
          operation: 'session_created',
          sessionId
        });
        break;

      case 'conversation.item.created':
        await this.handleConversationItem(message.item, sessionId);
        break;

      case 'response.output_item.added':
        await this.handleResponseItem(message.item, sessionId);
        break;

      case 'response.function_call_arguments.delta':
        await this.handleFunctionCallDelta(message.delta, message.item_id, sessionId);
        break;

      case 'response.output_item.done':
        await this.handleOutputItemDone(message.item, sessionId);
        break;

      case 'error':
        logger.error('Real-time AI error', new Error(message.error.message), undefined, {
          service: 'conversational-ai',
          operation: 'realtime_error',
          sessionId,
          errorCode: message.error.code
        });
        break;
    }
  }

  // Handle conversation items
  private async handleConversationItem(item: any, sessionId: string): Promise<void> {
    const context = this.activeConversations.get(sessionId);
    if (!context) return;

    const message: ConversationMessage = {
      id: item.id,
      role: item.role,
      content: item.content?.[0]?.text || '',
      timestamp: new Date().toISOString(),
      metadata: {
        intent: item.content?.[0]?.intent,
        confidence: item.content?.[0]?.confidence
      }
    };

    context.conversationHistory.push(message);
  }

  // Handle response items
  private async handleResponseItem(item: any, sessionId: string): Promise<void> {
    if (item.type === 'function_call') {
      await this.handleFunctionCall(item, sessionId);
    }
  }

  // Handle function calls
  private async handleFunctionCall(functionCall: any, sessionId: string): Promise<void> {
    const context = this.activeConversations.get(sessionId);
    if (!context) return;

    try {
      const result = await this.executeCRMFunction(functionCall, context);

      // Send function result back to real-time API
      this.sendMessage({
        type: 'conversation.item.create',
        item: {
          type: 'function_call_output',
          call_id: functionCall.call_id,
          output: JSON.stringify(result)
        }
      });

      // Add function result to conversation history
      context.conversationHistory.push({
        id: `func_result_${Date.now()}`,
        role: 'function',
        content: JSON.stringify(result),
        timestamp: new Date().toISOString(),
        metadata: {
          functionName: functionCall.name,
          functionResult: result
        }
      });

    } catch (error) {
      logger.error('Function execution failed', error as Error, undefined, {
        service: 'conversational-ai',
        operation: 'function_execution_error',
        sessionId,
        functionName: functionCall.name
      });

      // Send error result back
      this.sendMessage({
        type: 'conversation.item.create',
        item: {
          type: 'function_call_output',
          call_id: functionCall.call_id,
          output: JSON.stringify({ error: (error as Error).message })
        }
      });
    }
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

  // Handle function call deltas for streaming
  private async handleFunctionCallDelta(delta: any, itemId: string, sessionId: string): Promise<void> {
    // Handle streaming function call arguments
    logger.debug('Function call delta received', undefined, {
      service: 'conversational-ai',
      operation: 'function_call_delta',
      sessionId,
      itemId,
      delta: delta.arguments
    });
  }

  // Handle completed output items
  private async handleOutputItemDone(item: any, sessionId: string): Promise<void> {
    const context = this.activeConversations.get(sessionId);
    if (!context) return;

    if (item.type === 'message') {
      const message: ConversationMessage = {
        id: item.id,
        role: 'assistant',
        content: item.content?.[0]?.text || '',
        timestamp: new Date().toISOString(),
        metadata: {
          functionCalls: item.content?.filter((c: any) => c.type === 'function_call') || []
        }
      };

      context.conversationHistory.push(message);
    }
  }

  // Send message to real-time API
  private sendMessage(message: any): void {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify(message));
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

    // Add user message to history
    context.conversationHistory.push({
      id: `user_${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    });

    // Send to real-time API
    if (audioData) {
      // Handle audio input
      this.sendMessage({
        type: 'input_audio_buffer.append',
        audio: await this.blobToBase64(audioData)
      });
    } else {
      // Handle text input
      this.sendMessage({
        type: 'conversation.item.create',
        item: {
          type: 'message',
          role: 'user',
          content: [{
            type: 'input_text',
            text: message
          }]
        }
      });
    }

    // Trigger response
    this.sendMessage({
      type: 'response.create'
    });
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
  apiKey: import.meta.env['VITE_OPENAI_API_KEY'] || '',
  model: import.meta.env['VITE_OPENAI_MODEL'] || 'gpt-4o-mini',
  voice: 'alloy',
  temperature: 0.7,
  maxTokens: 4096
});
