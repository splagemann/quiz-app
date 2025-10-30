import { notFound, redirect } from "next/navigation";
import { getTranslations } from 'next-intl/server';
import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import QuestionManager from "./QuestionManager";
import DeleteButton from "./DeleteButton";
import { LanguageSelector } from "@/app/components/LanguageSelector";
import { DarkModeToggle } from "@/app/components/DarkModeToggle";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ quizId: string }>;
}): Promise<Metadata> {
  const { quizId } = await params;
  const t = await getTranslations('metadata');
  const quiz = await prisma.quiz.findUnique({
    where: { id: parseInt(quizId) },
    select: { title: true },
  });

  return {
    title: quiz ? `${quiz.title} ${t('editQuiz')} - Quiz App` : "Quiz App",
  };
}

async function updateQuiz(quizId: number, formData: FormData) {
  "use server";

  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const language = (formData.get("language") as string) || "en";

  if (!title) {
    return;
  }

  await prisma.quiz.update({
    where: { id: quizId },
    data: {
      title,
      description: description || null,
      language,
    },
  });

  redirect(`/admin`);
}

async function deleteQuiz(quizId: number) {
  "use server";

  await prisma.quiz.delete({
    where: { id: quizId },
  });

  redirect("/admin");
}

export default async function EditQuizPage({
  params,
}: {
  params: Promise<{ quizId: string }>;
}) {
  const { quizId } = await params;
  const quizIdNum = parseInt(quizId);

  const t = await getTranslations('admin');
  const tCommon = await getTranslations('common');

  if (isNaN(quizIdNum)) {
    notFound();
  }

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizIdNum },
    include: {
      questions: {
        include: {
          answers: {
            orderBy: { orderIndex: "asc" },
          },
        },
        orderBy: { orderIndex: "asc" },
      },
    },
  });

  if (!quiz) {
    notFound();
  }

  const updateQuizWithId = updateQuiz.bind(null, quizIdNum);
  const deleteQuizWithId = deleteQuiz.bind(null, quizIdNum);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 transition-colors">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              aria-label={t('backToManagement')}
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
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{t('editQuiz')}</h1>
          </div>
          <div className="flex items-center gap-4">
            <DarkModeToggle />
            <LanguageSelector />
          </div>
        </div>

        {/* Quiz Details Form */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-700/50 p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">{t('quizDetails')}</h2>
          <form action={updateQuizWithId}>
            <div className="mb-4">
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
                defaultValue={quiz.title}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-gray-100 dark:bg-gray-700 placeholder:text-gray-500 dark:placeholder:text-gray-400"
              />
            </div>

            <div className="mb-4">
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
                defaultValue={quiz.description || ""}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-gray-100 dark:bg-gray-700 placeholder:text-gray-500 dark:placeholder:text-gray-400"
              />
            </div>

            <div className="mb-4">
              <label
                htmlFor="language"
                className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-2"
              >
                {t('language')}
              </label>
              <select
                id="language"
                name="language"
                defaultValue={quiz.language}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-gray-100 dark:bg-gray-700"
              >
                <option value="en">{t('languageEn')}</option>
                <option value="de">{t('languageDe')}</option>
              </select>
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                className="bg-blue-600 dark:bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition"
              >
                {t('updateQuiz')}
              </button>
            </div>
          </form>

          <form action={deleteQuizWithId} className="mt-4">
            <DeleteButton />
          </form>
        </div>

        {/* Question Manager */}
        <QuestionManager quizId={quizIdNum} questions={quiz.questions} />
      </div>
    </div>
  );
}
