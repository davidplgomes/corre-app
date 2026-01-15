import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Translation resources - will be replaced with actual JSON files later
const resources = {
  en: {
    translation: {
      common: {
        loading: 'Loading...',
        error: 'Error',
        success: 'Success',
        cancel: 'Cancel',
        save: 'Save',
        delete: 'Delete',
        edit: 'Edit',
        create: 'Create',
        back: 'Back',
      },
    },
  },
  pt: {
    translation: {
      common: {
        loading: 'Carregando...',
        error: 'Erro',
        success: 'Sucesso',
        cancel: 'Cancelar',
        save: 'Salvar',
        delete: 'Excluir',
        edit: 'Editar',
        create: 'Criar',
        back: 'Voltar',
      },
    },
  },
  es: {
    translation: {
      common: {
        loading: 'Cargando...',
        error: 'Error',
        success: 'Éxito',
        cancel: 'Cancelar',
        save: 'Guardar',
        delete: 'Eliminar',
        edit: 'Editar',
        create: 'Crear',
        back: 'Atrás',
      },
    },
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
