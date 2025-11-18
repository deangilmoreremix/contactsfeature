/**
 * Clipboard utilities for copying text with fallback support
 */

export interface ClipboardResult {
  success: boolean;
  error?: string;
}

/**
 * Copies text to clipboard with modern API and fallback support
 */
export const copyToClipboard = async (text: string): Promise<ClipboardResult> => {
  try {
    await navigator.clipboard.writeText(text);
    console.log('Text copied to clipboard successfully');
    return { success: true };
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    // Fallback for older browsers or restricted contexts
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      // Use modern execCommand as fallback
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);

      if (successful) {
        console.log('Text copied to clipboard (fallback method)');
        return { success: true };
      } else {
        throw new Error('Fallback copy method failed');
      }
    } catch (fallbackError) {
      console.error('All copy methods failed:', fallbackError);
      return {
        success: false,
        error: 'Unable to copy to clipboard. Please copy manually.'
      };
    }
  }
};

/**
 * Copies email content to clipboard in a formatted way
 */
export const copyEmailToClipboard = async (
  subject: string,
  body: string
): Promise<ClipboardResult> => {
  const emailText = `Subject: ${subject}\n\n${body}`;
  return copyToClipboard(emailText);
};

/**
 * Copies questions to clipboard with proper formatting
 */
export const copyQuestionsToClipboard = async (
  questions: string[]
): Promise<ClipboardResult> => {
  const formattedQuestions = questions.join('\n\n');
  return copyToClipboard(formattedQuestions);
};