import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import commonSl from './locales/sl/common.json';
import authSl from './locales/sl/auth.json';
import dashboardSl from './locales/sl/dashboard.json';
import analyticsSl from './locales/sl/analytics.json';
import dreamEntrySl from './locales/sl/dreamEntry.json';
import pricingSl from './locales/sl/pricing.json';
import accountSl from './locales/sl/account.json';
import indexSl from './locales/sl/index.json';

import commonEn from './locales/en/common.json';
import authEn from './locales/en/auth.json';
import dashboardEn from './locales/en/dashboard.json';
import analyticsEn from './locales/en/analytics.json';
import dreamEntryEn from './locales/en/dreamEntry.json';
import pricingEn from './locales/en/pricing.json';
import accountEn from './locales/en/account.json';
import indexEn from './locales/en/index.json';

const resources = {
  sl: {
    common: commonSl,
    auth: authSl,
    dashboard: dashboardSl,
    analytics: analyticsSl,
    dreamEntry: dreamEntrySl,
    pricing: pricingSl,
    account: accountSl,
    index: indexSl,
  },
  en: {
    common: commonEn,
    auth: authEn,
    dashboard: dashboardEn,
    analytics: analyticsEn,
    dreamEntry: dreamEntryEn,
    pricing: pricingEn,
    account: accountEn,
    index: indexEn,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'sl',
    defaultNS: 'common',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

export default i18n;
