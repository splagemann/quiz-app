import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

async function createQuiz(formData: FormData) {
  "use server";

  const title = formData.get("title") as string;
  const description = formData.get("description") as string;

  if (!title) {
    return;
  }

  const quiz = await prisma.quiz.create({
    data: {
      title,
      description: description || null,
    },
  });

  redirect(`/admin/${quiz.id}/edit`);
}

export default function CreateQuizPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Neues Quiz erstellen</h1>

        <form action={createQuiz} className="bg-white rounded-lg shadow p-6">
          <div className="mb-6">
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              placeholder="z.B. JavaScript Grundlagen"
            />
          </div>

          <div className="mb-6">
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              placeholder="Kurze Beschreibung des Quiz..."
            />
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium"
            >
              Quiz erstellen
            </button>
            <a
              href="/admin"
              className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition font-medium text-center"
            >
              Abbrechen
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
