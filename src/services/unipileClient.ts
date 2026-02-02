// Unipile API Client
// Handles all communication with the Unipile API for multi-platform messaging

import {
  Platform,
  MessageData,
  UnipileAccount,
  SendMessageRequest,
  MessageResponse,
  UnipileApiResponse,
  PaginatedResponse,
  ContactInfo,
  UnipileError,
  ConnectionError,
  AuthenticationError,
  RateLimitError
} from '../types/unipile';

export interface UnipileConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  retryAttempts?: number;
}

export class UnipileClient {
  private apiKey: string;
  private baseUrl: string;
  private timeout: number;
  private retryAttempts: number;

  constructor(config: UnipileConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.unipile.com';
    this.timeout = config.timeout || 30000;
    this.retryAttempts = config.retryAttempts || 3;
  }

  // ===========================================
  // ACCOUNT MANAGEMENT
  // ===========================================

  /**
   * Connect a new account for a specific platform
   */
  async connectAccount(platform: Platform): Promise<{ authUrl: string; accountId: string }> {
    const response = await this.request<{ auth_url: string; account_id: string }>(
      'POST',
      '/accounts',
      { platform }
    );

    return {
      authUrl: response.auth_url,
      accountId: response.account_id
    };
  }

  /**
   * Get all connected accounts
   */
  async getAccounts(): Promise<UnipileAccount[]> {
    const response = await this.request<UnipileAccount[]>('GET', '/accounts');
    return response;
  }

  /**
   * Get specific account details
   */
  async getAccount(accountId: string): Promise<UnipileAccount> {
    const response = await this.request<UnipileAccount>('GET', `/accounts/${accountId}`);
    return response;
  }

  /**
   * Disconnect an account
   */
  async disconnectAccount(accountId: string): Promise<void> {
    await this.request('DELETE', `/accounts/${accountId}`);
  }

  /**
   * Sync account data (contacts, messages)
   */
  async syncAccount(accountId: string): Promise<{ synced: boolean; count: number }> {
    const response = await this.request<{ synced: boolean; count: number }>(
      'POST',
      `/accounts/${accountId}/sync`
    );
    return response;
  }

  // ===========================================
  // MESSAGING
  // ===========================================

