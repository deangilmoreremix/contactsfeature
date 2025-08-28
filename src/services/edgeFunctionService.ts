import { supabase } from './supabaseClient'

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

  // AI Enrichment
  async enrichContactData(contactData: any, enrichmentType: string = 'comprehensive') {
    const { data: result, error } = await supabase.functions.invoke('ai-enrichment', {
      body: { contactData, enrichmentType }
    })
    if (error) throw error
    return result
  }

  // Smart Scoring
  async calculateContactScore(contactData: any, criteria: any = {}) {
    const { data: result, error } = await supabase.functions.invoke('smart-score', {
      body: { contactData, scoringCriteria: criteria }
    })
    if (error) throw error
    return result
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
  async processAutomation(trigger: string, data: any, rules: any = {}) {
    const { data: result, error } = await supabase.functions.invoke('automation-ai', {
      body: { trigger, data, rules }
    })
    if (error) throw error
    return result
  }

  // Bulk operations
  async processBulkContacts(contacts: any[], operation: string, options: any = {}) {
    const { data: result, error } = await supabase.functions.invoke('smart-bulk', {
      body: { contacts, operation, options }
    })
    if (error) throw error
    return result
  }

  // Categorization
  async categorizeContacts(contacts: any[], criteria: any = {}) {
    const { data: result, error } = await supabase.functions.invoke('smart-categorize', {
      body: { contacts, criteria }
    })
    if (error) throw error
    return result
  }

  // Qualification
  async qualifyLeads(leads: any[], qualificationRules: any = {}) {
    const { data: result, error } = await supabase.functions.invoke('smart-qualify', {
      body: { leads, qualificationRules }
    })
    if (error) throw error
    return result
  }

  // Predictive Analytics
  async generatePredictions(data: any, predictionType: string) {
    const { data: result, error } = await supabase.functions.invoke('predictive-analytics', {
      body: { data, predictionType }
    })
    if (error) throw error
    return result
  }

  // Meeting optimization
  async optimizeMeeting(data: any) {
    const { data: result, error } = await supabase.functions.invoke('meeting-optimizer', {
      body: data
    })
    if (error) throw error
    return result
  }

  // Relationship insights
  async analyzeRelationships(contactId: string, data: any = {}) {
    const { data: result, error } = await supabase.functions.invoke('relationship-insights', {
      body: { contactId, ...data }
    })
    if (error) throw error
    return result
  }

  // Timeline generation
  async generateTimeline(contactId: string, options: any = {}) {
    const { data: result, error } = await supabase.functions.invoke('timeline-generator', {
      body: { contactId, options }
    })
    if (error) throw error
    return result
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
  async analyzeConversation(conversationData: any) {
    const { data: result, error } = await supabase.functions.invoke('conversation-analysis', {
      body: conversationData
    })
    if (error) throw error
    return result
  }

  // Personalized messages
  async generatePersonalizedMessage(contactData: any, context: any = {}) {
    const { data: result, error } = await supabase.functions.invoke('personalized-messages', {
      body: { contactData, context }
    })
    if (error) throw error
    return result
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
  async performReasoning(data: any, reasoningType: string) {
    const { data: result, error } = await supabase.functions.invoke('ai-reasoning', {
      body: { data, reasoningType }
    })
    if (error) throw error
    return result
  }

  // Contact card AI
  async enhanceContactCard(contactData: any) {
    const { data: result, error } = await supabase.functions.invoke('contact-card-ai', {
      body: contactData
    })
    if (error) throw error
    return result
  }

  // Contact detail AI
  async enhanceContactDetail(contactData: any) {
    const { data: result, error } = await supabase.functions.invoke('contact-detail-ai', {
      body: contactData
    })
    if (error) throw error
    return result
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
}

export const edgeFunctionService = EdgeFunctionService.getInstance()