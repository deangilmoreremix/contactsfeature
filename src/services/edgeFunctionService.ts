import { supabase } from './supabaseClient'
import { streamTask, type TaskLive } from './aiTask'
import { streamFunction } from './functionStream'

const CHAT_URL = '/.netlify/functions/chat'

export class EdgeFunctionService {
  private static instance: EdgeFunctionService

  static getInstance(): EdgeFunctionService {
    if (!EdgeFunctionService.instance) {
      EdgeFunctionService.instance = new EdgeFunctionService()
    }
    return EdgeFunctionService.instance
  }

  // Contact processing functions
  async validateContact(data: any) {
    const { data: result, error } = await supabase.functions.invoke('contacts', {
      body: { action: 'validate', data }
    })
    if (error) throw error
    return result
  }

  async enrichContact(data: any, type: string = 'comprehensive') {
    const { data: result, error } = await supabase.functions.invoke('contacts', {
      body: { action: 'enrich', data }
    })
    if (error) throw error
    return result
  }

  async processContact(data: any) {
    const { data: result, error } = await supabase.functions.invoke('contacts', {
      body: { action: 'process', data }
    })
    if (error) throw error
    return result
  }

  // Smart Scoring
  async calculateContactScore(contactData: any, criteria: any = {}, live?: TaskLive) {
    return streamTask<any>('smart-score', { contactData, scoringCriteria: criteria }, live)
  }

  // Email functions
  async composeEmail(contactData: any, emailType: string, context: any = {}) {
    const { data: result, error } = await supabase.functions.invoke('email-composer', {
      body: { contactData, emailType, context }
    })
    if (error) throw error
    return result
  }

  async analyzeEmail(data: any) {
    const { data: result, error } = await supabase.functions.invoke('email-analyzer', {
      body: data
    })
    if (error) throw error
    return result
  }

  // AI Insights
  async generateInsights(data: any, insightType: string) {
    const { data: result, error } = await supabase.functions.invoke('ai-insights', {
      body: { data, insightType }
    })
    if (error) throw error
    return result
  }

  // Automation
  async processAutomation(trigger: string, data: any, rules: any = {}, live?: TaskLive) {
    return streamTask<any>('automation-ai', { trigger, data, rules }, live)
  }

  // Bulk operations
  async processBulkContacts(contacts: any[], operation: string, options: any = {}, live?: TaskLive) {
    return streamTask<any>('smart-bulk', { contacts, operation, options }, live)
  }

  // Categorization
  async categorizeContacts(contacts: any[], criteria: any = {}, live?: TaskLive) {
    return streamTask<any>('smart-categorize', { contacts, criteria }, live)
  }

  // Qualification
  async qualifyLeads(leads: any[], qualificationRules: any = {}, live?: TaskLive) {
    return streamTask<any>('smart-qualify', { leads, qualificationRules }, live)
  }

  // Predictive Analytics
  async generatePredictions(data: any, predictionType: string, live?: TaskLive) {
    return streamTask<any>('predictive-analytics', { data, predictionType, timeFrame: data?.timeFrame }, live)
  }

  // Meeting optimization
  async optimizeMeeting(data: any, live?: TaskLive) {
    // accepts { meetingData, optimizationType } or the meeting fields directly
    return streamTask<any>('meeting-optimizer', data && data.meetingData ? data : { meetingData: data, optimizationType: data?.optimizationType }, live)
  }

  // Relationship insights
  async analyzeRelationships(contactId: string, data: any = {}, live?: TaskLive) {
    return streamTask<any>('relationship-insights', { contactId, ...data }, live)
  }

  // Timeline generation
  async generateTimeline(contactId: string, options: any = {}, live?: TaskLive) {
    return streamTask<any>('timeline-generator', { contactId, entityType: 'contact', options }, live)
  }

  // Duplicate detection
  async detectDuplicates(contacts: any[], threshold: number = 0.8) {
    const { data: result, error } = await supabase.functions.invoke('duplicate-detection', {
      body: { contacts, threshold }
    })
    if (error) throw error
    return result
  }

  // Conversation analysis
  async analyzeConversation(conversationData: any, live?: TaskLive) {
    // accepts either the conversation itself or { conversationData, analysisType }
    const params = conversationData && conversationData.conversationData
      ? { conversationData: conversationData.conversationData, analysisType: conversationData.analysisType }
      : { conversationData, analysisType: conversationData?.analysisType }
    return streamTask<any>('conversation-analysis', params, live)
  }

