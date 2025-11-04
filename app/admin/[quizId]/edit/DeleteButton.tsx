"use client";

import { useTranslations } from 'next-intl';
import { useConfirm } from '@/app/components/ConfirmDialog';

export default function DeleteButton() {
  const t = useTranslations('admin');
  const tCommon = useTranslations('common');
  const confirm = useConfirm();

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    const confirmed = await confirm({
      title: t('deleteQuiz'),
      message: t('deleteConfirm'),
      confirmText: tCommon('delete'),
      cancelText: tCommon('cancel'),
      confirmColor: 'red',
    });

    if (confirmed) {
      // Submit the form
      const form = e.currentTarget.closest('form');
      if (form) {
        form.submit();
      }
    }
  };

  return (
    <button
      type="button"
      className="w-full bg-red-600 dark:bg-red-500 text-white px-6 py-3 rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition font-medium"
      onClick={handleClick}
    >
      {t('deleteQuiz')}
    </button>
  );
}
