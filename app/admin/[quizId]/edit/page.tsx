import { notFound, redirect } from "next/navigation";
import { getTranslations } from 'next-intl/server';
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import ContentManager from "./ContentManager";
import DeleteButton from "./DeleteButton";
import { AdminHeader } from "@/app/components/AdminHeader";
import { QuizLanguageSelector } from "@/app/components/QuizLanguageSelector";
import { isAuthenticated } from "@/lib/auth";
import AuthForm from "@/app/components/AuthForm";
import { AdminFooter } from "@/app/components/AdminFooter";
import { Card } from "@/app/components/Card";
import { Button } from "@/app/components/Button";
import { FormInput } from "@/app/components/FormInput";

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

  // Re-check authentication (defense in depth)
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    throw new Error("Unauthorized");
  }

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

  // Re-check authentication (defense in depth)
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    throw new Error("Unauthorized");
  }

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

  // Check authentication
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    return <AuthForm redirectTo={`/admin/${quizId}/edit`} />;
  }

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
      pages: {
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-4 md:py-8 transition-colors">
      <div className="max-w-4xl mx-auto px-3 md:px-4">
        <AdminHeader title={t('editQuiz')} showBackButton={true} backButtonHref="/admin" />

        {/* Quiz Details Form */}
        <Card variant="form" className="p-4 md:p-6 mb-6 md:mb-8">
          <h2 className="text-lg md:text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">{t('quizDetails')}</h2>
          <form id="quiz-form" action={updateQuizWithId}>
            <FormInput
              type="text"
              id="title"
              name="title"
              label={t('quizTitleRequired')}
              defaultValue={quiz.title}
              required
              className="mb-4"
            />

            <FormInput
              as="textarea"
              id="description"
              name="description"
              label={t('quizDescription')}
              defaultValue={quiz.description || ""}
              rows={4}
              className="mb-4"
            />

            <div className="mb-4">
              <label
                htmlFor="language"
                className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-2"
              >
                {t('language')}
              </label>
              <QuizLanguageSelector name="language" id="language" defaultValue={quiz.language} />
            </div>

          </form>

          <div className="flex flex-col sm:flex-row gap-3 md:gap-4 mt-4">
            <Button
              type="submit"
              form="quiz-form"
              variant="primary"
              size="lg"
              fullWidth
              className="flex-1"
            >
              {t('updateQuiz')}
            </Button>
            <form action={deleteQuizWithId} className="flex-1">
              <DeleteButton />
            </form>
          </div>
        </Card>

        {/* Content Manager */}
        <ContentManager quizId={quizIdNum} questions={quiz.questions} pages={quiz.pages} />

        <AdminFooter />
      </div>
    </div>
  );
}
