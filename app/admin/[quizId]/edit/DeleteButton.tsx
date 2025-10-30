"use client";

import { useTranslations } from 'next-intl';

export default function DeleteButton() {
  const t = useTranslations('admin');

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!confirm(t('deleteConfirm'))) {
      e.preventDefault();
    }
  };

  return (
    <button
      type="submit"
      className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition"
      onClick={handleClick}
    >
      {t('deleteQuiz')}
    </button>
  );
}
