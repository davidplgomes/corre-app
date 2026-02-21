const path = require('path');
const dotenv = require('dotenv');

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


module.exports = {
  expo: {
    name: 'Corre App',
    slug: 'corre-app',
    version: '1.0.2',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#000000'
    },
    assetBundlePatterns: [
      '**/*'
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.correapp.mobile',
      infoPlist: {
        NSCameraUsageDescription: 'This app needs camera access to scan QR codes for loyalty verification.',
        NSLocationWhenInUseUsageDescription: 'This app needs your location to verify check-ins at events.'
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
      ]
    },
    web: {
      favicon: './assets/favicon.png'
    },
    updates: {
      url: 'https://u.expo.dev/64b3844f-ce00-402b-976b-8e4d8f36714e'
    },
    runtimeVersion: '1.0.2',
    extra: {
      EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
      EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY,
      EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || process.env.STRIPE_PUBLISHABLE_KEY,
      EXPO_PUBLIC_APP_ENV: process.env.EXPO_PUBLIC_APP_ENV || process.env.APP_ENV || 'development',
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
      ]
    ]
  }
};