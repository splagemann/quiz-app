import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ questionId: string }> }
) {
  try {
    const { questionId } = await params;
    const body = await request.json();
    const { title, questionText, description, imageUrl, answers } = body;

    const question = await prisma.question.update({
      where: { id: parseInt(questionId) },
      data: {
        title,
        questionText,
        description,
        imageUrl,
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

    // First delete all player answers for this question
    await prisma.playerAnswer.deleteMany({
      where: { questionId: parseInt(questionId) },
    });

    // Then delete the question (answers will cascade)
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
