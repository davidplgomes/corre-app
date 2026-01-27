require('dotenv').config();

console.log('Loading env vars - SUPABASE_URL:', process.env.SUPABASE_URL ? 'Found' : 'Missing');

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
    runtimeVersion: {
      policy: 'appVersion'
    },
    extra: {
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
      APP_ENV: process.env.APP_ENV || 'development',
      API_TIMEOUT: process.env.API_TIMEOUT || '30000',
      ENABLE_MERCHANT_MODE: process.env.ENABLE_MERCHANT_MODE || 'true',
      CHECK_IN_RADIUS_METERS: process.env.CHECK_IN_RADIUS_METERS || '300',
      CHECK_IN_TIME_WINDOW_MINUTES: process.env.CHECK_IN_TIME_WINDOW_MINUTES || '30',
      openWeatherApiKey: process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY,
      eas: {
        projectId: '64b3844f-ce00-402b-976b-8e4d8f36714e'
      }
    },
    plugins: [
      [
        'expo-barcode-scanner',
        {
          cameraPermission: 'Allow Corre App to access your camera to scan QR codes.'
        }
      ],
      [
        'expo-location',
        {
          locationAlwaysAndWhenInUsePermission: 'Allow Corre App to use your location for event check-ins.'
        }
      ]
    ]
  }
};