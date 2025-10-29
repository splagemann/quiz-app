import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import QuestionManager from "./QuestionManager";
import DeleteButton from "./DeleteButton";

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
    title: quiz ? `${quiz.title} bearbeiten - Quiz App` : "Quiz App",
  };
}

async function updateQuiz(quizId: number, formData: FormData) {
  "use server";

  const title = formData.get("title") as string;
  const description = formData.get("description") as string;

  if (!title) {
    return;
  }

  await prisma.quiz.update({
    where: { id: quizId },
    data: {
      title,
      description: description || null,
    },
  });

  redirect(`/admin/${quizId}/edit`);
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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Quiz bearbeiten</h1>

        {/* Quiz Details Form */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Quiz-Details</h2>
          <form action={updateQuizWithId}>
            <div className="mb-4">
              <label
                htmlFor="title"
                className="block text-sm font-medium text-gray-800 mb-2"
              >
                Quiz-Titel *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                required
                defaultValue={quiz.title}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder:text-gray-500"
              />
            </div>

            <div className="mb-4">
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-800 mb-2"
              >
                Beschreibung
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                defaultValue={quiz.description || ""}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder:text-gray-500"
              />
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                Quiz aktualisieren
              </button>
              <a
                href="/admin"
                className="bg-gray-800 text-white px-6 py-2 rounded-lg hover:bg-gray-900 transition"
              >
                Zurück zur Verwaltung
              </a>
            </div>
          </form>

          <form action={deleteQuizWithId} className="mt-6 pt-6 border-t">
            <DeleteButton />
          </form>
        </div>

        {/* Question Manager */}
        <QuestionManager quizId={quizIdNum} questions={quiz.questions} />
      </div>
    </div>
  );
}
