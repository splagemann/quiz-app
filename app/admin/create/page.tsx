import { redirect } from "next/navigation";
import { getTranslations } from 'next-intl/server';
import Link from "next/link";
import { prisma } from "@/lib/prisma";

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
  const t = await getTranslations('admin');
  const tCommon = await getTranslations('common');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 transition-colors">
      <div className="max-w-2xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-8">{t('createNewQuiz')}</h1>

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
            <select
              id="language"
              name="language"
              defaultValue="en"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-gray-100 dark:bg-gray-700"
            >
              <option value="en">{t('languageEn')}</option>
              <option value="de">{t('languageDe')}</option>
            </select>
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              className="flex-1 bg-blue-600 dark:bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition font-medium"
            >
              {t('createQuiz')}
            </button>
            <Link
              href="/admin"
              className="flex-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 px-6 py-3 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition font-medium text-center"
            >
              {tCommon('cancel')}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
