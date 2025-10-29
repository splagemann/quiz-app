import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import QuizPlayer from "./QuizPlayer";

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
