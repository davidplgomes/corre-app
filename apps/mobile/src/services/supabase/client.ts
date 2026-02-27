import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { secureStorage } from './secureStorage';
import { CONFIG } from '@constants/config';

const supabaseUrl = CONFIG.supabase.url;
const supabaseAnonKey = CONFIG.supabase.anonKey;

if (__DEV__) {
  console.log('[Supabase] Client config loaded', {
    hasUrl: !!supabaseUrl,
    hasAnonKey: !!supabaseAnonKey,
  });
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: secureStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Export types
export type { Session, User } from '@supabase/supabase-js';

declare const __DEV__: boolean;
