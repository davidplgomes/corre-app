import Constants from 'expo-constants';

/**
 * Application Configuration
 * All environment variables consolidated. No hardcoded values.
 * Services with missing keys are automatically disabled.
 */

const extra = Constants.expoConfig?.extra || {};

/** Check if a key is present and non-empty */
const hasKey = (key: string): boolean => {
  const value = extra[key];
  return typeof value === 'string' && value.trim().length > 0;
};

export const CONFIG = {
  /** Supabase configuration */
  supabase: {
    url: extra.EXPO_PUBLIC_SUPABASE_URL || '',
    anonKey: extra.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
    enabled: hasKey('EXPO_PUBLIC_SUPABASE_URL') && hasKey('EXPO_PUBLIC_SUPABASE_ANON_KEY'),
  },

  /** Stripe configuration */
  stripe: {
    publishableKey: extra.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
    enabled: hasKey('EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY'),
  },

  /** Google Analytics */
  googleAnalytics: {
    measurementId: extra.EXPO_PUBLIC_GOOGLE_ANALYTICS_KEY || '',
    enabled: hasKey('EXPO_PUBLIC_GOOGLE_ANALYTICS_KEY'),
  },

  /** PostHog analytics */
  posthog: {
    apiKey: extra.EXPO_PUBLIC_POSTHOG_API_KEY || '',
    host: extra.EXPO_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
    enabled: hasKey('EXPO_PUBLIC_POSTHOG_API_KEY'),
  },

  /** Chatwoot support */
  chatwoot: {
    websiteToken: extra.EXPO_PUBLIC_CHATWOOT_WEBSITE_TOKEN || '',
    baseUrl: extra.EXPO_PUBLIC_CHATWOOT_BASE_URL || '',
    enabled: hasKey('EXPO_PUBLIC_CHATWOOT_WEBSITE_TOKEN') && hasKey('EXPO_PUBLIC_CHATWOOT_BASE_URL'),
  },

  /** ConvertKit (Kit) marketing */
  convertKit: {
    apiKey: extra.EXPO_PUBLIC_CONVERTKIT_API_KEY || '',
    formId: extra.EXPO_PUBLIC_CONVERTKIT_FORM_ID || '',
    enabled: hasKey('EXPO_PUBLIC_CONVERTKIT_API_KEY'),
  },

  /** API settings */
  api: {
    timeout: parseInt(extra.EXPO_PUBLIC_API_TIMEOUT || '30000', 10),
  },

  /** Feature flags */
  features: {
    merchantMode: (extra.EXPO_PUBLIC_ENABLE_MERCHANT_MODE || 'true') === 'true',
  },

  /** Check-in settings */
  checkIn: {
    radiusMeters: parseInt(extra.EXPO_PUBLIC_CHECK_IN_RADIUS_METERS || '300', 10),
    timeWindowMinutes: parseInt(extra.EXPO_PUBLIC_CHECK_IN_TIME_WINDOW_MINUTES || '30', 10),
  },

  /** App metadata */
  app: {
    name: 'Corre App',
    version: extra.EXPO_PUBLIC_APP_VERSION || '1.0.0',
    environment: extra.EXPO_PUBLIC_APP_ENV || 'development',
  },
} as const;

export const isDevelopment = CONFIG.app.environment === 'development';
export const isProduction = CONFIG.app.environment === 'production';
