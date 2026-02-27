const path = require('path');
const dotenv = require('dotenv');
const appPackage = require('./package.json');

// Explicitly load from root .env
const rootEnvPath = path.resolve(__dirname, '../../.env');
const result = dotenv.config({ path: rootEnvPath });

if (result.error) {
  console.log('Failed to load .env from:', rootEnvPath);
  // Fallback to default loading (current dir)
  dotenv.config();
} else {
  console.log('Successfully loaded .env from:', rootEnvPath);
}

console.log('Environment Debug - EXPO_PUBLIC_SUPABASE_URL:', process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL ? 'FOUND' : 'MISSING');

const appVersion =
  process.env.EXPO_PUBLIC_APP_VERSION ||
  process.env.APP_VERSION ||
  appPackage.version ||
  '1.0.0';

module.exports = {
  expo: {
    name: 'Corre App',
    slug: 'corre-app',
    scheme: 'corre',
    version: appVersion,
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
    splash: {
      resizeMode: 'cover',
      backgroundColor: '#000000'
    },
    assetBundlePatterns: [
      '**/*'
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.correapp.mobile',
      splash: {
        backgroundColor: '#000000'
      },
      infoPlist: {
        NSCameraUsageDescription: 'This app needs camera access to scan QR codes for loyalty verification.',
        NSLocationWhenInUseUsageDescription: 'This app needs your location to verify check-ins at events.',
        NSPhotoLibraryUsageDescription: 'This app needs photo library access so you can choose profile and listing images.'
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#000000'
      },
      package: 'com.correapp.mobile',
      permissions: [
        'ACCESS_FINE_LOCATION',
        'ACCESS_COARSE_LOCATION',
        'CAMERA'
      ],
      blockedPermissions: [
        'android.permission.SYSTEM_ALERT_WINDOW',
        'android.permission.WRITE_EXTERNAL_STORAGE',
        'android.permission.RECORD_AUDIO'
      ],
      config: {
        googleMaps: {
          apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || ''
        }
      }
    },
    web: {
      favicon: './assets/favicon.png'
    },
    updates: {
      url: 'https://u.expo.dev/64b3844f-ce00-402b-976b-8e4d8f36714e'
    },
    runtimeVersion: appVersion,
    extra: {
      EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
      EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY,
      EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || process.env.STRIPE_PUBLISHABLE_KEY,
      EXPO_PUBLIC_GOOGLE_ANALYTICS_KEY: process.env.EXPO_PUBLIC_GOOGLE_ANALYTICS_KEY || process.env.GOOGLE_ANALYTICS_KEY,
      EXPO_PUBLIC_POSTHOG_API_KEY: process.env.EXPO_PUBLIC_POSTHOG_API_KEY || process.env.POSTHOG_API_KEY,
      EXPO_PUBLIC_POSTHOG_HOST: process.env.EXPO_PUBLIC_POSTHOG_HOST || process.env.POSTHOG_HOST,
      EXPO_PUBLIC_CHATWOOT_WEBSITE_TOKEN: process.env.EXPO_PUBLIC_CHATWOOT_WEBSITE_TOKEN || process.env.CHATWOOT_WEBSITE_TOKEN,
      EXPO_PUBLIC_CHATWOOT_BASE_URL: process.env.EXPO_PUBLIC_CHATWOOT_BASE_URL || process.env.CHATWOOT_BASE_URL,
      EXPO_PUBLIC_CONVERTKIT_API_KEY: process.env.EXPO_PUBLIC_CONVERTKIT_API_KEY || process.env.CONVERTKIT_API_KEY,
      EXPO_PUBLIC_CONVERTKIT_FORM_ID: process.env.EXPO_PUBLIC_CONVERTKIT_FORM_ID || process.env.CONVERTKIT_FORM_ID,
      EXPO_PUBLIC_APP_ENV: process.env.EXPO_PUBLIC_APP_ENV || process.env.APP_ENV || 'development',
      EXPO_PUBLIC_APP_VERSION: appVersion,
      EXPO_PUBLIC_API_TIMEOUT: process.env.EXPO_PUBLIC_API_TIMEOUT || process.env.API_TIMEOUT || '30000',
      EXPO_PUBLIC_ENABLE_MERCHANT_MODE: process.env.EXPO_PUBLIC_ENABLE_MERCHANT_MODE || process.env.ENABLE_MERCHANT_MODE || 'true',
      EXPO_PUBLIC_CHECK_IN_RADIUS_METERS: process.env.EXPO_PUBLIC_CHECK_IN_RADIUS_METERS || process.env.CHECK_IN_RADIUS_METERS || '300',
      EXPO_PUBLIC_CHECK_IN_TIME_WINDOW_MINUTES: process.env.EXPO_PUBLIC_CHECK_IN_TIME_WINDOW_MINUTES || process.env.CHECK_IN_TIME_WINDOW_MINUTES || '30',
      EXPO_PUBLIC_OPENWEATHER_API_KEY: process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY,
      eas: {
        projectId: '64b3844f-ce00-402b-976b-8e4d8f36714e'
      }
    },
    plugins: [
      [
        'expo-location',
        {
          locationAlwaysAndWhenInUsePermission: 'Allow Corre App to use your location for event check-ins.'
        }
      ],
      [
        '@stripe/stripe-react-native',
        {
          merchantIdentifier: 'merchant.com.corre',
          enableGooglePay: true
        }
      ],
      'expo-web-browser',
      [
        'expo-notifications',
        {
          icon: './assets/notification-icon.png',
          color: '#FF8800'
        }
      ],
      './plugins/withModularHeaders'
    ]
  }
};