  /**
   * Send a message
   */
  async sendMessage(request: SendMessageRequest): Promise<MessageResponse> {
    try {
      const payload = {
        account_id: request.accountId,
        to: this.formatContactInfo(request.recipient),
        subject: request.subject,
        body: request.content,
        attachments: request.attachments?.map(att => ({
          name: att.name,
          type: att.type,
          data: att.data ? btoa(att.data) : undefined,
          url: att.url
        })),
        scheduled_at: request.scheduleAt?.toISOString()
      };

      const response = await this.request<any>('POST', '/messages', payload);

      return {
        success: true,
        messageId: response.id,
        scheduledFor: request.scheduleAt
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get messages with filtering
   */
  async getMessages(filters?: {
    accountId?: string;
    conversationId?: string;
    limit?: number;
    offset?: number;
    since?: Date;
    before?: Date;
  }): Promise<PaginatedResponse<MessageData>> {
    const params = new URLSearchParams();

    if (filters?.accountId) params.append('account_id', filters.accountId);
    if (filters?.conversationId) params.append('conversation_id', filters.conversationId);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset) params.append('offset', filters.offset.toString());
    if (filters?.since) params.append('since', filters.since.toISOString());
    if (filters?.before) params.append('before', filters.before.toISOString());

    const query = params.toString();
    const endpoint = `/messages${query ? `?${query}` : ''}`;

    return await this.request<PaginatedResponse<MessageData>>('GET', endpoint);
  }

  /**
   * Get specific message
   */
  async getMessage(messageId: string): Promise<MessageData> {
    const response = await this.request<MessageData>('GET', `/messages/${messageId}`);
    return response;
  }

  /**
   * Mark message as read
   */
  async markAsRead(messageId: string): Promise<void> {
    await this.request('PATCH', `/messages/${messageId}`, { read: true });
  }

  /**
   * Delete a message
   */
  async deleteMessage(messageId: string): Promise<void> {
    await this.request('DELETE', `/messages/${messageId}`);
  }

  // ===========================================
  // CONTACTS
  // ===========================================

  /**
   * Get contacts from connected accounts
   */
  async getContacts(accountId?: string): Promise<PaginatedResponse<ContactInfo>> {
    const endpoint = accountId ? `/contacts?account_id=${accountId}` : '/contacts';
    return await this.request<PaginatedResponse<ContactInfo>>('GET', endpoint);
  }

  /**
   * Search contacts
   */
  async searchContacts(query: string, accountId?: string): Promise<ContactInfo[]> {
    const params = new URLSearchParams({ q: query });
    if (accountId) params.append('account_id', accountId);

    const response = await this.request<ContactInfo[]>(
      'GET',
      `/contacts/search?${params.toString()}`
    );
    return response;
  }

  // ===========================================
  // CONVERSATIONS
  // ===========================================

  /**
   * Get conversations
   */
  async getConversations(accountId?: string): Promise<PaginatedResponse<any>> {
    const endpoint = accountId ? `/conversations?account_id=${accountId}` : '/conversations';
    return await this.request<PaginatedResponse<any>>('GET', endpoint);
  }

  /**
   * Get conversation messages
   */
  async getConversationMessages(conversationId: string): Promise<MessageData[]> {
    const response = await this.request<MessageData[]>(
      'GET',
      `/conversations/${conversationId}/messages`
    );
    return response;
  }

  // ===========================================
  // ATTACHMENTS
  // ===========================================

  /**
   * Upload attachment
   */
  async uploadAttachment(file: File): Promise<{ id: string; url: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await this.request<{ id: string; url: string }>(
      'POST',
      '/attachments',
      formData,
      { 'Content-Type': 'multipart/form-data' }
    );

    return response;
  }

  /**
   * Download attachment
   */
  async downloadAttachment(attachmentId: string): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/attachments/${attachmentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'X-API-Key': this.apiKey
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to download attachment: ${response.statusText}`);
    }

    return await response.blob();
  }

  // ===========================================
  // WEBHOOKS
  // ===========================================

  /**
   * Register webhook URL
   */
  async registerWebhook(url: string, events?: string[]): Promise<{ id: string }> {
    const response = await this.request<{ id: string }>('POST', '/webhooks', {
      url,
      events: events || ['message.received', 'message.sent', 'account.connected']
    });
    return response;
  }

  /**
   * List webhooks
   */
  async getWebhooks(): Promise<any[]> {
    const response = await this.request<any[]>('GET', '/webhooks');
    return response;
  }

  /**
   * Delete webhook
   */
  async deleteWebhook(webhookId: string): Promise<void> {
    await this.request('DELETE', `/webhooks/${webhookId}`);
  }

  // ===========================================
  // PRIVATE METHODS
  // ===========================================

  private async request<T>(
    method: string,
    endpoint: string,
    body?: any,
    headers?: Record<string, string>
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const requestHeaders: Record<string, string> = {
      'Authorization': `Bearer ${this.apiKey}`,
      'X-API-Key': this.apiKey,
      'Content-Type': 'application/json',
      ...headers
    };

    const config: RequestInit = {
      method,
      headers: requestHeaders,
      signal: AbortSignal.timeout(this.timeout)
    };

    if (body && !(body instanceof FormData)) {
      config.body = JSON.stringify(body);
    } else if (body instanceof FormData) {
      // Remove Content-Type for FormData (browser sets it automatically)
      delete requestHeaders['Content-Type'];
      config.body = body;
    }

    let lastError: Error;

    for (let attempt = 0; attempt <= this.retryAttempts; attempt++) {
      try {
        const response = await fetch(url, config);

        if (response.ok) {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            return await response.json();
          } else {
            return {} as T; // For successful responses without body
          }
        }

        // Handle specific error codes
        if (response.status === 401) {
          throw new AuthenticationError('unknown', 'Invalid API key');
        }

        if (response.status === 429) {
          const retryAfter = response.headers.get('retry-after');
          throw new RateLimitError('unknown', retryAfter ? parseInt(retryAfter) : undefined);
        }

        if (response.status >= 500) {
          // Retry on server errors
          lastError = new Error(`Server error: ${response.status}`);
          if (attempt < this.retryAttempts) {
            await this.delay(Math.pow(2, attempt) * 1000); // Exponential backoff
            continue;
          }
        }

        // Client errors - don't retry
        const errorData = await response.json().catch(() => ({}));
        throw new UnipileError(
          errorData.message || `Request failed: ${response.status}`,
          'API_ERROR'
        );

      } catch (error) {
        lastError = error as Error;

        if (error instanceof UnipileError) {
          throw error; // Don't retry on known API errors
        }

        if (attempt < this.retryAttempts) {
          await this.delay(Math.pow(2, attempt) * 1000);
          continue;
        }
      }
    }

    throw lastError!;
  }

  private formatContactInfo(contact: ContactInfo): any {
    return {
      id: contact.id,
      name: contact.name,
      email: contact.email,
      phone: contact.phone
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
let unipileClient: UnipileClient | null = null;

export const getUnipileClient = (): UnipileClient => {
  if (!unipileClient) {
    const apiKey = import.meta.env.VITE_UNIPILE_API_KEY;
    if (!apiKey) {
      throw new Error('VITE_UNIPILE_API_KEY environment variable is required');
    }

    unipileClient = new UnipileClient({
      apiKey,
      baseUrl: import.meta.env.VITE_UNIPILE_BASE_URL,
      timeout: 30000,
      retryAttempts: 3
    });
  }

  return unipileClient;
};

export default UnipileClient;