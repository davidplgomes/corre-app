/**
 * One-time Token Migration
 *
 * Migrates auth tokens from AsyncStorage to SecureStore for existing users.
 * This ensures users don't need to re-login after the security update.
 *
 * The migration:
 * 1. Checks if migration has already run (stored flag in SecureStore)
 * 2. Finds all Supabase auth keys in AsyncStorage
 * 3. Copies them to SecureStore
 * 4. Removes them from AsyncStorage
 * 5. Marks migration as complete
 *
 * Only runs once per installation.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const MIGRATION_KEY = 'auth_tokens_migrated_v1';

const log = {
  info: (context: string, message: string, data?: any) => {
    console.log(`[${context}] ${message}`, data || '');
  },
  debug: (context: string, message: string) => {
    if (__DEV__) {
      console.log(`[${context}] ${message}`);
    }
  },
  error: (context: string, message: string, error: any) => {
    console.error(`[${context}] ${message}`, error);
  },
};

/**
 * Migrate auth tokens from AsyncStorage to SecureStore
 * Safe to call multiple times - will only run once
 */
export async function migrateAuthTokensToSecureStore(): Promise<void> {
  // Skip migration on web platform
  if (Platform.OS === 'web') {
    log.debug('STORAGE', 'Skipping token migration on web platform');
    return;
  }

  try {
    // Check if migration already completed
    const alreadyMigrated = await SecureStore.getItemAsync(MIGRATION_KEY);
    if (alreadyMigrated === 'true') {
      log.debug('STORAGE', 'Auth tokens already migrated to secure storage');
      return;
    }

    log.info('STORAGE', 'Starting auth token migration to secure storage');

    // Get all keys from AsyncStorage
    const allKeys = await AsyncStorage.getAllKeys();

    // Find Supabase auth-related keys
    // Supabase typically uses keys like: 'sb-[project-ref]-auth-token'
    const authKeys = allKeys.filter(
      (key) =>
        key.startsWith('sb-') || // Supabase keys
        key.includes('supabase') || // Generic supabase storage
        key.includes('auth-token') // Auth token keys
    );

    if (authKeys.length === 0) {
      log.info('STORAGE', 'No auth tokens found to migrate (new installation)');
      await SecureStore.setItemAsync(MIGRATION_KEY, 'true');
      return;
    }

    log.info('STORAGE', `Found ${authKeys.length} auth key(s) to migrate`);

    // Migrate each key
    let successCount = 0;
    for (const key of authKeys) {
      try {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          // Copy to SecureStore
          await SecureStore.setItemAsync(key, value);
          // Remove from AsyncStorage
          await AsyncStorage.removeItem(key);
          successCount++;
          log.debug('STORAGE', `Migrated key: ${key}`);
        }
      } catch (error) {
        log.error('STORAGE', `Failed to migrate key: ${key}`, error);
        // Continue with other keys even if one fails
      }
    }

    // Mark migration as complete
    await SecureStore.setItemAsync(MIGRATION_KEY, 'true');

    log.info('STORAGE', `Auth token migration completed: ${successCount}/${authKeys.length} keys migrated successfully`);
  } catch (error) {
    log.error('STORAGE', 'Failed to migrate auth tokens', error);
    // Don't throw - app should still work, just less secure for this session
    // User can still login and new tokens will be stored securely
  }
}
