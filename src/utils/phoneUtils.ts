/**
 * Phone number validation and formatting utilities
 */

/**
 * Validates if a string is a valid phone number
 */
export const isValidPhoneNumber = (phone: string | undefined): boolean => {
  if (!phone || typeof phone !== 'string') return false;

  // Remove all non-digit characters
  const digitsOnly = phone.replace(/\D/g, '');

  // Check for valid length (7-15 digits for international numbers)
  if (digitsOnly.length < 7 || digitsOnly.length > 15) return false;

  // Basic pattern check (must contain at least 7 digits)
  const phoneRegex = /^[\+]?[\d\s\-\(\)\.]{7,}$/;
  return phoneRegex.test(phone.trim());
};

/**
 * Formats a phone number into a standardized international format
 */
export const formatPhoneNumber = (phone: string | undefined): string => {
  if (!phone || !isValidPhoneNumber(phone)) return phone || '';

  // Remove all non-digit characters
  let digitsOnly = phone.replace(/\D/g, '');

  // Handle international numbers
  if (digitsOnly.startsWith('1') && digitsOnly.length === 11) {
    // US/Canada number
    return `+1 (${digitsOnly.slice(1, 4)}) ${digitsOnly.slice(4, 7)}-${digitsOnly.slice(7)}`;
  } else if (digitsOnly.length === 10) {
    // Assume US number without country code
    return `(${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6)}`;
  } else if (digitsOnly.length > 10) {
    // International number
    const countryCode = digitsOnly.slice(0, digitsOnly.length - 10);
    const nationalNumber = digitsOnly.slice(-10);
    return `+${countryCode} (${nationalNumber.slice(0, 3)}) ${nationalNumber.slice(3, 6)}-${nationalNumber.slice(6)}`;
  }

  // Fallback: return as-is if we can't format it
  return phone;
};

/**
 * Normalizes phone number for storage (removes formatting)
 */
export const normalizePhoneNumber = (phone: string | undefined): string => {
  if (!phone) return '';

  // Remove all non-digit characters except +
  return phone.replace(/[^\d+]/g, '');
};

/**
 * Gets phone number display text with validation status
 */
export const getPhoneDisplayText = (phone: string | undefined): { text: string; isValid: boolean } => {
  if (!phone) return { text: 'No phone number', isValid: false };

  const isValid = isValidPhoneNumber(phone);
  const formatted = isValid ? formatPhoneNumber(phone) : phone;

  return {
    text: formatted,
    isValid
  };
};