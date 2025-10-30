/**
 * Mock Data Detection Utility
 *
 * Provides consistent detection of mock/demo data across the application.
 * This ensures uniform behavior when handling mock vs real data.
 */

import { Contact } from '../types';

export interface MockDataDetectionResult {
  isMockData: boolean;
  reason: string;
  confidence: number;
}

/**
 * Detects if a contact contains mock or demo data
 */
export function isMockContact(contact: Contact): MockDataDetectionResult {
  // Check for explicit mock flags
  if (contact.isMockData || contact.dataSource === 'mock') {
    return {
      isMockData: true,
      reason: 'Explicit mock data flag',
      confidence: 100
    };
  }

  // Check for demo-related identifiers
  if (contact.createdBy === 'demo' || contact.isExample) {
    return {
      isMockData: true,
      reason: 'Demo data identifier',
      confidence: 100
    };
  }

  // Check for demo company names
  const demoCompanies = ['Demo Company', 'Sample Corp', 'Test Company', 'Example Inc'];
  if (demoCompanies.includes(contact.company)) {
    return {
      isMockData: true,
      reason: 'Demo company name',
      confidence: 90
    };
  }

  // Check for demo names
  const demoNames = ['Demo User', 'Test User', 'Sample Contact', 'Example Person'];
  if (demoNames.includes(contact.name)) {
    return {
      isMockData: true,
      reason: 'Demo contact name',
      confidence: 90
    };
  }

  // Check for demo email patterns
  if (contact.email && (
    contact.email.includes('demo@') ||
    contact.email.includes('test@') ||
    contact.email.includes('example@') ||
    contact.email.includes('sample@')
  )) {
    return {
      isMockData: true,
      reason: 'Demo email pattern',
      confidence: 85
    };
  }

  // Check for generated IDs (local/mock IDs)
  if (contact.id && (
    contact.id.startsWith('local-') ||
    contact.id.startsWith('mock-') ||
    contact.id.startsWith('demo-') ||
    contact.id.startsWith('batch-')
  )) {
    return {
      isMockData: true,
      reason: 'Generated mock ID pattern',
      confidence: 95
    };
  }

  // Check for placeholder avatar URLs
  if (contact.avatarSrc && (
    contact.avatarSrc.includes('placeholder') ||
    contact.avatarSrc.includes('demo') ||
    contact.avatarSrc.includes('pexels.com')
  )) {
    return {
      isMockData: true,
      reason: 'Placeholder avatar URL',
      confidence: 80
    };
  }

  return {
    isMockData: false,
    reason: 'No mock data indicators found',
    confidence: 0
  };
}

/**
 * Determines if AI operations should be skipped for mock data
 */
export function shouldSkipAIOperations(contact: Contact): boolean {
  const detection = isMockContact(contact);
  return detection.isMockData && detection.confidence >= 80;
}

/**
 * Determines if data persistence should use fallback mode for mock data
 */
export function shouldUseFallbackPersistence(contact: Contact): boolean {
  const detection = isMockContact(contact);
  return detection.isMockData && detection.confidence >= 90;
}

/**
 * Gets a user-friendly message for mock data detection
 */
export function getMockDataMessage(contact: Contact): string | null {
  const detection = isMockContact(contact);
  if (!detection.isMockData) return null;

  return `This appears to be ${detection.reason.toLowerCase()}. Some features may be limited.`;
}

/**
 * Checks if the current environment should treat all data as mock
 */
export function isMockEnvironment(): boolean {
  return import.meta.env.DEV ||
         import.meta.env['VITE_ENV'] === 'development' ||
         import.meta.env['VITE_MOCK_DATA'] === 'true';
}

/**
 * Determines if real AI services should be used
 */
export function shouldUseRealAI(contact?: Contact): boolean {
  // Always use real AI in production
  if (!isMockEnvironment()) return true;

  // In development, check contact if provided
  if (contact) {
    return !shouldSkipAIOperations(contact);
  }

  // Default to real AI in development unless explicitly disabled
  return import.meta.env['VITE_USE_REAL_AI'] !== 'false';
}