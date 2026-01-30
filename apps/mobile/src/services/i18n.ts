import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from '../locales/en.json';
import pt from '../locales/pt.json';
import es from '../locales/es.json';

// Translation resources
const resources = {
  en: {
    translation: en,
  },
  pt: {
    translation: pt,
  },
  es: {
    translation: es,
  },
};

const LANGUAGE_KEY = '@corre_app:language';

export const initI18n = async () => {
  try {
    const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
    const locales = Localization.getLocales();
    const deviceLanguage = locales[0]?.languageCode || 'en';
    const supportedLanguages = ['en', 'pt', 'es'];
    const defaultLanguage = supportedLanguages.includes(deviceLanguage)
      ? deviceLanguage
      : 'en';

    await i18n.use(initReactI18next).init({
      compatibilityJSON: 'v3',
      resources,
      lng: savedLanguage || defaultLanguage,
      fallbackLng: 'en',
      interpolation: {
        escapeValue: false,
      },
      react: {
        useSuspense: false,
      },
    });

    return i18n;
  } catch (error) {
    console.error('Error initializing i18n:', error);
    throw error;
  }
};

export const changeLanguage = async (lang: 'en' | 'pt' | 'es') => {
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, lang);
    await i18n.changeLanguage(lang);
  } catch (error) {
    console.error('Error changing language:', error);
    throw error;
  }
};

export const getCurrentLanguage = (): 'en' | 'pt' | 'es' => {
  return i18n.language as 'en' | 'pt' | 'es';
};

export default i18n;

// Auto-initialize i18n when this module is imported
initI18n().catch(console.error);
