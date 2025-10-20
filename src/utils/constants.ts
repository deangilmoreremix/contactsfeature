// AI Score color mapping constants
export const AI_SCORE_COLORS = {
  EXCELLENT: 'bg-green-500',
  GOOD: 'bg-blue-500',
  FAIR: 'bg-yellow-500',
  POOR: 'bg-red-500'
} as const;

export const AI_SCORE_THRESHOLDS = {
  EXCELLENT: 80,
  GOOD: 60,
  FAIR: 40,
  POOR: 0
} as const;

// Interest level constants
export const INTEREST_LEVELS = {
  HOT: 'hot',
  MEDIUM: 'medium',
  LOW: 'low',
  COLD: 'cold'
} as const;

export const INTEREST_COLORS = {
  [INTEREST_LEVELS.HOT]: 'bg-red-500',
  [INTEREST_LEVELS.MEDIUM]: 'bg-yellow-500',
  [INTEREST_LEVELS.LOW]: 'bg-blue-500',
  [INTEREST_LEVELS.COLD]: 'bg-gray-400'
} as const;

export const INTEREST_LABELS = {
  [INTEREST_LEVELS.HOT]: 'Hot Client',
  [INTEREST_LEVELS.MEDIUM]: 'Medium Interest',
  [INTEREST_LEVELS.LOW]: 'Low Interest',
  [INTEREST_LEVELS.COLD]: 'Non Interest'
} as const;

// Source color mapping
export const SOURCE_COLORS: { [key: string]: string } = {
  'LinkedIn': 'bg-blue-600',
  'Facebook': 'bg-blue-500',
  'Email': 'bg-green-500',
  'Website': 'bg-purple-500',
  'Referral': 'bg-orange-500',
  'Typeform': 'bg-pink-500',
  'Cold Call': 'bg-gray-600'
};

// File upload constants
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'text/plain',
  'image/jpeg',
  'image/png',
  'image/gif'
];

// Error messages
export const ERROR_MESSAGES = {
  AI_ANALYSIS_FAILED: 'AI analysis failed. Please check your internet connection and try again.',
  EMAIL_SEND_FAILED: 'Failed to send email. Please try again.',
  FILE_UPLOAD_FAILED: 'File upload failed. Please try again.',
  INVALID_FILE_TYPE: 'Invalid file type. Please select a supported file format.',
  FILE_TOO_LARGE: 'File is too large. Maximum size is 10MB.',
  NO_EMAIL_ADDRESS: 'Contact does not have an email address',
  NO_PHONE_NUMBER: 'Contact does not have a phone number',
  CLIPBOARD_NOT_SUPPORTED: 'Clipboard not supported in this browser',
  GENERIC_ERROR: 'An unexpected error occurred. Please try again.'
} as const;

// Loading messages
export const LOADING_MESSAGES = {
  ANALYZING_CONTACT: 'AI is analyzing contact data and generating insights...',
  GENERATING_INSIGHTS: 'Generating AI insights...',
  SENDING_EMAIL: 'Sending email...',
  UPLOADING_FILE: 'Uploading file...',
  PROCESSING_REQUEST: 'Processing your request...'
} as const;