/**
 * Date utility functions for consistent date formatting and parsing
 */

/**
 * Formats an ISO date string to a human-readable format
 * Handles both ISO format and legacy "at" format for backward compatibility
 */
export const formatLastConnected = (dateString: string | undefined): string => {
  if (!dateString) return 'Never';

  try {
    // Handle legacy format: "2024-01-15 at 2:30 pm"
    if (dateString.includes(' at ')) {
      return dateString; // Return as-is for backward compatibility
    }

    // Handle ISO format: "2024-01-15T14:30:00Z"
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }

    // Format as: "Jan 15, 2024 at 2:30 pm"
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).replace(',', ' at');
  } catch (error) {
    console.warn('Error formatting date:', dateString, error);
    return 'Invalid date';
  }
};

/**
 * Converts various date formats to ISO string
 */
export const normalizeDateToISO = (dateInput: string | Date | undefined): string | undefined => {
  if (!dateInput) return undefined;

  try {
    if (typeof dateInput === 'string') {
      // Handle legacy format: "2024-01-15 at 2:30 pm"
      if (dateInput.includes(' at ')) {
        const parts = dateInput.split(' at ');
        if (parts.length !== 2) return undefined;

        const datePart = parts[0];
        const timePart = parts[1];
        if (!datePart || !timePart) return undefined;

        const dateParts = datePart.split('-').map(Number);
        const timeParts = timePart.split(' ');

        if (dateParts.length !== 3 || timeParts.length !== 2) return undefined;
        if (dateParts.some(isNaN) || dateParts.includes(0)) return undefined;

        const month = dateParts[0];
        const day = dateParts[1];
        const year = dateParts[2];
        const time = timeParts[0];
        const period = timeParts[1];

        if (!time || !period || typeof month !== 'number' || typeof day !== 'number' || typeof year !== 'number') {
          return undefined;
        }

        const timeComponents = time.split(':').map(Number);
        if (timeComponents.length !== 2 || timeComponents.some(isNaN)) return undefined;

        const hours = timeComponents[0];
        const minutes = timeComponents[1];

        if (typeof hours !== 'number' || typeof minutes !== 'number') return undefined;

        let hour24 = hours;
        if (period.toLowerCase() === 'pm' && hours !== 12) {
          hour24 = hours + 12;
        } else if (period.toLowerCase() === 'am' && hours === 12) {
          hour24 = 0;
        }

        const date = new Date(year, month - 1, day, hour24, minutes);
        return isNaN(date.getTime()) ? undefined : date.toISOString();
      }

      // Already ISO format
      const date = new Date(dateInput);
      return isNaN(date.getTime()) ? undefined : date.toISOString();
    }

    // Date object
    return dateInput.toISOString();
  } catch (error) {
    console.warn('Error normalizing date:', dateInput, error);
    return undefined;
  }
};

/**
 * Checks if a date string is in ISO format
 */
export const isISODate = (dateString: string): boolean => {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/.test(dateString);
};

/**
 * Gets relative time string (e.g., "2 hours ago", "3 days ago")
 */
export const getRelativeTime = (dateString: string | undefined): string => {
  if (!dateString) return 'Never';

  try {
    const date = new Date(isISODate(dateString) ? dateString : normalizeDateToISO(dateString) || dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    return formatLastConnected(dateString);
  } catch (error) {
    console.warn('Error calculating relative time:', dateString, error);
    return 'Unknown';
  }
};