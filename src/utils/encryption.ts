import CryptoJS from 'crypto-js';

/**
 * Simple encryption key - in production, this should be derived from user credentials
 * or stored securely (e.g., in environment variables)
 */
const ENCRYPTION_KEY = 'contacts-encryption-key-v1';

/**
 * Service for encrypting and decrypting sensitive data stored in localStorage
 * Uses AES encryption to protect contact data from unauthorized access
 */
export class EncryptionService {
  private static instance: EncryptionService;

  static getInstance(): EncryptionService {
    if (!EncryptionService.instance) {
      EncryptionService.instance = new EncryptionService();
    }
    return EncryptionService.instance;
  }

  /**
   * Encrypts data using AES encryption
   * @param data - The data to encrypt (will be JSON stringified)
   * @returns Base64 encoded encrypted string
   * @throws Error if encryption fails
   */
  encrypt(data: any): string {
    try {
      const jsonString = JSON.stringify(data);
      return CryptoJS.AES.encrypt(jsonString, ENCRYPTION_KEY).toString();
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypts data using AES decryption
   * @param encryptedData - Base64 encoded encrypted string
   * @returns Decrypted and parsed data
   * @throws Error if decryption fails or data is corrupted
   */
  decrypt(encryptedData: string): any {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
      const decryptedString = bytes.toString(CryptoJS.enc.Utf8);

      if (!decryptedString) {
        throw new Error('Decryption failed - invalid data');
      }

      return JSON.parse(decryptedString);
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Safely encrypts data to localStorage
   * @param key - localStorage key
   * @param data - Data to encrypt and store
   * @throws Error if encryption or storage fails
   */
  setEncryptedItem(key: string, data: any): void {
    try {
      const encrypted = this.encrypt(data);
      localStorage.setItem(key, encrypted);
    } catch (error) {
      console.error('Failed to store encrypted data:', error);
      throw error;
    }
  }

  /**
   * Safely decrypts data from localStorage
   * @param key - localStorage key
   * @returns Decrypted data or null if key doesn't exist
   * @throws Error if decryption fails (corrupted data is automatically removed)
   */
  getDecryptedItem(key: string): any | null {
    try {
      const encrypted = localStorage.getItem(key);
      if (!encrypted) {
        return null;
      }
      return this.decrypt(encrypted);
    } catch (error) {
      console.error('Failed to retrieve decrypted data:', error);
      // If decryption fails, remove the corrupted data
      localStorage.removeItem(key);
      return null;
    }
  }

  /**
   * Removes encrypted item from localStorage
   * @param key - localStorage key to remove
   */
  removeEncryptedItem(key: string): void {
    localStorage.removeItem(key);
  }
}

export const encryptionService = EncryptionService.getInstance();