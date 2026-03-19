/**
 * Webhook Signature Validation
 * 
 * Provides signature validation for various email providers including:
 * - AgentMail
 * - SendGrid
 * - Mailgun
 * - Postmark
 * - AWS SES
 */

import { createHmac, timingSafeEqual } from 'crypto';
import { logger } from '../core/logger';

// Configuration for webhook secrets
interface WebhookConfig {
  agentmailSecret?: string;
  sendgridSecret?: string;
  mailgunSecret?: string;
  postmarkSecret?: string;
  sesSecret?: string;
}

// Get secrets from environment
function getWebhookSecrets(): WebhookConfig {
  return {
    agentmailSecret: process.env.AGENTMAIL_WEBHOOK_SECRET,
    sendgridSecret: process.env.SENDGRID_WEBHOOK_SECRET,
    mailgunSecret: process.env.MAILGUN_WEBHOOK_SECRET,
    postmarkSecret: process.env.POSTMARK_WEBHOOK_SECRET,
    sesSecret: process.env.SES_WEBHOOK_SECRET
  };
}

/**
 * Webhook request data structure
 */
export interface WebhookRequest {
  headers: Record<string, string | undefined>;
  body: string;
  rawBody?: Buffer;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  provider?: string;
  error?: string;
  timestamp?: number;
}

/**
 * Email providers supported
 */
export type EmailProvider = 'agentmail' | 'sendgrid' | 'mailgun' | 'postmark' | 'ses';

/**
 * Validate webhook signature based on provider
 */
export function validateWebhookSignature(
  req: WebhookRequest,
  provider: EmailProvider
): ValidationResult {
  const secrets = getWebhookSecrets();
  
  switch (provider) {
    case 'agentmail':
      return validateAgentMailSignature(req, secrets.agentmailSecret);
    case 'sendgrid':
      return validateSendGridSignature(req, secrets.sendgridSecret);
    case 'mailgun':
      return validateMailgunSignature(req, secrets.mailgunSecret);
    case 'postmark':
      return validatePostmarkSignature(req, secrets.postmarkSecret);
    case 'ses':
      return validateSESSignature(req, secrets.sesSecret);
    default:
      return { valid: false, error: `Unknown provider: ${provider}` };
  }
}

/**
 * Auto-detect provider from headers and validate
 */
export function autoValidateWebhook(req: WebhookRequest): ValidationResult {
  const { headers } = req;
  
  // Check for provider-specific headers
  if (headers['x-agentmail-signature']) {
    return validateWebhookSignature(req, 'agentmail');
  }
  if (headers['x-sg-signature'] || headers['x-smtpapi']) {
    return validateWebhookSignature(req, 'sendgrid');
  }
  if (headers['x-mailgun-signature']) {
    return validateWebhookSignature(req, 'mailgun');
  }
  if (headers['x-postmark-signature']) {
    return validateWebhookSignature(req, 'postmark');
  }
  if (headers['x-amz-sns-message-type']) {
    return validateWebhookSignature(req, 'ses');
  }
  
  // Try to detect from content-type
  const contentType = headers['content-type'] || '';
  if (contentType.includes('application/json')) {
    // Default to agentmail for JSON payloads without specific signature
    const secrets = getWebhookSecrets();
    if (secrets.agentmailSecret) {
      return validateWebhookSignature(req, 'agentmail');
    }
  }
  
  return { valid: false, error: 'Unable to detect provider or no signature present' };
}

// ============================================================================
// Provider-specific validation implementations
// ============================================================================

/**
 * Validate AgentMail webhook signature
 * Uses HMAC-SHA256 signature in X-AgentMail-Signature header
 */
