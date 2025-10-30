'use client';

import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';

export type QuizLocale = 'en' | 'de';

interface QuizIntlProviderProps {
  locale: QuizLocale;
  messages: any;
  children: ReactNode;
}

/**
 * IntlProvider wrapper for quiz components that need to use the quiz's language
 * instead of the global app language.
 */
export function QuizIntlProvider({ locale, messages, children }: QuizIntlProviderProps) {
  return (
    <NextIntlClientProvider
      messages={messages}
      locale={locale}
      timeZone="UTC"
    >
      {children}
    </NextIntlClientProvider>
  );
}
