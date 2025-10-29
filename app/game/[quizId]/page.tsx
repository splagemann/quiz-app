import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

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
    <div className="min-h-screen bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-lg shadow-2xl p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 text-center">
            {quiz.title}
          </h1>
          {quiz.description && (
            <p className="text-gray-700 mb-6 text-center">{quiz.description}</p>
          )}
          <p className="text-gray-700 text-center mb-8">
            {quiz._count.questions} Fragen
          </p>

          <div className="space-y-4">
            <Link
              href={`/game/${quiz.id}/solo`}
              className="block bg-blue-600 text-white text-center px-8 py-4 rounded-lg hover:bg-blue-700 transition font-bold text-lg shadow-lg"
            >
              🎮 Einzelspieler
              <p className="text-sm font-normal mt-1 opacity-90">
                Spiele alleine und teste dein Wissen
              </p>
            </Link>

            <Link
              href={`/game/${quiz.id}/host`}
              className="block bg-green-600 text-white text-center px-8 py-4 rounded-lg hover:bg-green-700 transition font-bold text-lg shadow-lg"
            >
              👥 Mehrspieler (Spielleiter)
              <p className="text-sm font-normal mt-1 opacity-90">
                Starte ein Spiel für mehrere Spieler
              </p>
            </Link>
          </div>

          <div className="mt-8 text-center">
            <Link
              href="/game"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              ← Zurück zur Quiz-Auswahl
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