  // Personalized messages
  async generatePersonalizedMessage(contactData: any, context: any = {}, live?: TaskLive) {
    return streamTask<any>('personalized-messages', { contactData, context }, live)
  }

  // Email templates
  async getEmailTemplates(category: string = 'all') {
    const { data: result, error } = await supabase.functions.invoke('email-templates', {
      body: { category }
    })
    if (error) throw error
    return result
  }

  // AI Reasoning
  async performReasoning(data: any, reasoningType: string, live?: TaskLive) {
    return streamTask<any>('ai-reasoning', { data, reasoningType }, live)
  }

  // Contact card AI
  async enhanceContactCard(contactData: any, live?: TaskLive) {
    return streamTask<any>('contact-card-ai', { contactData, cardType: contactData?.cardType }, live)
  }

  // Contact detail AI
  async enhanceContactDetail(contactData: any, live?: TaskLive) {
    return streamTask<any>('contact-detail-ai', { contactData, detailType: contactData?.detailType }, live)
  }

  // Journey Manager
  async getJourneyEvents(contactId: string, filters: any = {}) {
    const { data: result, error } = await supabase.functions.invoke('journey-manager', {
      body: { action: 'get_events', contactId, filters }
    })
    if (error) throw error
    return result
  }

  async addJourneyEvent(contactId: string, eventData: any) {
    const { data: result, error } = await supabase.functions.invoke('journey-manager', {
      body: { action: 'add_event', contactId, eventData }
    })
    if (error) throw error
    return result
  }

  async updateJourneyEvent(eventId: string, eventData: any) {
    const { data: result, error } = await supabase.functions.invoke('journey-manager', {
      body: { action: 'update_event', data: { id: eventId, ...eventData } }
    })
    if (error) throw error
    return result
  }

  async deleteJourneyEvent(eventId: string) {
    const { data: result, error } = await supabase.functions.invoke('journey-manager', {
      body: { action: 'delete_event', data: { id: eventId } }
    })
    if (error) throw error
    return result
  }

  async getJourneyTimeline(contactId: string, filters: any = {}) {
    const { data: result, error } = await supabase.functions.invoke('journey-manager', {
      body: { action: 'get_timeline', contactId, filters }
    })
    if (error) throw error
    return result
  }

  // Analytics Manager
  async getContactAnalytics(contactId: string, filters: any = {}) {
    const { data: result, error } = await supabase.functions.invoke('analytics-manager', {
      body: { action: 'get', contactId, data: filters }
    })
    if (error) throw error
    return result
  }

  async createAnalyticsData(contactId: string, analyticsData: any) {
    const { data: result, error } = await supabase.functions.invoke('analytics-manager', {
      body: { action: 'create', contactId, data: analyticsData }
    })
    if (error) throw error
    return result
  }

  async updateAnalyticsData(analyticsId: string, analyticsData: any) {
    const { data: result, error } = await supabase.functions.invoke('analytics-manager', {
      body: { action: 'update', data: { id: analyticsId, ...analyticsData } }
    })
    if (error) throw error
    return result
  }

  async deleteAnalyticsData(analyticsId: string) {
    const { data: result, error } = await supabase.functions.invoke('analytics-manager', {
      body: { action: 'delete', data: { id: analyticsId } }
    })
    if (error) throw error
    return result
  }

  // Communication Manager
  async getCommunicationHistory(contactId: string, filters: any = {}) {
    const { data: result, error } = await supabase.functions.invoke('communication-manager', {
      body: { action: 'get', contactId, data: filters }
    })
    if (error) throw error
    return result
  }

  async addCommunication(contactId: string, communicationData: any) {
    const { data: result, error } = await supabase.functions.invoke('communication-manager', {
      body: { action: 'create', contactId, data: communicationData }
    })
    if (error) throw error
    return result
  }

  async updateCommunication(communicationId: string, communicationData: any) {
    const { data: result, error } = await supabase.functions.invoke('communication-manager', {
      body: { action: 'update', data: { id: communicationId, ...communicationData } }
    })
    if (error) throw error
    return result
  }

  async deleteCommunication(communicationId: string) {
    const { data: result, error } = await supabase.functions.invoke('communication-manager', {
      body: { action: 'delete', data: { id: communicationId } }
    })
    if (error) throw error
    return result
  }

  // Automation Manager
  async getAutomationRules(contactId: string, filters: any = {}) {
    const { data: result, error } = await supabase.functions.invoke('automation-manager', {
      body: { action: 'get', contactId, data: filters }
    })
    if (error) throw error
    return result
  }

