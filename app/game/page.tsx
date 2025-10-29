import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function GamePage() {
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
    <div className="min-h-screen bg-gradient-to-br from-purple-500 to-blue-600 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-4xl font-bold text-white text-center mb-4">
          Quiz auswählen
        </h1>
        <p className="text-white text-center mb-12 text-lg">
          Wähle ein Quiz und teste dein Wissen!
        </p>

        {quizzes.length === 0 ? (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <p className="text-gray-800 text-lg mb-4">
              Noch keine Quiz verfügbar.
            </p>
            <Link
              href="/admin"
              className="text-blue-600 hover:text-blue-800 underline font-medium"
            >
              Erstelle eines im Admin-Bereich
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {quizzes.map((quiz) => (
              <Link
                key={quiz.id}
                href={`/game/${quiz.id}`}
                className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition transform hover:scale-105"
              >
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {quiz.title}
                </h2>
                {quiz.description && (
                  <p className="text-gray-700 mb-4 text-base">{quiz.description}</p>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 font-medium">
                    {quiz._count.questions} Fragen
                  </span>
                  <span className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium">
                    Spielen →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-12 text-center">
          <Link
            href="/host"
            className="text-white hover:text-gray-200 underline"
          >
            Zurück zur Startseite
          </Link>
        </div>
      </div>
    </div>
  );
}
