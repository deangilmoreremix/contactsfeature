/**
 * Communication Configuration Service
 * Manages SMTP, Twilio, and other communication provider settings
 */

export interface SMTPConfig {
  id: string;
  name: string;
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  fromEmail: string;
  fromName: string;
  isActive: boolean;
  testMode: boolean;
  dailyLimit?: number;
  rateLimit?: number; // emails per minute
  createdAt: string;
  updatedAt: string;
}

export interface TwilioConfig {
  id: string;
  name: string;
  accountSid: string;
  authToken: string;
  phoneNumbers: string[];
  isActive: boolean;
  testMode: boolean;
  dailyLimit?: number;
  rateLimit?: number; // SMS per minute
  webhookUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MailtoConfig {
  id: string;
  name: string;
  defaultSubject?: string;
  defaultBody?: string;
  includeContactInfo: boolean;
  openInNewTab: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CommunicationProvider {
  type: 'smtp' | 'twilio' | 'mailto' | 'sendgrid' | 'mailgun' | 'postmark';
  config: SMTPConfig | TwilioConfig | MailtoConfig;
  priority: number; // Higher number = higher priority
  fallbackEnabled: boolean;
  healthCheck: {
    lastChecked: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    responseTime?: number;
    errorMessage?: string;
  };
}

export interface CommunicationTestResult {
  success: boolean;
  responseTime: number;
  errorMessage?: string;
  details?: any;
}

export class CommunicationConfigService {
  private static instance: CommunicationConfigService;
  private providers: Map<string, CommunicationProvider> = new Map();
  private configs: {
    smtp: Map<string, SMTPConfig>;
    twilio: Map<string, TwilioConfig>;
    mailto: Map<string, MailtoConfig>;
  } = {
    smtp: new Map(),
    twilio: new Map(),
    mailto: new Map()
  };

  static getInstance(): CommunicationConfigService {
    if (!CommunicationConfigService.instance) {
      CommunicationConfigService.instance = new CommunicationConfigService();
    }
    return CommunicationConfigService.instance;
  }

  /**
   * Add SMTP configuration
   */
  addSMTPConfig(config: Omit<SMTPConfig, 'id' | 'createdAt' | 'updatedAt'>): SMTPConfig {
    const smtpConfig: SMTPConfig = {
      ...config,
      id: `smtp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.configs.smtp.set(smtpConfig.id, smtpConfig);
    return smtpConfig;
  }

  /**
   * Add Twilio configuration
   */
  addTwilioConfig(config: Omit<TwilioConfig, 'id' | 'createdAt' | 'updatedAt'>): TwilioConfig {
    const twilioConfig: TwilioConfig = {
      ...config,
      id: `twilio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.configs.twilio.set(twilioConfig.id, twilioConfig);
    return twilioConfig;
  }

  /**
   * Add Mailto configuration
   */
  addMailtoConfig(config: Omit<MailtoConfig, 'id' | 'createdAt' | 'updatedAt'>): MailtoConfig {
    const mailtoConfig: MailtoConfig = {
      ...config,
      id: `mailto_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.configs.mailto.set(mailtoConfig.id, mailtoConfig);
    return mailtoConfig;
  }

  /**
   * Register communication provider
   */
  registerProvider(provider: CommunicationProvider): void {
    this.providers.set(`${provider.type}_${provider.config.id}`, provider);
  }

  /**
   * Get active SMTP configuration
   */
  getActiveSMTPConfig(): SMTPConfig | null {
    const smtpConfigs = Array.from(this.configs.smtp.values());
    return smtpConfigs.find(config => config.isActive) || null;
  }

  /**
   * Get active Twilio configuration
   */
  getActiveTwilioConfig(): TwilioConfig | null {
    const twilioConfigs = Array.from(this.configs.twilio.values());
    return twilioConfigs.find(config => config.isActive) || null;
  }

  /**
   * Get active Mailto configuration
   */
  getActiveMailtoConfig(): MailtoConfig | null {
    const mailtoConfigs = Array.from(this.configs.mailto.values());
    return mailtoConfigs.find(config => config.isActive) || null;
  }

  /**
   * Get all configurations by type
   */
  getConfigsByType(type: 'smtp' | 'twilio' | 'mailto'): any[] {
    return Array.from(this.configs[type].values());
  }

  /**
   * Update configuration
   */
  updateConfig(type: 'smtp' | 'twilio' | 'mailto', id: string, updates: any): boolean {
    const configMap = this.configs[type];
    const config = configMap.get(id);

    if (!config) return false;

    configMap.set(id, {
      ...config,
      ...updates,
      updatedAt: new Date().toISOString()
    });

    return true;
  }

  /**
   * Delete configuration
   */
  deleteConfig(type: 'smtp' | 'twilio' | 'mailto', id: string): boolean {
    return this.configs[type].delete(id);
  }

  /**
   * Test SMTP configuration
   */
  async testSMTPConfig(configId: string): Promise<CommunicationTestResult> {
    const config = this.configs.smtp.get(configId);
    if (!config) {
      return {
        success: false,
        responseTime: 0,
        errorMessage: 'SMTP configuration not found'
      };
    }

    const startTime = Date.now();

    try {
      // In a real implementation, this would attempt to connect to the SMTP server
      // For demo purposes, we'll simulate the test
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay

      // Simulate success/failure based on configuration
      const isValidConfig = config.host && config.port && config.auth.user && config.auth.pass;

      return {
        success: isValidConfig,
        responseTime: Date.now() - startTime,
        errorMessage: isValidConfig ? undefined : 'Invalid SMTP configuration',
        details: {
          host: config.host,
          port: config.port,
          secure: config.secure,
          authenticated: !!config.auth.user
        }
      };
    } catch (error) {
      return {
        success: false,
        responseTime: Date.now() - startTime,
        errorMessage: error instanceof Error ? error.message : 'SMTP test failed'
      };
    }
  }

  /**
   * Test Twilio configuration
   */
  async testTwilioConfig(configId: string): Promise<CommunicationTestResult> {
    const config = this.configs.twilio.get(configId);
    if (!config) {
      return {
        success: false,
        responseTime: 0,
        errorMessage: 'Twilio configuration not found'
      };
    }

    const startTime = Date.now();

    try {
      // In a real implementation, this would call Twilio API to verify credentials
      // For demo purposes, we'll simulate the test
      await new Promise(resolve => setTimeout(resolve, 800)); // Simulate API call

      // Simulate success/failure based on configuration
      const isValidConfig = config.accountSid && config.authToken && config.phoneNumbers.length > 0;

      return {
        success: isValidConfig,
        responseTime: Date.now() - startTime,
        errorMessage: isValidConfig ? undefined : 'Invalid Twilio configuration',
        details: {
          accountSid: config.accountSid.substring(0, 8) + '...',
          phoneNumbers: config.phoneNumbers.length,
          webhookConfigured: !!config.webhookUrl
        }
      };
    } catch (error) {
      return {
        success: false,
        responseTime: Date.now() - startTime,
        errorMessage: error instanceof Error ? error.message : 'Twilio test failed'
      };
    }
  }

  /**
   * Test Mailto configuration
   */
  async testMailtoConfig(configId: string): Promise<CommunicationTestResult> {
    const config = this.configs.mailto.get(configId);
    if (!config) {
      return {
        success: false,
        responseTime: 0,
        errorMessage: 'Mailto configuration not found'
      };
    }

    const startTime = Date.now();

    try {
      // Mailto is always "successful" since it just opens the default email client
      await new Promise(resolve => setTimeout(resolve, 100)); // Minimal delay

      return {
        success: true,
        responseTime: Date.now() - startTime,
        details: {
          opensInNewTab: config.openInNewTab,
          includesContactInfo: config.includeContactInfo,
          hasDefaults: !!(config.defaultSubject || config.defaultBody)
        }
      };
    } catch (error) {
      return {
        success: false,
        responseTime: Date.now() - startTime,
        errorMessage: error instanceof Error ? error.message : 'Mailto test failed'
      };
    }
  }

  /**
   * Run health checks for all active configurations
   */
  async runHealthChecks(): Promise<Map<string, CommunicationTestResult>> {
    const results = new Map<string, CommunicationTestResult>();

    // Test SMTP configurations
    for (const [id, config] of this.configs.smtp) {
      if (config.isActive) {
        const result = await this.testSMTPConfig(id);
        results.set(`smtp_${id}`, result);

        // Update provider health status
        const providerKey = `smtp_${id}`;
        const provider = this.providers.get(providerKey);
        if (provider) {
          provider.healthCheck = {
            lastChecked: new Date().toISOString(),
            status: result.success ? 'healthy' : 'unhealthy',
            responseTime: result.responseTime,
            errorMessage: result.errorMessage
          };
          this.providers.set(providerKey, provider);
        }
      }
    }

    // Test Twilio configurations
    for (const [id, config] of this.configs.twilio) {
      if (config.isActive) {
        const result = await this.testTwilioConfig(id);
        results.set(`twilio_${id}`, result);

        // Update provider health status
        const providerKey = `twilio_${id}`;
        const provider = this.providers.get(providerKey);
        if (provider) {
          provider.healthCheck = {
            lastChecked: new Date().toISOString(),
            status: result.success ? 'healthy' : 'unhealthy',
            responseTime: result.responseTime,
            errorMessage: result.errorMessage
          };
          this.providers.set(providerKey, provider);
        }
      }
    }

    // Test Mailto configurations
    for (const [id, config] of this.configs.mailto) {
      if (config.isActive) {
        const result = await this.testMailtoConfig(id);
        results.set(`mailto_${id}`, result);

        // Update provider health status
        const providerKey = `mailto_${id}`;
        const provider = this.providers.get(providerKey);
        if (provider) {
          provider.healthCheck = {
            lastChecked: new Date().toISOString(),
            status: result.success ? 'healthy' : 'unhealthy',
            responseTime: result.responseTime,
            errorMessage: result.errorMessage
          };
          this.providers.set(providerKey, provider);
        }
      }
    }

    return results;
  }

  /**
   * Get provider health status
   */
  getProviderHealth(): Array<{
    type: string;
    id: string;
    name: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    lastChecked: string;
    responseTime?: number;
    errorMessage?: string;
  }> {
    const healthStatus: Array<{
      type: string;
      id: string;
      name: string;
      status: 'healthy' | 'degraded' | 'unhealthy';
      lastChecked: string;
      responseTime?: number;
      errorMessage?: string;
    }> = [];

    for (const [key, provider] of this.providers) {
      const [type, id] = key.split('_');
      let name = '';

      // Get configuration name
      switch (type) {
        case 'smtp':
          name = this.configs.smtp.get(id)?.name || 'Unknown SMTP';
          break;
        case 'twilio':
          name = this.configs.twilio.get(id)?.name || 'Unknown Twilio';
          break;
        case 'mailto':
          name = this.configs.mailto.get(id)?.name || 'Unknown Mailto';
          break;
      }

      healthStatus.push({
        type,
        id,
        name,
        status: provider.healthCheck.status,
        lastChecked: provider.healthCheck.lastChecked,
        responseTime: provider.healthCheck.responseTime,
        errorMessage: provider.healthCheck.errorMessage
      });
    }

    return healthStatus.sort((a, b) => {
      // Sort by status (unhealthy first) then by type
      const statusOrder = { unhealthy: 0, degraded: 1, healthy: 2 };
      const statusDiff = statusOrder[a.status] - statusOrder[b.status];
      if (statusDiff !== 0) return statusDiff;
      return a.type.localeCompare(b.type);
    });
  }

  /**
   * Generate mailto URL
   */
  generateMailtoUrl(
    configId: string,
    to: string,
    subject?: string,
    body?: string,
    contactInfo?: any
  ): string {
    const config = this.configs.mailto.get(configId);
    if (!config) return `mailto:${to}`;

    let finalSubject = subject || config.defaultSubject || '';
    let finalBody = body || config.defaultBody || '';

    // Add contact info if enabled
    if (config.includeContactInfo && contactInfo) {
      if (finalBody) finalBody += '\n\n';
      finalBody += `Contact Information:\n${JSON.stringify(contactInfo, null, 2)}`;
    }

    const params = new URLSearchParams();
    if (finalSubject) params.set('subject', finalSubject);
    if (finalBody) params.set('body', finalBody);

    const queryString = params.toString();
    return `mailto:${to}${queryString ? '?' + queryString : ''}`;
  }

  /**
   * Get usage statistics
   */
  getUsageStats(): {
    smtp: { total: number; active: number };
    twilio: { total: number; active: number };
    mailto: { total: number; active: number };
    providers: { total: number; healthy: number; unhealthy: number };
  } {
    const smtpConfigs = Array.from(this.configs.smtp.values());
    const twilioConfigs = Array.from(this.configs.twilio.values());
    const mailtoConfigs = Array.from(this.configs.mailto.values());

    const smtpStats = {
      total: smtpConfigs.length,
      active: smtpConfigs.filter(c => c.isActive).length
    };

    const twilioStats = {
      total: twilioConfigs.length,
      active: twilioConfigs.filter(c => c.isActive).length
    };

    const mailtoStats = {
      total: mailtoConfigs.length,
      active: mailtoConfigs.filter(c => c.isActive).length
    };

    const providerStats = {
      total: this.providers.size,
      healthy: Array.from(this.providers.values()).filter(p => p.healthCheck.status === 'healthy').length,
      unhealthy: Array.from(this.providers.values()).filter(p => p.healthCheck.status === 'unhealthy').length
    };

    return {
      smtp: smtpStats,
      twilio: twilioStats,
      mailto: mailtoStats,
      providers: providerStats
    };
  }

  /**
   * Export configuration (for backup/migration)
   */
  exportConfig(): {
    smtp: SMTPConfig[];
    twilio: TwilioConfig[];
    mailto: MailtoConfig[];
    providers: CommunicationProvider[];
  } {
    return {
      smtp: Array.from(this.configs.smtp.values()),
      twilio: Array.from(this.configs.twilio.values()),
      mailto: Array.from(this.configs.mailto.values()),
      providers: Array.from(this.providers.values())
    };
  }

  /**
   * Import configuration (for restore/migration)
   */
  importConfig(config: {
    smtp?: SMTPConfig[];
    twilio?: TwilioConfig[];
    mailto?: MailtoConfig[];
    providers?: CommunicationProvider[];
  }): void {
    if (config.smtp) {
      config.smtp.forEach(c => this.configs.smtp.set(c.id, c));
    }

    if (config.twilio) {
      config.twilio.forEach(c => this.configs.twilio.set(c.id, c));
    }

    if (config.mailto) {
      config.mailto.forEach(c => this.configs.mailto.set(c.id, c));
    }

    if (config.providers) {
      config.providers.forEach(p => this.providers.set(`${p.type}_${p.config.id}`, p));
    }
  }
}

export const communicationConfigService = CommunicationConfigService.getInstance();