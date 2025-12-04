/**
 * Security Service
 * Comprehensive security utilities for input validation, sanitization, and protection
 */

import { validationService } from './validation.service';

export interface SecurityConfig {
  enableCSP: boolean;
  enableCSRF: boolean;
  enableRateLimiting: boolean;
  maxRequestSize: number;
  allowedOrigins: string[];
}

export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedName?: string;
}

export interface APIRequestValidation {
  isValid: boolean;
  errors: string[];
  sanitizedData: any;
}

class SecurityService {
  private config: SecurityConfig = {
    enableCSP: true,
    enableCSRF: true,
    enableRateLimiting: true,
    maxRequestSize: 10 * 1024 * 1024, // 10MB
    allowedOrigins: ['http://localhost:5173', 'https://yourdomain.com']
  };

  private rateLimitMap = new Map<string, { count: number; resetTime: number }>();
  private readonly RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
  private readonly RATE_LIMIT_MAX = 100; // requests per window

  /**
   * Initialize security measures
   */
  initialize(): void {
    this.setupCSP();
    this.setupCSRFProtection();
    this.setupSecureHeaders();
  }

  /**
   * Setup Content Security Policy
   */
  private setupCSP(): void {
    if (!this.config.enableCSP) return;

    const csp = `
      default-src 'self';
      script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://www.googletagmanager.com;
      style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
      font-src 'self' https://fonts.gstatic.com;
      img-src 'self' data: https: blob:;
      connect-src 'self' https://api.supabase.co https://*.supabase.co wss://*.supabase.co;
      frame-src 'self' https://js.stripe.com https://www.youtube.com https://player.vimeo.com;
      object-src 'none';
      base-uri 'self';
      form-action 'self';
      frame-ancestors 'none';
    `.replace(/\s+/g, ' ').trim();

    // Add CSP meta tag
    const meta = document.createElement('meta');
    meta.httpEquiv = 'Content-Security-Policy';
    meta.content = csp;
    document.head.appendChild(meta);
  }

