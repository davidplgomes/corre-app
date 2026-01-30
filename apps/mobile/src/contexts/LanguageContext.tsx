import React, { createContext, useContext, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { changeLanguage as changeI18nLanguage, getCurrentLanguage } from '@services/i18n';
import { supabase } from '@services/supabase/client';
import { useAuth } from './AuthContext';

type Language = 'en' | 'pt' | 'es';

interface LanguageContextType {
  currentLanguage: Language;
  changeLanguage: (lang: Language) => Promise<void>;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const [currentLanguage, setCurrentLanguage] = useState<Language>(getCurrentLanguage());

  useEffect(() => {
    // Sync with user's language preference from profile
    if (profile && profile.languagePreference !== currentLanguage) {
      changeLanguage(profile.languagePreference);
    }
  }, [profile]);

  const changeLanguage = async (lang: Language) => {
    try {
      // Update i18n
      await changeI18nLanguage(lang);
      setCurrentLanguage(lang);

      // Update user preference in Supabase if logged in
      if (user) {
        const { error } = await supabase
          .from('users')
          .update({ language_preference: lang })
          .eq('id', user.id);

        if (error) {
          console.error('Error updating language preference:', error);
        }
      }
    } catch (error) {
      console.error('Error changing language:', error);
      throw error;
    }
  };

  return (
    <LanguageContext.Provider value={{ currentLanguage, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
