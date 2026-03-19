import { ALLOWED_FILE_TYPES, MAX_FILE_SIZE, ERROR_MESSAGES } from './constants';

// Email validation
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Phone validation (basic)
export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
};

// Sanitize string input
export const sanitizeString = (input: string): string => {
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .trim();
};

// Validate file upload
export const validateFile = (file: File): { isValid: boolean; error?: string } => {
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return { isValid: false, error: ERROR_MESSAGES.INVALID_FILE_TYPE };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { isValid: false, error: ERROR_MESSAGES.FILE_TOO_LARGE };
  }

  return { isValid: true };
};

// Sanitize filename for security
export const sanitizeFilename = (filename: string): string => {
  return filename
    .replace(/[^a-zA-Z0-9.\-_]/g, '_') // Replace special chars with underscore
    .substring(0, 100); // Limit length
};

const SAFE_TAGS = new Set([
  'p', 'br', 'b', 'i', 'em', 'strong', 'u', 'a', 'ul', 'ol', 'li',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'div', 'blockquote',
  'pre', 'code', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
]);

const SAFE_ATTRIBUTES: Record<string, Set<string>> = {
  a: new Set(['href', 'title', 'target', 'rel']),
  span: new Set(['class']),
  div: new Set(['class']),
  td: new Set(['colspan', 'rowspan']),
  th: new Set(['colspan', 'rowspan']),
};

export const sanitizeHtml = (html: string): string => {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const clean = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    const el = node as Element;
    const tag = el.tagName.toLowerCase();
    if (!SAFE_TAGS.has(tag)) {
      return Array.from(el.childNodes).map(clean).join('');
    }
    const allowed = SAFE_ATTRIBUTES[tag] ?? new Set<string>();
    const attrs = Array.from(el.attributes)
      .filter((a) => allowed.has(a.name))
      .filter((a) => {
        if (a.name === 'href') {
          const v = a.value.trim().toLowerCase();
          return v.startsWith('http://') || v.startsWith('https://') || v.startsWith('mailto:');
        }
        return true;
      })
      .map((a) => ` ${a.name}="${a.value.replace(/"/g, '&quot;')}"`)
      .join('');
    const children = Array.from(el.childNodes).map(clean).join('');
    return `<${tag}${attrs}>${children}</${tag}>`;
  };
  return Array.from(doc.body.childNodes).map(clean).join('');
};

// URL encoding for external links
export const encodeForUrl = (value: string): string => {
  return encodeURIComponent(value);
};

// Validate contact data
export const validateContactData = (contact: any): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!contact.name || contact.name.trim().length === 0) {
    errors.push('Contact name is required');
  }

  if (contact.email && !isValidEmail(contact.email)) {
    errors.push('Invalid email format');
  }

  if (contact.phone && !isValidPhone(contact.phone)) {
    errors.push('Invalid phone number format');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Safe clipboard write with fallback
export const safeClipboardWrite = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      const success = document.execCommand('copy');
      document.body.removeChild(textArea);
      return success;
    }
  } catch (error) {
    console.error('Clipboard write failed:', error);
    return false;
  }
};