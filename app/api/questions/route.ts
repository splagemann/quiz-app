import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth";

export async function POST(request: NextRequest) {
  // Check authentication
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { quizId, title, questionText, description, imageUrl, answers, orderIndex } = body;

    const question = await prisma.question.create({
      data: {
        quizId,
        title,
        questionText,
        description,
        imageUrl,
        orderIndex,
        answers: {
          create: answers.map((answer: { text: string | null; imageUrl: string | null; isCorrect: boolean }, index: number) => ({
            answerText: answer.text,
            imageUrl: answer.imageUrl,
            isCorrect: answer.isCorrect,
            orderIndex: index,
          })),
        },
      },
      include: {
        answers: true,
      },
    });

    return NextResponse.json(question);
  } catch (error) {
    console.error("Error creating question:", error);
    return NextResponse.json(
      { error: "Failed to create question" },
      { status: 500 }
    );
  }
}
