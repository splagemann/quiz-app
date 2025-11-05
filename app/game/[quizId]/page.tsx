import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from 'next-intl/server';
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { Card } from "@/app/components/Card";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ quizId: string }>;
}): Promise<Metadata> {
  const { quizId } = await params;
  const quiz = await prisma.quiz.findUnique({
    where: { id: parseInt(quizId) },
    select: { title: true },
  });

  return {
    title: quiz ? `${quiz.title} - Quiz App` : "Quiz App",
  };
}

export default async function QuizModePage({
  params,
}: {
  params: Promise<{ quizId: string }>;
}) {
  const { quizId } = await params;
  const quizIdNum = parseInt(quizId);

  const t = await getTranslations('quiz');
  const tAdmin = await getTranslations('admin');

  if (isNaN(quizIdNum)) {
    notFound();
  }

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizIdNum },
    include: {
      _count: {
        select: { questions: true },
      },
    },
  });

  if (!quiz) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center px-3 py-4">
      <div className="max-w-md w-full">
        <Card variant="gradient" className="p-4">
          <h1 className="text-xl font-bold text-gray-900 mb-2 text-center">
            {quiz.title}
          </h1>
          {quiz.description && (
            <p className="text-gray-700 mb-3 text-center text-sm">{quiz.description}</p>
          )}
          <p className="text-gray-700 text-center mb-3 text-sm">
            {quiz._count.questions} {tAdmin('questions')}
          </p>

          <div className="space-y-3">
            <Link
              href={`/game/${quiz.id}/solo`}
              className="block bg-blue-600 text-white text-center px-4 py-3 rounded-lg font-bold text-lg hover:bg-blue-700 transition"
            >
              🎮 {t('playSolo')}
              <p className="text-xs font-normal mt-1 opacity-90">
                {t('playSoloDescription')}
              </p>
            </Link>

            <Link
              href={`/game/${quiz.id}/host`}
              className="block bg-green-600 text-white text-center px-4 py-3 rounded-lg font-bold text-lg hover:bg-green-700 transition"
            >
              👥 {t('hostMultiplayer')}
              <p className="text-xs font-normal mt-1 opacity-90">
                {t('hostMultiplayerDescription')}
              </p>
            </Link>
          </div>
        </Card>

        <div className="mt-4 text-center">
          <Link
            href="/games"
            className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition"
          >
            ← {t('backToQuizSelection')}
          </Link>
        </div>
      </div>
    </div>
  );
}
