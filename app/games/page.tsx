import Link from "next/link";
import { getTranslations } from 'next-intl/server';
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export default async function GamesPage() {
  const t = await getTranslations('quiz');
  const tAdmin = await getTranslations('admin');

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
    <div className="min-h-screen bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center px-3 py-4">
      <div className="max-w-md w-full">
        <h1 className="text-2xl font-bold text-white text-center mb-4">
          {t('selectQuiz')}
        </h1>

        {quizzes.length === 0 ? (
          <div className="bg-white rounded-lg shadow-2xl p-4 text-center">
            <p className="text-gray-800 text-sm mb-3">
              {t('noQuizzesMessage')}
            </p>
            <Link
              href="/admin"
              className="text-blue-600 hover:text-blue-800 underline font-medium text-sm"
            >
              {t('createInAdmin')}
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {quizzes.map((quiz) => (
              <Link
                key={quiz.id}
                href={`/game/${quiz.id}`}
                className="block bg-white rounded-lg shadow-2xl p-4 hover:shadow-xl transition"
              >
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  {quiz.title}
                </h2>
                {quiz.description && (
                  <p className="text-gray-700 mb-3 text-sm">{quiz.description}</p>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 font-medium">
                    {quiz._count.questions} {tAdmin('questions')}
                  </span>
                  <span className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium">
                    {t('playButton')} →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-4 text-center">
          <Link
            href="/"
            className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg font-medium"
          >
            ← {t('backToHome')}
          </Link>
        </div>
      </div>
    </div>
  );
}
