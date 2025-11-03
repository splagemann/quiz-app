'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { DarkModeToggle } from './DarkModeToggle';
import { LanguageSelector } from './LanguageSelector';

interface AdminHeaderProps {
  title: string;
  showBackButton?: boolean;
  backButtonHref?: string;
  children?: React.ReactNode;
}

export function AdminHeader({
  title,
  showBackButton = false,
  backButtonHref,
  children
}: AdminHeaderProps) {
  const router = useRouter();
  const t = useTranslations('common');

  const handleBack = () => {
    if (backButtonHref) {
      router.push(backButtonHref);
    } else {
      router.back();
    }
  };

  const hasButtonRow = showBackButton || children;

  return (
    <div className="mb-6 md:mb-8">
      {/* Header with title and controls */}
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <h1 className="text-xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 truncate">
          {title}
        </h1>
        <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
          <DarkModeToggle />
          <LanguageSelector />
        </div>
      </div>

      {/* Button row */}
      {hasButtonRow && (
        <div className="flex flex-col sm:flex-row gap-3">
          {showBackButton && (
            <button
              onClick={handleBack}
              className="flex items-center justify-center gap-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-200 px-6 h-10 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition w-full sm:w-auto"
              aria-label="Go back"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              <span className="font-medium">{t('back')}</span>
            </button>
          )}
          {children}
        </div>
      )}
    </div>
  );
}
