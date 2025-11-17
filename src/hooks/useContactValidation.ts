import { useCallback } from 'react';
import { Contact } from '../types';
import { validateContactData } from '../utils/validation';

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

interface UseContactValidationResult {
  validateContact: (contact: Contact) => ValidationResult;
  isValidForAI: (contact: Contact) => boolean;
}

export const useContactValidation = (): UseContactValidationResult => {
  const validateContact = useCallback((contact: Contact): ValidationResult => {
    return validateContactData(contact);
  }, []);

  const isValidForAI = useCallback((contact: Contact): boolean => {
    const validation = validateContactData(contact);
    return validation.isValid;
  }, []);

  return {
    validateContact,
    isValidForAI
  };
};