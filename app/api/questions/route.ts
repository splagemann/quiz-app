import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { quizId, questionText, answers, orderIndex } = body;

    const question = await prisma.question.create({
      data: {
        quizId,
        questionText,
        orderIndex,
        answers: {
          create: answers.map((answer: { text: string; isCorrect: boolean }, index: number) => ({
            answerText: answer.text,
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
