"use client";

import { useTranslations } from 'next-intl';
import { useConfirm } from '@/app/components/ConfirmDialog';
import { Button } from '@/app/components/Button';

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
    <Button
      type="button"
      variant="danger"
      size="lg"
      fullWidth
      onClick={handleClick}
    >
      {t('deleteQuiz')}
    </Button>
  );
}
