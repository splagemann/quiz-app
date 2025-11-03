import { redirect } from "next/navigation";
import { getTranslations } from 'next-intl/server';
import { prisma } from "@/lib/prisma";
import { AdminHeader } from "@/app/components/AdminHeader";
import { QuizLanguageSelector } from "@/app/components/QuizLanguageSelector";
import { BackButton } from "@/app/components/BackButton";
import { isAuthenticated } from "@/lib/auth";
import AuthForm from "@/app/components/AuthForm";
import { AdminFooter } from "@/app/components/AdminFooter";

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-4 md:py-8 transition-colors">
      <div className="max-w-4xl mx-auto px-3 md:px-4">
        <AdminHeader title={t('createNewQuiz')} showBackButton={true} backButtonHref="/admin" />

        <form action={createQuiz} className="bg-gray-200 dark:bg-gray-700 rounded-lg shadow dark:shadow-gray-700/50 p-4 md:p-6">
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
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-gray-100 dark:bg-gray-600 placeholder:text-gray-500 dark:placeholder:text-gray-400"
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
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-gray-100 dark:bg-gray-600 placeholder:text-gray-500 dark:placeholder:text-gray-400"
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

          <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
            <button
              type="submit"
              className="flex-1 bg-gray-800 dark:bg-gray-800 text-white px-6 py-3 rounded-lg hover:bg-blue-600 dark:hover:bg-blue-500 transition font-medium"
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
        <AdminFooter />
      </div>
    </div>
  );
}
