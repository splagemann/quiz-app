import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { gameStateManager } from "@/lib/gameState";

/**
 * POST /api/game/session/[sessionId]/reveal
 * Manually reveal the answer even if not all players have answered
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;

  try {
    // Get session with current question
    const session = await prisma.gameSession.findUnique({
      where: { id: sessionId },
      include: {
        quiz: {
          include: {
            questions: {
              include: {
                answers: true,
              },
              orderBy: { orderIndex: "asc" },
            },
          },
        },
        players: true,
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Session nicht gefunden" },
        { status: 404 }
      );
    }

    if (session.status !== "in_progress") {
      return NextResponse.json(
        { error: "Spiel ist nicht aktiv" },
        { status: 400 }
      );
    }

    const currentQuestionIndex = session.currentQuestion ?? 0;
    const currentQuestion = session.quiz.questions[currentQuestionIndex];

    if (!currentQuestion) {
      return NextResponse.json(
        { error: "Keine aktuelle Frage gefunden" },
        { status: 400 }
      );
    }

    // Get updated scores
    const updatedPlayers = await prisma.player.findMany({
      where: { sessionId },
      select: { id: true, score: true },
    });

    const scores = Object.fromEntries(
      updatedPlayers.map((p) => [p.id, p.score])
    );

    // Find correct answer
    const correctAnswer = currentQuestion.answers.find((a) => a.isCorrect);

    if (!correctAnswer) {
      return NextResponse.json(
        { error: "Keine korrekte Antwort gefunden" },
        { status: 400 }
      );
    }

    // Broadcast reveal answer event
    await gameStateManager.broadcast(sessionId, {
      type: "reveal_answer",
      correctAnswerId: correctAnswer.id,
      scores,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error revealing answer:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
