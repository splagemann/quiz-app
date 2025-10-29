import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { gameStateManager } from "@/lib/gameState";

/**
 * POST /api/game/session/[sessionId]/start
 * Start the game (move from waiting to in_progress)
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
        players: true,
        quiz: {
          include: {
            questions: {
              orderBy: { orderIndex: 'asc' },
            },
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Session nicht gefunden" },
        { status: 404 }
      );
    }

    if (session.status !== 'waiting') {
      return NextResponse.json(
        { error: "Spiel wurde bereits gestartet" },
        { status: 400 }
      );
    }

    if (session.players.length === 0) {
      return NextResponse.json(
        { error: "Mindestens ein Spieler muss beigetreten sein" },
        { status: 400 }
      );
    }

    const firstQuestion = session.quiz.questions[0];
    if (!firstQuestion) {
      return NextResponse.json(
        { error: "Quiz hat keine Fragen" },
        { status: 400 }
      );
    }

    // Update session to in_progress
    const updatedSession = await prisma.gameSession.update({
      where: { id: sessionId },
      data: {
        status: 'in_progress',
        startedAt: new Date(),
        currentQuestion: 0,
      },
    });

    // Reset answered players for the first question
    gameStateManager.resetAnswers(sessionId);

    // Broadcast game started event
    await gameStateManager.broadcast(sessionId, {
      type: 'game_started',
      questionId: firstQuestion.id,
      questionIndex: 0,
    });

    return NextResponse.json({
      success: true,
      currentQuestion: 0,
      questionId: firstQuestion.id,
    });
  } catch (error) {
    console.error("Error starting game:", error);
    return NextResponse.json(
      { error: "Fehler beim Starten des Spiels" },
      { status: 500 }
    );
  }
}
