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
  const [isOpen, setIsOpen] = useState(false);

  const handleLocaleChange = (newLocale: Locale) => {
    if (newLocale === currentLocale || isChanging) return;

    setIsChanging(true);
    setIsOpen(false);
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
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isPending || isChanging}
        className="flex items-center gap-2 px-3 h-10 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label="Select language"
      >
        <span className="text-lg">{flagMap[currentLocale]}</span>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
          {localeLabels[currentLocale]}
        </span>
        <svg
          className={`w-4 h-4 text-gray-700 dark:text-gray-200 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20">
            {(Object.keys(flagMap) as Locale[]).map((locale) => (
              <button
                key={locale}
                onClick={() => handleLocaleChange(locale)}
                disabled={isPending || isChanging}
                className={`
                  w-full flex items-center gap-3 px-4 py-2 text-left transition-colors
                  ${currentLocale === locale
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100'
                  }
                  first:rounded-t-lg last:rounded-b-lg
                  disabled:opacity-30 disabled:cursor-not-allowed
                `}
              >
                <span className="text-lg">{flagMap[locale]}</span>
                <span className="text-sm font-medium">{localeLabels[locale]}</span>
                {currentLocale === locale && (
                  <svg
                    className="w-4 h-4 ml-auto"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
