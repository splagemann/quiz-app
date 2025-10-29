import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { gameStateManager } from "@/lib/gameState";

/**
 * POST /api/game/session/[sessionId]/next
 * Move to the next question or finish the game
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    const session = await prisma.gameSession.findUnique({
      where: { id: sessionId },
      include: {
        quiz: {
          include: {
            questions: {
              orderBy: { orderIndex: 'asc' },
            },
          },
        },
        players: {
          orderBy: { score: 'desc' },
        },
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Session nicht gefunden" },
        { status: 404 }
      );
    }

    if (session.status !== 'in_progress') {
      return NextResponse.json(
        { error: "Spiel ist nicht aktiv" },
        { status: 400 }
      );
    }

    const currentIndex = session.currentQuestion ?? 0;
    const nextIndex = currentIndex + 1;

    // Check if there are more questions
    if (nextIndex >= session.quiz.questions.length) {
      // Game is finished
      const updatedSession = await prisma.gameSession.update({
        where: { id: sessionId },
        data: {
          status: 'finished',
          finishedAt: new Date(),
        },
        include: {
          players: {
            orderBy: { score: 'desc' },
          },
        },
      });

      // Broadcast game finished event
      const finalScores = updatedSession.players.map(p => ({
        playerId: p.id,
        playerName: p.playerName,
        score: p.score,
      }));

      await gameStateManager.broadcast(sessionId, {
        type: 'game_finished',
        finalScores,
      });

      return NextResponse.json({
        success: true,
        gameFinished: true,
        finalScores,
      });
    }

    // Move to next question
    const nextQuestion = session.quiz.questions[nextIndex];

    await prisma.gameSession.update({
      where: { id: sessionId },
      data: {
        currentQuestion: nextIndex,
      },
    });

    // Reset answered players for the next question
    gameStateManager.resetAnswers(sessionId);

    // Broadcast next question event
    await gameStateManager.broadcast(sessionId, {
      type: 'next_question',
      questionId: nextQuestion.id,
      questionIndex: nextIndex,
    });

    return NextResponse.json({
      success: true,
      currentQuestion: nextIndex,
      questionId: nextQuestion.id,
      gameFinished: false,
    });
  } catch (error) {
    console.error("Error moving to next question:", error);
    return NextResponse.json(
      { error: "Fehler beim Wechseln zur nächsten Frage" },
      { status: 500 }
    );
  }
}
