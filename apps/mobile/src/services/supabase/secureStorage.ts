/**
 * Secure Storage Adapter for Supabase Auth
 * Uses expo-secure-store on native platforms (iOS/Android)
 * Falls back to AsyncStorage on web platform
 *
 * This provides encrypted storage for auth tokens on mobile devices,
 * preventing other apps from reading sensitive authentication data.
 */
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const IS_WEB = Platform.OS === 'web';

// Logger import - using console for now to avoid circular dependencies
const log = {
  error: (context: string, message: string, error?: any) => {
    console.error(`[${context}] ${message}`, error);
  },
  debug: (context: string, message: string) => {
    if (__DEV__) {
      console.log(`[${context}] ${message}`);
    }
  },
};

/**
 * Secure storage adapter that implements the Supabase storage interface
 * Uses platform-appropriate secure storage mechanism
 */
export const secureStorage = {
  /**
   * Retrieve an item from secure storage
   * @param key Storage key
   * @returns Stored value or null if not found
   */
  async getItem(key: string): Promise<string | null> {
    try {
      if (IS_WEB) {
        // Web: Use AsyncStorage (localStorage wrapper)
        return await AsyncStorage.getItem(key);
      }
      // Native: Use SecureStore (Keychain on iOS, EncryptedSharedPreferences on Android)
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      log.error('STORAGE', `Failed to get item: ${key}`, error);
      return null;
    }
  },

  /**
   * Store an item in secure storage
   * @param key Storage key
   * @param value Value to store
   */
  async setItem(key: string, value: string): Promise<void> {
    try {
      if (IS_WEB) {
        await AsyncStorage.setItem(key, value);
      } else {
        await SecureStore.setItemAsync(key, value);
      }
      log.debug('STORAGE', `Stored item: ${key}`);
    } catch (error) {
      log.error('STORAGE', `Failed to set item: ${key}`, error);
      throw error;
    }
  },

  /**
   * Remove an item from secure storage
   * @param key Storage key
   */
  async removeItem(key: string): Promise<void> {
    try {
      if (IS_WEB) {
        await AsyncStorage.removeItem(key);
      } else {
        await SecureStore.deleteItemAsync(key);
      }
      log.debug('STORAGE', `Removed item: ${key}`);
    } catch (error) {
      log.error('STORAGE', `Failed to remove item: ${key}`, error);
      throw error;
    }
  },
};
