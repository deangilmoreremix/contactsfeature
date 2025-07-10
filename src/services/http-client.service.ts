/**
 * HTTP Client Service
 * Centralized HTTP client with interceptors, rate limiting, error handling, and retries
 */

import apiConfig, { ApiEndpoint } from '../config/api.config';
import { logger } from './logger.service';
import { rateLimiter } from './rate-limiter.service';
import { cacheService } from './cache.service';

export interface RequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  data?: any;
  headers?: Record<string, string>;
  params?: Record<string, any>;
  timeout?: number;
  retries?: number;
  cache?: {
    key?: string;
    ttl?: number;
    tags?: string[];
  };
  rateLimit?: {
    identifier?: string;
    endpoint?: string;
  };
}

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  config: RequestConfig;
}

export interface ApiError extends Error {
  status?: number;
  statusText?: string;
  response?: {
    data?: any;
    status: number;
    statusText: string;
  };
  config?: RequestConfig;
  isRetryable: boolean;
}

class HttpClientService {
  private authToken: string | null = null;
  private refreshToken: string | null = null;
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (value?: any) => void;
    reject: (reason?: any) => void;
  }> = [];
  
  constructor() {
    this.loadTokens();
  }
  
  private loadTokens(): void {
    this.authToken = localStorage.getItem(apiConfig.auth.tokenKey);
    this.refreshToken = localStorage.getItem(apiConfig.auth.refreshTokenKey);
  }
  
  private saveTokens(accessToken: string, refreshToken?: string): void {
    this.authToken = accessToken;
    localStorage.setItem(apiConfig.auth.tokenKey, accessToken);
    
    if (refreshToken) {
      this.refreshToken = refreshToken;
      localStorage.setItem(apiConfig.auth.refreshTokenKey, refreshToken);
    }
  }
  
  private clearTokens(): void {
    this.authToken = null;
    this.refreshToken = null;
    localStorage.removeItem(apiConfig.auth.tokenKey);
    localStorage.removeItem(apiConfig.auth.refreshTokenKey);
  }
  
  private async refreshAccessToken(): Promise<string> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }
    
    const response = await this.makeRequest({
      method: 'POST',
      url: `${apiConfig.auth.endpoint.baseURL}/refresh`,
      data: { refreshToken: this.refreshToken },
    }, false); // Don't use auth for refresh request
    
    const { accessToken, refreshToken } = response.data;
    this.saveTokens(accessToken, refreshToken);
    
    return accessToken;
  }
  
  private async handleTokenRefresh(): Promise<string> {
    if (this.isRefreshing) {
      // Wait for ongoing refresh
      return new Promise((resolve, reject) => {
        this.failedQueue.push({ resolve, reject });
      });
    }
    
    this.isRefreshing = true;
    
    try {
      const newToken = await this.refreshAccessToken();
      
      // Process failed queue
      this.failedQueue.forEach(({ resolve }) => resolve(newToken));
      this.failedQueue = [];
      
      return newToken;
    } catch (error) {
      // Process failed queue with error
      this.failedQueue.forEach(({ reject }) => reject(error));
      this.failedQueue = [];
      
      // Clear tokens on refresh failure
      this.clearTokens();
      throw error;
    } finally {
      this.isRefreshing = false;
    }
  }
  
  private buildUrl(baseURL: string, url: string, params?: Record<string, any>): string {
    // If URL is already absolute, use it as-is
    if (url.startsWith('http')) {
      const fullUrl = url;
      if (params) {
        const urlParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            urlParams.append(key, String(value));
          }
        });
        
        const paramString = urlParams.toString();
        if (paramString) {
          return `${fullUrl}${fullUrl.includes('?') ? '&' : '?'}${paramString}`;
        }
      }
      return fullUrl;
    }
    
    // For relative URLs, combine with baseURL
    const fullUrl = baseURL ? `${baseURL}${url}` : url;
    
    if (params) {
      const urlParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          urlParams.append(key, String(value));
        }
      });
      
      const paramString = urlParams.toString();
      if (paramString) {
        return `${fullUrl}${fullUrl.includes('?') ? '&' : '?'}${paramString}`;
      }
    }
    
    return fullUrl;
  }
  
  private async makeRequest<T>(
    config: RequestConfig,
    useAuth = true, 
    attempt = 1
  ): Promise<ApiResponse<T>> {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // Check cache first for GET requests
      if (config.method === 'GET' && config.cache?.key) {
        const cached = cacheService.get<T>('http_cache', config.cache.key);
        if (cached) {
          logger.debug(`Cache hit for ${config.method} ${config.url}`, { requestId });
          return cached as ApiResponse<T>;
        }
      }
      
      // Rate limiting check
      if (config.rateLimit) {
        const rateLimitResult = await rateLimiter.checkLimit(
          config.rateLimit.endpoint || 'api',
          config.rateLimit.identifier || 'default',
          config.url,
          { maxRequests: 100, windowMs: 60000 }
        );
        
        if (!rateLimitResult.allowed) {
          const error = new Error('Rate limit exceeded') as ApiError;
          error.status = 429;
          error.isRetryable = true;
          throw error;
        }
      }
      
      // Prepare headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Request-ID': requestId,
        ...config.headers,
      };
      
      if (useAuth && this.authToken) {
        headers.Authorization = `Bearer ${this.authToken}`;
      }
      
      // Log request
      logger.apiRequest(config.method, config.url, config.data, { requestId });
      const fetchUrl = this.buildUrl('', config.url, config.params);

      console.log(`Making ${config.method} request to: ${fetchUrl}`, {
        hasAuth: !!headers.Authorization,
        method: config.method
      });
      
      // Make HTTP request using fetch with full URL
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.timeout || 30000);
      
      const response = await fetch(fetchUrl, {
        method: config.method,
        headers: { ...headers },
        body: ['GET', 'HEAD'].includes(config.method) ? undefined : config.data ? JSON.stringify(config.data) : undefined,
        signal: controller.signal,
      });
      
      console.log(`Response status: ${response.status} ${response.statusText}`);
      clearTimeout(timeoutId);
      
      // Parse response
      let responseData: T;
      const contentType = response.headers.get('content-type');
      
      if (contentType?.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = (await response.text()) as any;
      }
      
      const apiResponse: ApiResponse<T> = {
        data: responseData,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        config,
      };
      
      // Handle authentication errors
      if (response.status === 401 && useAuth) {
        try {
          await this.handleTokenRefresh();
          // Retry with new token
          return this.makeRequest(config, useAuth, attempt);
        } catch (refreshError) {
          logger.error('Token refresh failed', refreshError as Error, { requestId });
          throw refreshError;
        }
      }
      
      // Handle other HTTP errors
      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`) as ApiError;
        error.status = response.status;
        error.statusText = response.statusText;
        error.response = {
          data: responseData,
          status: response.status,
          statusText: response.statusText,
        };
        error.config = config;
        error.isRetryable = response.status >= 500 || response.status === 429;
        
        throw error;
      }
      
      // Log successful response
      logger.apiResponse(config.method, config.url, response.status, responseData, { requestId });
      
      // Cache GET responses
      if (config.method === 'GET' && config.cache?.key) {
        cacheService.set(
          'http_cache',
          config.cache.key,
          apiResponse,
          config.cache.ttl,
          config.cache.tags
        );
      }
      
      return apiResponse;
      
    } catch (error) {
      // Properly handle and transform the error
      let apiError: ApiError;
      
      if (error instanceof Error) {
        apiError = error as ApiError;
        apiError.isRetryable = error.message.includes('Failed to fetch') || 
                              error.message.includes('Network error') ||
                              error.message.includes('timeout');
      } else {
        apiError = new Error('Unknown error') as ApiError;
        apiError.isRetryable = true;
      }
      
      logger.apiError(config.method, config.url, apiError, { requestId, attempt });
      
      // Retry logic
      const maxRetries = config.retries || 0;
      if (attempt <= maxRetries && apiError.isRetryable) {
        const delay = Math.pow(2, attempt - 1) * 1000; // Exponential backoff
        logger.info(`Retrying request in ${delay}ms`, { requestId, attempt });

        await new Promise(resolve => setTimeout(resolve, delay));
        return this.makeRequest(config, useAuth, attempt + 1);
      }
      
      throw apiError;
    }
  }
  
  // Public API methods
  async get<T>(
    endpoint: string,
    params?: Record<string, any>,
    options?: Partial<RequestConfig>
  ): Promise<ApiResponse<T>> {
    return this.makeRequest({
      method: 'GET',
      url: endpoint,
      params,
      ...options,
    });
  }
  
  async post<T>(
    endpoint: string,
    data?: any,
    options?: Partial<RequestConfig>
  ): Promise<ApiResponse<T>> {
    return this.makeRequest({
      method: 'POST',
      url: endpoint,
      data,
      ...options,
    });
  }
  
  async put<T>(
    endpoint: string,
    data?: any,
    options?: Partial<RequestConfig>
  ): Promise<ApiResponse<T>> {
    return this.makeRequest({
      method: 'PUT',
      url: endpoint,
      data,
      ...options,
    });
  }
  
  async patch<T>(
    endpoint: string,
    data?: any,
    options?: Partial<RequestConfig>
  ): Promise<ApiResponse<T>> {
    return this.makeRequest({
      method: 'PATCH',
      url: endpoint,
      data,
      ...options,
    });
  }
  
  async delete<T>(
    endpoint: string,
    options?: Partial<RequestConfig>
  ): Promise<ApiResponse<T>> {
    return this.makeRequest({
      method: 'DELETE',
      url: endpoint,
      ...options,
    });
  }
  
  // Authentication methods
  setAuth(token: string, refreshToken?: string): void {
    this.saveTokens(token, refreshToken);
  }
  
  clearAuth(): void {
    this.clearTokens();
  }
  
  isAuthenticated(): boolean {
    return !!this.authToken;
  }
}

export const httpClient = new HttpClientService();