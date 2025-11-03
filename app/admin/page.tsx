import Link from "next/link";
import { getTranslations } from 'next-intl/server';
import { getLocale } from 'next-intl/server';
import { prisma } from "@/lib/prisma";
import { AdminHeader } from "@/app/components/AdminHeader";
import { isAuthenticated } from "@/lib/auth";
import AuthForm from "@/app/components/AuthForm";
import { AdminFooter } from "@/app/components/AdminFooter";

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  // Check authentication
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    return <AuthForm redirectTo="/admin" />;
  }

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-4 md:py-8 transition-colors">
      <div className="max-w-4xl mx-auto px-3 md:px-4">
        <AdminHeader title={t('quizManagement')}>
          <Link
            href="/admin/create"
            className="flex items-center justify-center bg-blue-500 dark:bg-blue-400 text-white px-6 h-10 rounded-lg hover:bg-blue-600 dark:hover:bg-blue-500 transition w-full sm:w-auto sm:inline-flex"
          >
            {t('createNewQuiz')}
          </Link>
          <Link
            href="/admin/sessions"
            className="flex items-center justify-center bg-purple-500 dark:bg-purple-400 text-white px-6 h-10 rounded-lg hover:bg-purple-600 dark:hover:bg-purple-500 transition w-full sm:w-auto sm:inline-flex"
          >
            {t('viewSessions')}
          </Link>
        </AdminHeader>

        {quizzes.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-700/50 p-6 md:p-8 text-center">
            <p className="text-gray-700 dark:text-gray-300 text-base md:text-lg">{t('noQuizzesMessage')}</p>
          </div>
        ) : (
          <div className="grid gap-3 md:gap-4">
            {quizzes.map((quiz) => (
              <div
                key={quiz.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-700/50 p-4 md:p-6 hover:shadow-md dark:hover:shadow-gray-700/70 transition"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                  <div className="flex-1 min-w-0 w-full sm:w-auto">
                    <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2 break-words">
                      {quiz.title}
                    </h2>
                    {quiz.description && (
                      <p className="text-sm md:text-base text-gray-700 dark:text-gray-300 mb-3 break-words">{quiz.description}</p>
                    )}
                    <div className="flex flex-wrap gap-3 md:gap-4 text-xs md:text-sm text-gray-700 dark:text-gray-400 font-medium">
                      <span>{quiz._count.questions} {t('questions')}</span>
                      <span>
                        {t('createdAt')} {new Date(quiz.createdAt).toLocaleDateString(locale)}
                      </span>
                    </div>
                  </div>
                  <Link
                    href={`/admin/${quiz.id}/edit`}
                    className="bg-gray-800 dark:bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-900 dark:hover:bg-gray-600 transition text-center w-full sm:w-auto sm:ml-4 flex-shrink-0"
                  >
                    {tCommon('edit')}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        <AdminFooter />
      </div>
    </div>
  );
}
