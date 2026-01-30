import Constants from 'expo-constants';

// Get environment variables from Expo Constants
const extra = Constants.expoConfig?.extra || {};

console.log('Config loading - extra:', {
  hasSupabaseUrl: !!extra.SUPABASE_URL,
  supabaseUrl: extra.SUPABASE_URL,
  hasSupabaseKey: !!extra.SUPABASE_ANON_KEY
});

export const CONFIG = {
  supabase: {
    url: extra.SUPABASE_URL || '',
    anonKey: extra.SUPABASE_ANON_KEY || '',
  },
  api: {
    timeout: parseInt(extra.API_TIMEOUT || '30000', 10),
  },
  features: {
    merchantMode: (extra.ENABLE_MERCHANT_MODE || 'true') === 'true',
  },
  checkIn: {
    radiusMeters: parseInt(extra.CHECK_IN_RADIUS_METERS || '300', 10),
    timeWindowMinutes: parseInt(extra.CHECK_IN_TIME_WINDOW_MINUTES || '30', 10),
  },
  app: {
    name: 'Corre App',
    version: '1.0.0',
    environment: extra.APP_ENV || 'development',
  },
} as const;

export const isDevelopment = CONFIG.app.environment === 'development';
export const isProduction = CONFIG.app.environment === 'production';
