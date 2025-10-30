import Link from "next/link";
import { getTranslations } from 'next-intl/server';
import { getLocale } from 'next-intl/server';
import { prisma } from "@/lib/prisma";
import { LanguageSelector } from "@/app/components/LanguageSelector";
import { DarkModeToggle } from "@/app/components/DarkModeToggle";

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const t = await getTranslations('admin');
  const tCommon = await getTranslations('common');
  const locale = await getLocale();

  const quizzes = await prisma.quiz.findMany({
    include: {
      _count: {
        select: { questions: true },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 transition-colors">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{t('quizManagement')}</h1>
          <div className="flex items-center gap-4">
            <DarkModeToggle />
            <LanguageSelector />
            <Link
              href="/admin/create"
              className="flex items-center bg-blue-600 dark:bg-blue-500 text-white px-6 h-10 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition"
            >
              {t('createNewQuiz')}
            </Link>
          </div>
        </div>

        {quizzes.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-700/50 p-8 text-center">
            <p className="text-gray-700 dark:text-gray-300 text-lg">{t('noQuizzesMessage')}</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {quizzes.map((quiz) => (
              <div
                key={quiz.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-700/50 p-6 hover:shadow-md dark:hover:shadow-gray-700/70 transition"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      {quiz.title}
                    </h2>
                    {quiz.description && (
                      <p className="text-gray-700 dark:text-gray-300 mb-3">{quiz.description}</p>
                    )}
                    <div className="flex gap-4 text-sm text-gray-700 dark:text-gray-400 font-medium">
                      <span>{quiz._count.questions} {t('questions')}</span>
                      <span>
                        {t('createdAt')} {new Date(quiz.createdAt).toLocaleDateString(locale)}
                      </span>
                    </div>
                  </div>
                  <Link
                    href={`/admin/${quiz.id}/edit`}
                    className="ml-4 bg-gray-800 dark:bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-900 dark:hover:bg-gray-600 transition"
                  >
                    {tCommon('edit')}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 text-center">
          <Link
            href="/host"
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline"
          >
            {t('backToHome')}
          </Link>
        </div>
      </div>
    </div>
  );
}
