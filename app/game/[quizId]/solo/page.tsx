import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import QuizPlayer from "./QuizPlayer";

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
    title: quiz ? `${quiz.title} - Einzelspieler - Quiz App` : "Quiz App",
  };
}

export default async function PlayQuizPage({
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

  if (!quiz || quiz.questions.length === 0) {
    notFound();
  }

  return <QuizPlayer quiz={quiz} />;
}
