/**
 * Validation Service
 * Input/output validation schemas and utilities
 */

export interface ValidationRule {
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'email' | 'phone' | 'url';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: any[];
  custom?: (value: any) => boolean | string;
}

export interface ValidationSchema {
  [field: string]: ValidationRule | ValidationSchema;
}

export interface ValidationResult {
  isValid: boolean;
  errors: { [field: string]: string[] };
}

class ValidationService {
  private phoneRegex = /^\+?[1-9]\d{1,14}$/;
  private emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  private urlRegex = /^https?:\/\/.+/;
  
  private validateField(value: any, rule: ValidationRule, fieldPath: string): string[] {
    const errors: string[] = [];
    
    // Required check
    if (rule.required && (value === null || value === undefined || value === '')) {
      errors.push(`${fieldPath} is required`);
      return errors; // If required and missing, don't check other rules
    }
    
    // Skip other validations if value is empty and not required
    if (value === null || value === undefined || value === '') {
      return errors;
    }
    
    // Type validation
    if (rule.type) {
      switch (rule.type) {
        case 'string':
          if (typeof value !== 'string') {
            errors.push(`${fieldPath} must be a string`);
          }
          break;
        case 'number':
          if (typeof value !== 'number' || isNaN(value)) {
            errors.push(`${fieldPath} must be a valid number`);
          }
          break;
        case 'boolean':
          if (typeof value !== 'boolean') {
            errors.push(`${fieldPath} must be a boolean`);
          }
          break;
        case 'object':
          if (typeof value !== 'object' || Array.isArray(value)) {
            errors.push(`${fieldPath} must be an object`);
          }
          break;
        case 'array':
          if (!Array.isArray(value)) {
            errors.push(`${fieldPath} must be an array`);
          }
          break;
        case 'email':
          if (typeof value !== 'string' || !this.emailRegex.test(value)) {
            errors.push(`${fieldPath} must be a valid email address`);
          }
          break;
        case 'phone':
          if (typeof value !== 'string' || !this.phoneRegex.test(value)) {
            errors.push(`${fieldPath} must be a valid phone number`);
          }
          break;
        case 'url':
          if (typeof value !== 'string' || !this.urlRegex.test(value)) {
            errors.push(`${fieldPath} must be a valid URL`);
          }
          break;
      }
    }
    
    // String-specific validations
    if (typeof value === 'string') {
      if (rule.minLength !== undefined && value.length < rule.minLength) {
        errors.push(`${fieldPath} must be at least ${rule.minLength} characters long`);
      }
      
      if (rule.maxLength !== undefined && value.length > rule.maxLength) {
        errors.push(`${fieldPath} must be no more than ${rule.maxLength} characters long`);
      }
      
      if (rule.pattern && !rule.pattern.test(value)) {
        errors.push(`${fieldPath} format is invalid`);
      }
    }
    
    // Number-specific validations
    if (typeof value === 'number') {
      if (rule.min !== undefined && value < rule.min) {
        errors.push(`${fieldPath} must be at least ${rule.min}`);
      }
      
      if (rule.max !== undefined && value > rule.max) {
        errors.push(`${fieldPath} must be no more than ${rule.max}`);
      }
    }
    
    // Enum validation
    if (rule.enum && !rule.enum.includes(value)) {
      errors.push(`${fieldPath} must be one of: ${rule.enum.join(', ')}`);
    }
    
    // Custom validation
    if (rule.custom) {
      const customResult = rule.custom(value);
      if (customResult !== true) {
        errors.push(typeof customResult === 'string' ? customResult : `${fieldPath} is invalid`);
      }
    }
    
    return errors;
  }
  
  private validateObject(obj: any, schema: ValidationSchema, basePath = ''): ValidationResult {
    const errors: { [field: string]: string[] } = {};
    
    // Validate each field in the schema
    for (const [field, rule] of Object.entries(schema)) {
      const fieldPath = basePath ? `${basePath}.${field}` : field;
      const value = obj?.[field];
      
      if (typeof rule === 'object' && !Array.isArray(rule) && !rule.type) {
        // Nested object validation
        const nestedResult = this.validateObject(value, rule as ValidationSchema, fieldPath);
        Object.assign(errors, nestedResult.errors);
      } else {
        // Field validation
        const fieldErrors = this.validateField(value, rule as ValidationRule, fieldPath);
        if (fieldErrors.length > 0) {
          errors[fieldPath] = fieldErrors;
        }
      }
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  }
  
  validate(data: any, schema: ValidationSchema): ValidationResult {
    return this.validateObject(data, schema);
  }
  
  // Pre-defined schemas for common use cases
  contactSchema: ValidationSchema = {
    firstName: { required: true, type: 'string', minLength: 1, maxLength: 50 },
    lastName: { required: true, type: 'string', minLength: 1, maxLength: 50 },
    email: { required: true, type: 'email' },
    phone: { type: 'phone' },
    title: { required: true, type: 'string', minLength: 1, maxLength: 100 },
    company: { required: true, type: 'string', minLength: 1, maxLength: 100 },
    industry: { type: 'string', maxLength: 50 },
    interestLevel: { 
      required: true, 
      type: 'string', 
      enum: ['hot', 'medium', 'low', 'cold'] 
    },
    status: { 
      required: true, 
      type: 'string', 
      enum: ['active', 'pending', 'inactive', 'lead', 'prospect', 'customer', 'churned'] 
    },
    notes: { type: 'string', maxLength: 1000 },
    tags: { type: 'array' },
    socialProfiles: {
      linkedin: { type: 'url' },
      twitter: { type: 'url' },
      website: { type: 'url' },
    },
  };
  
  aiAnalysisSchema: ValidationSchema = {
    contactId: { required: true, type: 'string' },
    score: { required: true, type: 'number', min: 0, max: 100 },
    insights: { required: true, type: 'array' },
    recommendations: { required: true, type: 'array' },
    confidence: { type: 'number', min: 0, max: 100 },
  };
  
  enrichmentRequestSchema: ValidationSchema = {
    email: { type: 'email' },
    firstName: { type: 'string', minLength: 1 },
    lastName: { type: 'string', minLength: 1 },
    company: { type: 'string', minLength: 1 },
    linkedinUrl: { type: 'url' },
  };
  
  // Utility methods
  validateContact(contact: any): ValidationResult {
    return this.validate(contact, this.contactSchema);
  }
  
  validateAIAnalysis(analysis: any): ValidationResult {
    return this.validate(analysis, this.aiAnalysisSchema);
  }
  
  validateEnrichmentRequest(request: any): ValidationResult {
    return this.validate(request, this.enrichmentRequestSchema);
  }
  
  // Sanitization methods
  sanitizeString(value: any): string {
    if (typeof value !== 'string') return '';
    return value.trim().replace(/[<>]/g, ''); // Basic XSS prevention
  }
  
  sanitizeEmail(email: any): string {
    return this.sanitizeString(email).toLowerCase();
  }
  
  sanitizePhone(phone: any): string {
    const cleaned = this.sanitizeString(phone).replace(/[^\d+]/g, '');
    return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
  }
  
  sanitizeContact(contact: any): any {
    return {
      ...contact,
      firstName: this.sanitizeString(contact.firstName),
      lastName: this.sanitizeString(contact.lastName),
      email: this.sanitizeEmail(contact.email),
      phone: contact.phone ? this.sanitizePhone(contact.phone) : undefined,
      title: this.sanitizeString(contact.title),
      company: this.sanitizeString(contact.company),
      industry: this.sanitizeString(contact.industry),
      notes: this.sanitizeString(contact.notes),
    };
  }
}

export const validationService = new ValidationService();