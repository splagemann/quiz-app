'use client';

import { useTranslations as useNextIntlTranslations } from 'next-intl';

// Re-export useTranslations for easier imports
export { useTranslations } from 'next-intl';
export { useLocale } from 'next-intl';

// Helper function to get nested translation keys
export function useT() {
  return useNextIntlTranslations();
}

// Action to set locale (client-side)
export async function setLocaleAction(locale: 'en' | 'de') {
  const response = await fetch('/api/locale', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ locale }),
  });

  if (!response.ok) {
    throw new Error('Failed to set locale');
  }

  // Reload the page to apply new locale
  window.location.reload();
}
