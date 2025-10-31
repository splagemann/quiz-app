import { redirect } from "next/navigation";
import { getTranslations } from 'next-intl/server';
import { prisma } from "@/lib/prisma";
import { LanguageSelector } from "@/app/components/LanguageSelector";
import { DarkModeToggle } from "@/app/components/DarkModeToggle";
import { QuizLanguageSelector } from "@/app/components/QuizLanguageSelector";
import { BackButton } from "@/app/components/BackButton";
import { isAuthenticated } from "@/lib/auth";
import AuthForm from "@/app/components/AuthForm";

async function createQuiz(formData: FormData) {
  "use server";

  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const language = (formData.get("language") as string) || "en";

  if (!title) {
    return;
  }

  const quiz = await prisma.quiz.create({
    data: {
      title,
      description: description || null,
      language,
    },
  });

  redirect(`/admin/${quiz.id}/edit`);
}

export const dynamic = 'force-dynamic';

export default async function CreateQuizPage() {
  // Check authentication
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    return <AuthForm redirectTo="/admin/create" />;
  }

  const t = await getTranslations('admin');
  const tCommon = await getTranslations('common');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 transition-colors">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <BackButton
              className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-5 h-5 text-gray-700 dark:text-gray-200"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
            </BackButton>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{t('createNewQuiz')}</h1>
          </div>
          <div className="flex items-center gap-4">
            <DarkModeToggle />
            <LanguageSelector />
          </div>
        </div>

        <form action={createQuiz} className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-700/50 p-6">
          <div className="mb-6">
            <label
              htmlFor="title"
              className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-2"
            >
              {t('quizTitleRequired')}
            </label>
            <input
              type="text"
              id="title"
              name="title"
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-gray-100 dark:bg-gray-700 placeholder:text-gray-500 dark:placeholder:text-gray-400"
              placeholder={t('quizTitlePlaceholder')}
            />
          </div>

          <div className="mb-6">
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-2"
            >
              {t('quizDescription')}
            </label>
            <textarea
              id="description"
              name="description"
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-gray-100 dark:bg-gray-700 placeholder:text-gray-500 dark:placeholder:text-gray-400"
              placeholder={t('quizDescriptionPlaceholder')}
            />
          </div>

          <div className="mb-6">
            <label
              htmlFor="language"
              className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-2"
            >
              {t('language')}
            </label>
            <QuizLanguageSelector name="language" id="language" defaultValue="en" />
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              className="flex-1 bg-blue-600 dark:bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition font-medium"
            >
              {t('createQuiz')}
            </button>
            <BackButton
              className="flex-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 px-6 py-3 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition font-medium text-center"
            >
              {tCommon('cancel')}
            </BackButton>
          </div>
        </form>
      </div>
    </div>
  );
}
