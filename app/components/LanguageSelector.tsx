'use client';

import { useLocale } from 'next-intl';
import { useState, useTransition } from 'react';
import { setLocaleAction } from '@/lib/i18nClient';
import { type Locale } from '@/lib/i18nConfig';

const flagMap: Record<Locale, string> = {
  en: '🇬🇧',
  de: '🇩🇪',
};

const localeLabels: Record<Locale, string> = {
  en: 'English',
  de: 'Deutsch',
};

export function LanguageSelector() {
  const currentLocale = useLocale() as Locale;
  const [isPending, startTransition] = useTransition();
  const [isChanging, setIsChanging] = useState(false);

  const handleLocaleChange = (newLocale: Locale) => {
    if (newLocale === currentLocale || isChanging) return;

    setIsChanging(true);
    startTransition(async () => {
      try {
        await setLocaleAction(newLocale);
      } catch (error) {
        console.error('Failed to change language:', error);
        setIsChanging(false);
      }
    });
  };

  return (
    <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-md p-0.5">
      {(Object.keys(flagMap) as Locale[]).map((locale) => (
        <button
          key={locale}
          onClick={() => handleLocaleChange(locale)}
          disabled={isPending || isChanging}
          title={localeLabels[locale]}
          className={`
            px-2 py-1 rounded text-lg transition-all
            ${currentLocale === locale
              ? 'bg-white shadow-sm'
              : 'opacity-50 hover:opacity-100'
            }
            disabled:opacity-30 disabled:cursor-not-allowed
          `}
        >
          {flagMap[locale]}
        </button>
      ))}
    </div>
  );
}
