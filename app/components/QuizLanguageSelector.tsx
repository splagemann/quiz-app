'use client';

import { useState } from 'react';
import { type Locale } from '@/lib/i18nConfig';

const flagMap: Record<Locale, string> = {
  en: '🇬🇧',
  de: '🇩🇪',
};

const localeLabels: Record<Locale, string> = {
  en: 'English',
  de: 'Deutsch',
};

interface QuizLanguageSelectorProps {
  defaultValue?: string;
  name: string;
  id: string;
}

export function QuizLanguageSelector({ defaultValue = 'en', name, id }: QuizLanguageSelectorProps) {
  const [selectedLocale, setSelectedLocale] = useState<Locale>(defaultValue as Locale);
  const [isOpen, setIsOpen] = useState(false);

  const handleLocaleSelect = (locale: Locale) => {
    setSelectedLocale(locale);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <input type="hidden" name={name} id={id} value={selectedLocale} />
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{flagMap[selectedLocale]}</span>
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {localeLabels[selectedLocale]}
          </span>
        </div>
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
          <div className="absolute left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20">
            {(Object.keys(flagMap) as Locale[]).map((locale) => (
              <button
                key={locale}
                type="button"
                onClick={() => handleLocaleSelect(locale)}
                className={`
                  w-full flex items-center gap-3 px-4 py-2 text-left transition-colors
                  ${selectedLocale === locale
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100'
                  }
                  first:rounded-t-lg last:rounded-b-lg
                `}
              >
                <span className="text-lg">{flagMap[locale]}</span>
                <span className="text-sm font-medium">{localeLabels[locale]}</span>
                {selectedLocale === locale && (
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
