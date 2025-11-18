/**
 * CRM Integration Service
 * Handles CRM record creation, opportunity management, and workflow automation
 */

import {
  CRMProduct,
  CRMSalesOpportunity,
  AutomatedWorkflow,
  WorkflowStep,
  AnalysisResults,
  GeneratedContent
} from '../types/productIntelligence';

export class CRMIntegrationService {
  private static instance: CRMIntegrationService;
  private readonly API_BASE_URL = '/api/crm-integration';

  static getInstance(): CRMIntegrationService {
    if (!CRMIntegrationService.instance) {
      CRMIntegrationService.instance = new CRMIntegrationService();
    }
    return CRMIntegrationService.instance;
  }

  /**
   * Create a product record in CRM
   */
  async createProduct(productData: Omit<CRMProduct, 'id'>): Promise<CRMProduct> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productData)
      });

      if (!response.ok) {
        throw new Error(`Product creation failed: ${response.statusText}`);
      }

      const createdProduct = await response.json();
      return this.processProductResponse(createdProduct);
    } catch (error) {
      console.error('Product creation failed:', error);
      throw new Error('Failed to create product in CRM. Please try again.');
    }
  }

  /**
   * Create a sales opportunity in CRM
   */
  async createSalesOpportunity(opportunityData: Omit<CRMSalesOpportunity, 'id'>): Promise<CRMSalesOpportunity> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/opportunities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(opportunityData)
      });

      if (!response.ok) {
        throw new Error(`Opportunity creation failed: ${response.statusText}`);
      }

      const createdOpportunity = await response.json();
      return this.processOpportunityResponse(createdOpportunity);
    } catch (error) {
      console.error('Opportunity creation failed:', error);
      throw new Error('Failed to create sales opportunity. Please try again.');
    }
  }

  /**
   * Create automated workflow for sales process
   */
  async createAutomatedWorkflow(workflowData: Omit<AutomatedWorkflow, 'id' | 'createdAt' | 'updatedAt'>): Promise<AutomatedWorkflow> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/workflows`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...workflowData,
          createdAt: new Date(),
          updatedAt: new Date()
        })
      });

      if (!response.ok) {
        throw new Error(`Workflow creation failed: ${response.statusText}`);
      }

      const createdWorkflow = await response.json();
      return this.processWorkflowResponse(createdWorkflow);
    } catch (error) {
      console.error('Workflow creation failed:', error);
      throw new Error('Failed to create automated workflow. Please try again.');
    }
  }

  /**
   * Execute next step in automated workflow
   */
  async executeWorkflowStep(workflowId: string, stepId: string): Promise<WorkflowStep> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/workflows/${workflowId}/steps/${stepId}/execute`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error(`Step execution failed: ${response.statusText}`);
      }

      const executedStep = await response.json();
      return this.processStepResponse(executedStep);
    } catch (error) {
      console.error('Step execution failed:', error);
      throw new Error('Failed to execute workflow step. Please try again.');
    }
  }

  /**
   * Get workflow status and progress
   */
  async getWorkflowStatus(workflowId: string): Promise<AutomatedWorkflow> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/workflows/${workflowId}`);

      if (!response.ok) {
        throw new Error(`Workflow status check failed: ${response.statusText}`);
      }

      const workflow = await response.json();
      return this.processWorkflowResponse(workflow);
    } catch (error) {
      console.error('Workflow status check failed:', error);
      throw new Error('Failed to get workflow status. Please try again.');
    }
  }

  /**
   * Create complete CRM setup from analysis results
   */
  async createCompleteCRMSetup(
    analysis: AnalysisResults,
    generatedContent: GeneratedContent,
    contactIds: string[],
    context?: {
      userId?: string;
      teamId?: string;
      priority?: 'low' | 'medium' | 'high';
      expectedValue?: number;
    }
  ): Promise<{
    product: CRMProduct;
    opportunity: CRMSalesOpportunity;
    workflow: AutomatedWorkflow;
  }> {
    try {
      // Create product record
      const productData: Omit<CRMProduct, 'id'> = {
        name: analysis.product.name,
        category: analysis.product.category,
        description: analysis.product.targetMarket,
        pricing: analysis.product.pricing,
        features: analysis.product.features,
        targetMarket: analysis.product.targetMarket,
        competitors: analysis.market.competitors,
        analysisId: analysis.analysisId
      };

      const product = await this.createProduct(productData);

      // Create sales opportunity
      const opportunityData: Omit<CRMSalesOpportunity, 'id'> = {
        productId: product.id,
        contactIds,
        value: context?.expectedValue || this.estimateDealValue(analysis),
        probability: this.calculateInitialProbability(analysis),
        stage: 'prospecting',
        generatedContent,
        analysisId: analysis.analysisId
      };

      const opportunity = await this.createSalesOpportunity(opportunityData);

      // Create automated workflow
      const workflowSteps = this.generateWorkflowSteps(generatedContent, analysis);
      const workflowData: Omit<AutomatedWorkflow, 'id' | 'createdAt' | 'updatedAt'> = {
        opportunityId: opportunity.id,
        status: 'active',
        steps: workflowSteps,
        currentStep: 0
      };

      const workflow = await this.createAutomatedWorkflow(workflowData);

      return { product, opportunity, workflow };
    } catch (error) {
      console.error('Complete CRM setup failed:', error);
      throw new Error('Failed to create complete CRM setup. Please try again.');
    }
  }

  /**
   * Estimate deal value based on analysis
   */
  private estimateDealValue(analysis: AnalysisResults): number {
    const baseValue = analysis.product.pricing.ranges.max;
    const marketSize = analysis.market.size.toLowerCase();

    let multiplier = 1;
    if (marketSize.includes('billion')) multiplier = 1.5;
    else if (marketSize.includes('million')) multiplier = 1.2;
    else if (marketSize.includes('thousand')) multiplier = 0.8;

    return Math.round(baseValue * multiplier);
  }

  /**
   * Calculate initial probability based on analysis confidence
   */
  private calculateInitialProbability(analysis: AnalysisResults): number {
    // Base probability on analysis confidence and market factors
    let probability = analysis.confidence * 0.01; // Convert to decimal

    // Adjust based on market opportunity
    if (analysis.market.opportunities.length > 0) probability += 0.1;
    if (analysis.market.threats.length > 2) probability -= 0.1;

    // Adjust based on competitive advantages
    if (analysis.product.competitiveAdvantages.length > 2) probability += 0.1;

    return Math.max(0.1, Math.min(0.9, probability)); // Clamp between 10% and 90%
  }

  /**
   * Generate workflow steps based on content and analysis
   */
  private generateWorkflowSteps(content: GeneratedContent, analysis: AnalysisResults): WorkflowStep[] {
    const steps: WorkflowStep[] = [];
    let stepId = 1;

    // Email sequence
    if (content.emails.length > 0) {
      content.emails.forEach((email, index) => {
        steps.push({
          id: `email_${stepId++}`,
          type: 'email',
          status: 'pending',
          contentId: email.id,
          scheduledFor: index === 0 ? new Date() : new Date(Date.now() + (index * 3 * 24 * 60 * 60 * 1000)) // 3-day intervals
        });
      });
    }

    // Call sequence
    if (content.callScripts.length > 0) {
      content.callScripts.forEach((script, index) => {
        steps.push({
          id: `call_${stepId++}`,
          type: 'call',
          status: 'pending',
          contentId: script.id,
          scheduledFor: new Date(Date.now() + ((content.emails.length + index) * 7 * 24 * 60 * 60 * 1000)) // After emails
        });
      });
    }

    // SMS follow-ups
    if (content.smsMessages.length > 0) {
      content.smsMessages.forEach((sms, index) => {
        steps.push({
          id: `sms_${stepId++}`,
          type: 'sms',
          status: 'pending',
          contentId: sms.id,
          scheduledFor: new Date(Date.now() + ((content.emails.length + content.callScripts.length + index) * 24 * 60 * 60 * 1000))
        });
      });
    }

    // Meeting scheduling
    steps.push({
      id: `meeting_${stepId++}`,
      type: 'meeting',
      status: 'pending',
      scheduledFor: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days out
      notes: 'Schedule discovery meeting based on playbook recommendations'
    });

    return steps;
  }

  /**
   * Process API responses
   */
  private processProductResponse(data: any): CRMProduct {
    return {
      id: data.id,
      name: data.name,
      category: data.category,
      description: data.description,
      pricing: data.pricing,
      features: data.features || [],
      targetMarket: data.targetMarket,
      competitors: data.competitors || [],
      analysisId: data.analysisId
    };
  }

  private processOpportunityResponse(data: any): CRMSalesOpportunity {
    const result: CRMSalesOpportunity = {
      id: data.id,
      productId: data.productId,
      contactIds: data.contactIds || [],
      value: data.value,
      probability: data.probability,
      stage: data.stage,
      generatedContent: data.generatedContent,
      analysisId: data.analysisId
    };

    if (data.expectedCloseDate) {
      result.expectedCloseDate = new Date(data.expectedCloseDate);
    }

    return result;
  }

  private processWorkflowResponse(data: any): AutomatedWorkflow {
    return {
      id: data.id,
      opportunityId: data.opportunityId,
      status: data.status,
      steps: data.steps || [],
      currentStep: data.currentStep || 0,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt)
    };
  }

  private processStepResponse(data: any): WorkflowStep {
    const result: WorkflowStep = {
      id: data.id,
      type: data.type,
      status: data.status
    };

    if (data.scheduledFor) {
      result.scheduledFor = new Date(data.scheduledFor);
    }

    if (data.completedAt) {
      result.completedAt = new Date(data.completedAt);
    }

    if (data.contentId) {
      result.contentId = data.contentId;
    }

    if (data.contactId) {
      result.contactId = data.contactId;
    }

    if (data.notes) {
      result.notes = data.notes;
    }

    return result;
  }

  /**
   * Get supported CRM platforms
   */
  getSupportedCRMs(): string[] {
    return ['Salesforce', 'HubSpot', 'Pipedrive', 'Zoho CRM', 'Microsoft Dynamics', 'Custom API'];
  }

  /**
   * Validate CRM configuration
   */
  async validateCRMConnection(crmType: string, config: any): Promise<boolean> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/validate-connection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ crmType, config })
      });

      return response.ok;
    } catch (error) {
      console.error('CRM validation failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const crmIntegrationService = CRMIntegrationService.getInstance();