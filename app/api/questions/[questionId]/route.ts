import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ questionId: string }> }
) {
  try {
    const { questionId } = await params;
    const body = await request.json();
    const { questionText, answers } = body;

    const question = await prisma.question.update({
      where: { id: parseInt(questionId) },
      data: {
        questionText,
        answers: {
          updateMany: answers.map((answer: { id: number; text: string; isCorrect: boolean }) => ({
            where: { id: answer.id },
            data: {
              answerText: answer.text,
              isCorrect: answer.isCorrect,
            },
          })),
        },
      },
      include: {
        answers: true,
      },
    });

    return NextResponse.json(question);
  } catch (error) {
    console.error("Error updating question:", error);
    return NextResponse.json(
      { error: "Failed to update question" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ questionId: string }> }
) {
  try {
    const { questionId } = await params;

    await prisma.question.delete({
      where: { id: parseInt(questionId) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting question:", error);
    return NextResponse.json(
      { error: "Failed to delete question" },
      { status: 500 }
    );
  }
}