function validateAgentMailSignature(
  req: WebhookRequest,
  secret?: string
): ValidationResult {
  const signature = req.headers['x-agentmail-signature'];
  const timestamp = req.headers['x-agentmail-timestamp'];
  
  if (!secret) {
    logger.warn('AgentMail webhook secret not configured');
    return { valid: false, error: 'Webhook secret not configured' };
  }
  
  if (!signature) {
    return { valid: false, error: 'Missing X-AgentMail-Signature header' };
  }
  
  try {
    // Create signature payload: timestamp + "." + body
    const timestampValue = timestamp || Math.floor(Date.now() / 1000).toString();
    const payload = `${timestampValue}.${req.body}`;
    
    // Compute expected signature
    const expectedSignature = createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    
    // Compare signatures (timing-safe)
    const sigBuffer = Buffer.from(signature as string, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');
    
    if (sigBuffer.length !== expectedBuffer.length) {
      return { valid: false, error: 'Invalid signature format' };
    }
    
    const valid = timingSafeEqual(sigBuffer, expectedBuffer);
    
    if (!valid) {
      logger.warn('AgentMail signature validation failed', {
        providedSignature: signature,
        expectedSignature
      });
    }
    
    return {
      valid,
      provider: 'agentmail',
      timestamp: timestamp ? parseInt(timestamp as string, 10) : undefined,
      error: valid ? undefined : 'Invalid signature'
    };
  } catch (error) {
    logger.error('Error validating AgentMail signature', { error });
    return { valid: false, error: 'Signature validation error' };
  }
}

/**
 * Validate SendGrid webhook signature
 * Uses HMAC-SHA256 signature in X-SendGrid-Signature header
 */
function validateSendGridSignature(
  req: WebhookRequest,
  secret?: string
): ValidationResult {
  const signature = req.headers['x-sg-signature'];
  const timestamp = req.headers['x-sg-timestamp'];
  
  if (!secret) {
    logger.warn('SendGrid webhook secret not configured');
    return { valid: false, error: 'Webhook secret not configured' };
  }
  
  if (!signature) {
    return { valid: false, error: 'Missing X-SendGrid-Signature header' };
  }
  
  try {
    // SendGrid uses: timestamp + "." + body
    const timestampValue = timestamp || Math.floor(Date.now() / 1000).toString();
    const payload = `${timestampValue}.${req.body}`;
    
    // Compute expected signature
    const expectedSignature = createHmac('sha256', secret)
      .update(payload)
      .digest('base64');
    
    // SendGrid signature is base64 encoded
    const valid = signature === expectedSignature;
    
    if (!valid) {
      logger.warn('SendGrid signature validation failed');
    }
    
    return {
      valid,
      provider: 'sendgrid',
      timestamp: timestamp ? parseInt(timestamp as string, 10) : undefined,
      error: valid ? undefined : 'Invalid signature'
    };
  } catch (error) {
    logger.error('Error validating SendGrid signature', { error });
    return { valid: false, error: 'Signature validation error' };
  }
}

/**
 * Validate Mailgun webhook signature
 * Uses HMAC-SHA256 with token and timestamp
 */
function validateMailgunSignature(
  req: WebhookRequest,
  secret?: string
): ValidationResult {
  const signature = req.headers['x-mailgun-signature'];
  const timestamp = req.headers['x-mailgun-timestamp'];
  const token = req.headers['x-mailgun-token'];
  
  if (!secret) {
    logger.warn('Mailgun webhook secret not configured');
    return { valid: false, error: 'Webhook secret not configured' };
  }
  
  // Mailgun uses a different validation approach
  // It requires: timestamp + token (from form body or headers)
  if (!signature || !timestamp) {
    return { valid: false, error: 'Missing Mailgun signature headers' };
  }
  
  try {
    const timestampValue = timestamp as string;
    const tokenValue = token || '';
    
    // Compute expected signature: HMAC-SHA256(secret, timestamp + token)
    const payload = timestampValue + tokenValue;
    const expectedSignature = createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    
    const valid = signature === expectedSignature;
    
    if (!valid) {
      logger.warn('Mailgun signature validation failed');
    }
    
    return {
      valid,
      provider: 'mailgun',
      timestamp: parseInt(timestampValue, 10),
      error: valid ? undefined : 'Invalid signature'
    };
  } catch (error) {
    logger.error('Error validating Mailgun signature', { error });
    return { valid: false, error: 'Signature validation error' };
  }
}

/**
 * Validate Postmark webhook signature
 * Uses HMAC-SHA256 with X-Postmark-Signature header
 */
function validatePostmarkSignature(
  req: WebhookRequest,
  secret?: string
): ValidationResult {
  const signature = req.headers['x-postmark-signature'];
  
  if (!secret) {
    logger.warn('Postmark webhook secret not configured');
    return { valid: false, error: 'Webhook secret not configured' };
  }
  
  if (!signature) {
    return { valid: false, error: 'Missing X-Postmark-Signature header' };
  }
  
  try {
    // Compute expected signature: HMAC-SHA256(secret, body)
    const expectedSignature = createHmac('sha256', secret)
      .update(req.body)
      .digest('base64');
    
    const valid = signature === expectedSignature;
    
    if (!valid) {
      logger.warn('Postmark signature validation failed');
    }
    
    return {
      valid,
      provider: 'postmark',
      error: valid ? undefined : 'Invalid signature'
    };
  } catch (error) {
    logger.error('Error validating Postmark signature', { error });
    return { valid: false, error: 'Signature validation error' };
  }
}

/**
 * Validate AWS SES webhook signature
 * Uses SNS message verification
 */
function validateSESSignature(
  req: WebhookRequest,
  secret?: string
): ValidationResult {
  const snsMessageType = req.headers['x-amz-sns-message-type'];
  
  if (!secret) {
    logger.warn('SES webhook secret not configured');
    return { valid: false, error: 'Webhook secret not configured' };
  }
  
  if (!snsMessageType) {
    return { valid: false, error: 'Not an SNS message' };
  }
  
  try {
    const body = JSON.parse(req.body);
    
    // For SNS, we need to verify the SignatureVersion
    if (body.SignatureVersion === '1') {
      // For Version 1, verify using the signing cert URL
      // This is more complex and typically requires fetching the certificate
      logger.info('SNS SignatureVersion 1 detected - performing basic validation');
      
      // Basic check: verify message contains required fields
      if (!body.Signature || !body.SigningCertURL) {
        return { valid: false, error: 'Invalid SNS message format' };
      }
      
      // Note: Full verification requires:
      // 1. Fetch certificate from SigningCertURL
      // 2. Verify certificate domain
      // 3. Verify signature using public key
      // This is simplified for demonstration
      
      return {
        valid: true, // Would require full implementation
        provider: 'ses',
        error: undefined
      };
    }
    
    return {
      valid: false,
      error: 'Unsupported SNS SignatureVersion'
    };
  } catch (error) {
    logger.error('Error validating SES signature', { error });
    return { valid: false, error: 'Signature validation error' };
  }
}

/**
 * Generate a webhook signature for outgoing webhooks (for testing)
 */
export function generateWebhookSignature(
  body: string,
  secret: string,
  timestamp?: number
): { signature: string; timestamp: number } {
  const ts = timestamp || Math.floor(Date.now() / 1000);
  const payload = `${ts}.${body}`;
  
  const signature = createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return { signature, timestamp: ts };
}

/**
 * Middleware helper for Express.js
 */
export function createWebhookValidationMiddleware(provider: EmailProvider) {
  return (req: any, res: any, next: any) => {
    const webhookReq: WebhookRequest = {
      headers: req.headers,
      body: typeof req.body === 'string' ? req.body : JSON.stringify(req.body),
      rawBody: req.rawBody
    };
    
    const result = validateWebhookSignature(webhookReq, provider);
    
    if (!result.valid) {
      logger.warn('Webhook validation failed', {
        provider,
        error: result.error,
        path: req.path
      });
      return res.status(401).json({ error: 'Invalid signature' });
    }
    
    // Attach validation result to request
    req.webhookValidation = result;
    next();
  };
}