  async createAutomationRule(contactId: string, ruleData: any) {
    const { data: result, error } = await supabase.functions.invoke('automation-manager', {
      body: { action: 'create', contactId, data: ruleData }
    })
    if (error) throw error
    return result
  }

  async updateAutomationRule(ruleId: string, ruleData: any) {
    const { data: result, error } = await supabase.functions.invoke('automation-manager', {
      body: { action: 'update', data: { id: ruleId, ...ruleData } }
    })
    if (error) throw error
    return result
  }

  async deleteAutomationRule(ruleId: string) {
    const { data: result, error } = await supabase.functions.invoke('automation-manager', {
      body: { action: 'delete', data: { id: ruleId } }
    })
    if (error) throw error
    return result
  }

  // Insights Manager
  async getContactInsights(contactId: string, filters: any = {}) {
    const { data: result, error } = await supabase.functions.invoke('insights-manager', {
      body: { action: 'get', contactId, data: filters }
    })
    if (error) throw error
    return result
  }

  async createInsight(contactId: string, insightData: any) {
    const { data: result, error } = await supabase.functions.invoke('insights-manager', {
      body: { action: 'create', contactId, data: insightData }
    })
    if (error) throw error
    return result
  }

  async updateInsight(insightId: string, insightData: any) {
    const { data: result, error } = await supabase.functions.invoke('insights-manager', {
      body: { action: 'update', data: { id: insightId, ...insightData } }
    })
    if (error) throw error
    return result
  }

  async deleteInsight(insightId: string) {
    const { data: result, error } = await supabase.functions.invoke('insights-manager', {
      body: { action: 'delete', data: { id: insightId } }
    })
    if (error) throw error
    return result
  }

  // Email Manager
  async sendEmail(contactId: string, emailData: any) {
    const { data: result, error } = await supabase.functions.invoke('email-manager', {
      body: { action: 'send', contactId, data: emailData }
    })
    if (error) throw error
    return result
  }

  async getEmailHistory(contactId: string, filters: any = {}) {
    const { data: result, error } = await supabase.functions.invoke('email-manager', {
      body: { action: 'get_history', contactId, data: filters }
    })
    if (error) throw error
    return result
  }

  async trackEmailOpen(emailId: string, trackingData: any) {
    const { data: result, error } = await supabase.functions.invoke('email-manager', {
      body: { action: 'track_open', data: { id: emailId, ...trackingData } }
    })
    if (error) throw error
    return result
  }

  async trackEmailClick(emailId: string, trackingData: any) {
    const { data: result, error } = await supabase.functions.invoke('email-manager', {
      body: { action: 'track_click', data: { id: emailId, ...trackingData } }
    })
    if (error) throw error
    return result
  }

  // Specialized AI Tools Functions
  async generateInstantResponse(message: string, context: any = {}, contactData: any = {}, live?: TaskLive) {
    return streamTask<any>('instant-response', { message, context, contactData }, live)
  }

  async analyzeDeal(dealData: any, analysisType: string = 'comprehensive', live?: TaskLive) {
    return streamTask<any>('deal-analysis', { dealData, dealId: dealData?.id, analysisType }, live)
  }

  async performSemanticSearch(query: string, searchType: string = 'universal', filters: any = {}, options: any = {}) {
    const { data: result, error } = await supabase.functions.invoke('semantic-search', {
      body: { query, searchType, filters, options }
    })
    if (error) throw error
    return result
  }

  /** Create a server-side chat conversation (netlify/functions/chat.js) and return its `conv_...` id. */
  async startChat(): Promise<string> {
    const { result } = await streamFunction<{ conversationId: string }>(CHAT_URL, { action: 'start' })
    if (!result?.conversationId) throw new Error('Could not start the chat')
    return result.conversationId
  }

  /**
   * Send one chat turn; text streams into `live.onDelta`. `conversationId` must be a `conv_...` id from startChat()
   * (anything else starts a new conversation); the id actually used is returned for the next turn.
   */
  async streamChat(message: string, conversationId: string | null | undefined, context: any = {}, live?: TaskLive) {
    const id = conversationId && /^conv_/.test(conversationId) ? conversationId : await this.startChat()
    const { result } = await streamFunction<any>(CHAT_URL, { message, conversationId: id, context }, live ?? {})
    if (!result) throw new Error('The assistant returned no reply')
    return { ...result, conversationId: result.conversationId ?? id }
  }

  async generateChatResponse(message: string, conversationId: string | null | undefined, context: any = {}, live?: TaskLive) {
    return this.streamChat(message, conversationId, context, live)
  }
}

export const edgeFunctionService = EdgeFunctionService.getInstance()