/**
 * Password Reset Form Component
 * Handles password reset email requests and password updates
 */

import React, { useState } from 'react';
import { authService, PasswordResetOptions, PasswordUpdateOptions } from '../../services/auth.service';

interface PasswordResetFormProps {
  mode?: 'request' | 'update';
  onSuccess?: (message: string) => void;
  onError?: (error: string) => void;
  redirectTo?: string;
}

export default function PasswordResetForm({
  mode = 'request',
  onSuccess,
  onError,
  redirectTo
}: PasswordResetFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      const errorMsg = 'Please enter your email address';
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      setMessage('');

      const options: PasswordResetOptions = {
        email: email.trim(),
        ...(redirectTo && { redirectTo })
      };

      const response = await authService.sendPasswordResetEmail(options);

      if (response.success) {
        setMessage(response.message);
        onSuccess?.(response.message);
      } else {
        setError(response.message);
        onError?.(response.message);
      }
    } catch (err) {
      const errorMsg = 'An unexpected error occurred. Please try again.';
      setError(errorMsg);
      onError?.(errorMsg);
      console.error('Password reset error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password) {
      const errorMsg = 'Please enter a new password';
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    if (password.length < 6) {
      const errorMsg = 'Password must be at least 6 characters long';
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    if (confirmPassword && password !== confirmPassword) {
      const errorMsg = 'Passwords do not match';
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      setMessage('');

      const options: PasswordUpdateOptions = {
        password,
        confirmPassword
      };

      const response = await authService.updatePassword(options);

      if (response.success) {
        setMessage(response.message);
        onSuccess?.(response.message);
      } else {
        setError(response.message);
        onError?.(response.message);
      }
    } catch (err) {
      const errorMsg = 'An unexpected error occurred. Please try again.';
      setError(errorMsg);
      onError?.(errorMsg);
      console.error('Password update error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (mode === 'update') {
    return (
      <div className="password-reset-form">
        <h2>Update Your Password</h2>
        <p>Enter your new password below.</p>

        <form onSubmit={handleUpdatePassword}>
          <div className="form-group">
            <label htmlFor="password">New Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter new password"
              required
              minLength={6}
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              required
              minLength={6}
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn btn-primary"
          >
            {isLoading ? 'Updating...' : 'Update Password'}
          </button>
        </form>

        {message && <div className="success-message">{message}</div>}
        {error && <div className="error-message">{error}</div>}
      </div>
    );
  }

  return (
    <div className="password-reset-form">
      <h2>Reset Your Password</h2>
      <p>Enter your email address and we'll send you a link to reset your password.</p>

      <form onSubmit={handleRequestReset}>
        <div className="form-group">
          <label htmlFor="email">Email Address</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
            disabled={isLoading}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="btn btn-primary"
        >
          {isLoading ? 'Sending...' : 'Send Reset Link'}
        </button>
      </form>

      {message && <div className="success-message">{message}</div>}
      {error && <div className="error-message">{error}</div>}
    </div>
  );
}