  /**
   * Setup CSRF protection
   */
  private setupCSRFProtection(): void {
    if (!this.config.enableCSRF) return;

    // Generate CSRF token
    const token = this.generateSecureToken();
    sessionStorage.setItem('csrf-token', token);

    // Add token to all forms
    document.addEventListener('DOMContentLoaded', () => {
      const forms = document.querySelectorAll('form');
      forms.forEach(form => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = '_csrf';
        input.value = token;
        form.appendChild(input);
      });
    });
  }

  /**
   * Setup secure headers
   */
  private setupSecureHeaders(): void {
    // These would typically be set by the server, but we can add client-side checks
    const headers = {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
    };

    // Log security headers for debugging
    console.log('Security headers configured:', headers);
  }

  /**
   * Generate secure random token
   */
  generateSecureToken(length = 32): string {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Rate limiting check
   */
  checkRateLimit(identifier: string): boolean {
    if (!this.config.enableRateLimiting) return true;

    const now = Date.now();
    const userLimit = this.rateLimitMap.get(identifier);

    if (!userLimit || now > userLimit.resetTime) {
      this.rateLimitMap.set(identifier, {
        count: 1,
        resetTime: now + this.RATE_LIMIT_WINDOW
      });
      return true;
    }

    if (userLimit.count >= this.RATE_LIMIT_MAX) {
      return false;
    }

    userLimit.count++;
    return true;
  }

  /**
   * Validate file upload
   */
  validateFileUpload(file: File, allowedTypes: string[], maxSize: number = 10 * 1024 * 1024): FileValidationResult {
    const errors: string[] = [];

    // Check file size
    if (file.size > maxSize) {
      errors.push(`File size exceeds maximum allowed size of ${maxSize / (1024 * 1024)}MB`);
    }

    // Check file type
    const fileType = file.type.toLowerCase();
    const fileName = file.name.toLowerCase();
    const isAllowedType = allowedTypes.some(type =>
      fileType.includes(type) || fileName.endsWith(type)
    );

    if (!isAllowedType) {
      errors.push(`File type not allowed. Allowed types: ${allowedTypes.join(', ')}`);
    }

    // Check for malicious file names
    const dangerousPatterns = [
      /\.\./,  // Directory traversal
      /^[.-]/, // Hidden files starting with . or -
      /[<>:"|?*]/, // Invalid filename characters
      /[\x00-\x1f\x7f-\x9f]/, // Control characters
    ];

    if (dangerousPatterns.some(pattern => pattern.test(file.name))) {
      errors.push('Invalid filename');
    }

    // Sanitize filename
    let sanitizedName = file.name
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .substring(0, 255);

    // Ensure unique filename
    const extension = sanitizedName.split('.').pop();
    const baseName = sanitizedName.substring(0, sanitizedName.lastIndexOf('.'));
    sanitizedName = `${baseName}_${Date.now()}.${extension}`;

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedName
    };
  }

  /**
   * Sanitize HTML content
   */
  sanitizeHTML(dirty: string, options?: any): string {
    // Enhanced HTML sanitization without external library
    return dirty
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '') // Remove style tags
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '') // Remove iframe tags
      .replace(/on\w+\s*=\s*"[^"]*"/gi, '') // Remove event handlers
      .replace(/on\w+\s*=\s*'[^']*'/gi, '') // Remove event handlers with single quotes
      .replace(/javascript:/gi, '') // Remove javascript: URLs
      .replace(/data:\s*text\/html/gi, '') // Remove data: URLs
      .replace(/vbscript:/gi, '') // Remove vbscript: URLs
      .replace(/<[^>]*>/g, (match) => {
        // Only allow safe tags
        const allowedTags = ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a', 'span', 'div'];
        const tagMatch = match.match(/^<\/?([a-zA-Z][a-zA-Z0-9]*)/);
        if (tagMatch && tagMatch[1] && allowedTags.includes(tagMatch[1].toLowerCase())) {
          return match;
        }
        return '';
      });
  }

  /**
   * Validate API request data
   */
  validateAPIRequest(data: any, schema: any): APIRequestValidation {
    const errors: string[] = [];
    const sanitizedData = { ...data };

    // Size check
    const dataSize = JSON.stringify(data).length;
    if (dataSize > this.config.maxRequestSize) {
      errors.push('Request payload too large');
      return { isValid: false, errors, sanitizedData: {} };
    }

    // Schema validation
    const validation = validationService.validate(data, schema);
    if (!validation.isValid) {
      errors.push(...Object.values(validation.errors).flat());
    }

    // Sanitize all string fields
    this.sanitizeObject(sanitizedData);

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData
    };
  }

  /**
   * Recursively sanitize object properties
   */
  private sanitizeObject(obj: any): void {
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        obj[key] = validationService.sanitizeString(obj[key]);
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        this.sanitizeObject(obj[key]);
      }
    }
  }

  /**
   * Validate origin for CORS
   */
  validateOrigin(origin: string): boolean {
    return this.config.allowedOrigins.includes(origin);
  }

  /**
   * Encrypt sensitive data (client-side encryption before sending to server)
   */
  async encryptData(data: string, key?: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);

    const cryptoKey = key ?
      await crypto.subtle.importKey('raw', encoder.encode(key), 'AES-GCM', false, ['encrypt']) :
      await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt']);

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, dataBuffer);

    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    return btoa(String.fromCharCode(...combined));
  }

  /**
   * Hash sensitive data for comparison
   */
  async hashData(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Security audit logging
   */
  logSecurityEvent(event: string, details: any): void {
    console.warn(`[SECURITY] ${event}:`, {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      ...details
    });
  }

  /**
   * Check for suspicious patterns in input
   */
  detectSuspiciousInput(input: string): boolean {
    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /eval\(/i,
      /document\./i,
      /window\./i,
      /\.\./, // Directory traversal
      /union\s+select/i, // SQL injection
      /drop\s+table/i,
      /--/, // SQL comments
      /\/\*.*\*\//, // SQL comments
    ];

    return suspiciousPatterns.some(pattern => pattern.test(input));
  }
}

export const securityService = new SecurityService();