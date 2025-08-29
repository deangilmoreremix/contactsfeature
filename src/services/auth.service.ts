/**
 * Authentication Service
 * Handles user authentication, password reset, and session management
 */

import { createClient } from '@supabase/supabase-js';
import { logger } from './logger.service';

// Initialize Supabase client
const supabaseUrl = import.meta.env['VITE_SUPABASE_URL'];
const supabaseAnonKey = import.meta.env['VITE_SUPABASE_ANON_KEY'];

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase configuration missing. Please check your environment variables.');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface PasswordResetOptions {
  email: string;
  redirectTo?: string;
}

export interface PasswordUpdateOptions {
  password: string;
  confirmPassword?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  error?: string;
}

class AuthService {
  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(options: PasswordResetOptions): Promise<AuthResponse> {
    try {
      const { email, redirectTo } = options;

      if (!email) {
        return {
          success: false,
          message: 'Email is required',
          error: 'MISSING_EMAIL'
        };
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return {
          success: false,
          message: 'Please enter a valid email address',
          error: 'INVALID_EMAIL_FORMAT'
        };
      }

      logger.info(`Sending password reset email to: ${email}`);

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectTo || `${window.location.origin}/reset-password`,
      });

      if (error) {
        logger.error('Password reset email failed', error);

        // Handle specific error cases
        if (error.message.includes('rate limit')) {
          return {
            success: false,
            message: 'Too many requests. Please try again later.',
            error: 'RATE_LIMIT_EXCEEDED'
          };
        }

        if (error.message.includes('not found')) {
          return {
            success: false,
            message: 'If an account with this email exists, you will receive a reset link.',
            error: 'USER_NOT_FOUND'
          };
        }

        return {
          success: false,
          message: 'Failed to send password reset email. Please try again.',
          error: error.message
        };
      }

      logger.info(`Password reset email sent successfully to: ${email}`);

      return {
        success: true,
        message: 'Password reset email sent successfully. Please check your inbox.'
      };

    } catch (error) {
      logger.error('Unexpected error during password reset', error as Error);

      return {
        success: false,
        message: 'An unexpected error occurred. Please try again.',
        error: 'UNEXPECTED_ERROR'
      };
    }
  }

  /**
   * Update password with reset token
   */
  async updatePassword(options: PasswordUpdateOptions): Promise<AuthResponse> {
    try {
      const { password, confirmPassword } = options;

      if (!password) {
        return {
          success: false,
          message: 'Password is required',
          error: 'MISSING_PASSWORD'
        };
      }

      if (password.length < 6) {
        return {
          success: false,
          message: 'Password must be at least 6 characters long',
          error: 'PASSWORD_TOO_SHORT'
        };
      }

      if (confirmPassword && password !== confirmPassword) {
        return {
          success: false,
          message: 'Passwords do not match',
          error: 'PASSWORDS_DO_NOT_MATCH'
        };
      }

      logger.info('Updating password');

      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        logger.error('Password update failed', error);

        if (error.message.includes('session')) {
          return {
            success: false,
            message: 'Invalid or expired reset link. Please request a new one.',
            error: 'INVALID_SESSION'
          };
        }

        return {
          success: false,
          message: 'Failed to update password. Please try again.',
          error: error.message
        };
      }

      logger.info('Password updated successfully');

      return {
        success: true,
        message: 'Password updated successfully. You can now sign in with your new password.'
      };

    } catch (error) {
      logger.error('Unexpected error during password update', error as Error);

      return {
        success: false,
        message: 'An unexpected error occurred. Please try again.',
        error: 'UNEXPECTED_ERROR'
      };
    }
  }

  /**
   * Sign in with email and password
   */
  async signIn(email: string, password: string): Promise<AuthResponse> {
    try {
      if (!email || !password) {
        return {
          success: false,
          message: 'Email and password are required',
          error: 'MISSING_CREDENTIALS'
        };
      }

      logger.info(`Signing in user: ${email}`);

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        logger.error('Sign in failed', error);

        if (error.message.includes('Invalid login credentials')) {
          return {
            success: false,
            message: 'Invalid email or password',
            error: 'INVALID_CREDENTIALS'
          };
        }

        return {
          success: false,
          message: 'Failed to sign in. Please try again.',
          error: error.message
        };
      }

      logger.info(`User signed in successfully: ${email}`);

      return {
        success: true,
        message: 'Signed in successfully'
      };

    } catch (error) {
      logger.error('Unexpected error during sign in', error as Error);

      return {
        success: false,
        message: 'An unexpected error occurred. Please try again.',
        error: 'UNEXPECTED_ERROR'
      };
    }
  }

  /**
   * Sign out current user
   */
  async signOut(): Promise<AuthResponse> {
    try {
      logger.info('Signing out user');

      const { error } = await supabase.auth.signOut();

      if (error) {
        logger.error('Sign out failed', error);

        return {
          success: false,
          message: 'Failed to sign out. Please try again.',
          error: error.message
        };
      }

      logger.info('User signed out successfully');

      return {
        success: true,
        message: 'Signed out successfully'
      };

    } catch (error) {
      logger.error('Unexpected error during sign out', error as Error);

      return {
        success: false,
        message: 'An unexpected error occurred. Please try again.',
        error: 'UNEXPECTED_ERROR'
      };
    }
  }

  /**
   * Get current session
   */
  async getCurrentSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        logger.error('Failed to get current session', error);
        return null;
      }

      return session;
    } catch (error) {
      logger.error('Unexpected error getting session', error as Error);
      return null;
    }
  }

  /**
   * Get current user
   */
  async getCurrentUser() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error) {
        logger.error('Failed to get current user', error);
        return null;
      }

      return user;
    } catch (error) {
      logger.error('Unexpected error getting user', error as Error);
      return null;
    }
  }

  /**
   * Listen to auth state changes
   */
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }
}

export const authService = new AuthService();