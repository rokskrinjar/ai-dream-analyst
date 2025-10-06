import * as React from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

interface LanguageContextType {
  language: string;
  setLanguage: (lang: string) => Promise<void>;
  isLoading: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const [language, setLanguageState] = useState<string>('en');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUserLanguage = async () => {
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('preferred_language')
          .eq('user_id', user.id)
          .single();

        if (profile?.preferred_language) {
          setLanguageState(profile.preferred_language);
          await i18n.changeLanguage(profile.preferred_language);
        }
      }
      setIsLoading(false);
    };

    loadUserLanguage();
  }, [user, i18n]);

  const setLanguage = async (lang: string) => {
    setLanguageState(lang);
    await i18n.changeLanguage(lang);

    if (user) {
      await supabase
        .from('profiles')
        .update({ preferred_language: lang })
        .eq('user_id', user.id);
    }
  };

  const value = {
    language,
    setLanguage,
    isLoading,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};
