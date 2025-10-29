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
    title: quiz ? `${quiz.title} - Mehrspieler Host - Quiz App` : "Quiz App",
  };
}

export default function HostLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
