// Shared i18n configuration (safe for client and server)
export const locales = ['en', 'de'] as const;
export type Locale = typeof locales[number];

// Get default locale from environment variable or fallback to 'en'
function getDefaultLocale(): Locale {
  const envLocale = process.env.DEFAULT_LANG;
  if (envLocale && locales.includes(envLocale as Locale)) {
    return envLocale as Locale;
  }
  return 'en';
}

export const defaultLocale: Locale = getDefaultLocale();

export const localeNames: Record<Locale, string> = {
  en: 'English',
  de: 'Deutsch',
};
