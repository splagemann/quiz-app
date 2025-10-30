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

    const questionIdNum = parseInt(questionId);

    // Get existing answers
    const existingAnswers = await prisma.answer.findMany({
      where: { questionId: questionIdNum },
    });

    // Separate new answers (negative IDs) from existing ones
    const newAnswers = answers.filter((a: { id: number }) => a.id < 0);
    const updatedAnswers = answers.filter((a: { id: number }) => a.id > 0);
    const updatedAnswerIds = updatedAnswers.map((a: { id: number }) => a.id);

    // Delete answers that are not in the updated list
    const answersToDelete = existingAnswers.filter(
      (a) => !updatedAnswerIds.includes(a.id)
    );

    for (const answer of answersToDelete) {
      // Delete player answers first
      await prisma.playerAnswer.deleteMany({
        where: { answerId: answer.id },
      });
      // Then delete the answer
      await prisma.answer.delete({
        where: { id: answer.id },
      });
    }

    // Update existing answers
    for (const answer of updatedAnswers) {
      await prisma.answer.update({
        where: { id: answer.id },
        data: {
          answerText: answer.text,
          imageUrl: answer.imageUrl,
          isCorrect: answer.isCorrect,
        },
      });
    }

    // Create new answers
    for (let i = 0; i < newAnswers.length; i++) {
      const answer = newAnswers[i];
      await prisma.answer.create({
        data: {
          questionId: questionIdNum,
          answerText: answer.text,
          imageUrl: answer.imageUrl,
          isCorrect: answer.isCorrect,
          orderIndex: existingAnswers.length + i,
        },
      });
    }

    // Update the question itself
    const question = await prisma.question.update({
      where: { id: questionIdNum },
      data: {
        title,
        questionText,
        description,
        imageUrl,
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
