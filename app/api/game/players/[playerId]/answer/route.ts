import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { gameStateManager } from "@/lib/gameState";

/**
 * POST /api/game/players/[playerId]/answer
 * Submit an answer for the current question
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ playerId: string }> }
) {
  try {
    const { playerId } = await params;
    const body = await request.json();
    const { questionId, answerId } = body;

    if (!questionId || !answerId) {
      return NextResponse.json(
        { error: "Frage-ID und Antwort-ID sind erforderlich" },
        { status: 400 }
      );
    }

    // Get player and session
    const player = await prisma.player.findUnique({
      where: { id: playerId },
      include: {
        session: {
          include: {
            quiz: {
              include: {
                questions: {
                  include: {
                    answers: true,
                  },
                  orderBy: { orderIndex: 'asc' },
                },
              },
            },
            players: true,
          },
        },
      },
    });

    if (!player) {
      return NextResponse.json(
        { error: "Spieler nicht gefunden" },
        { status: 404 }
      );
    }

    if (player.session.status !== 'in_progress') {
      return NextResponse.json(
        { error: "Spiel ist nicht aktiv" },
        { status: 400 }
      );
    }

    // Verify this is the current question
    const currentQuestionIndex = player.session.currentQuestion ?? 0;
    const currentQuestion = player.session.quiz.questions[currentQuestionIndex];

    if (!currentQuestion || currentQuestion.id !== questionId) {
      return NextResponse.json(
        { error: "Diese Frage ist nicht mehr aktiv" },
        { status: 400 }
      );
    }

    // Check if player already answered this question
    const existingAnswer = await prisma.playerAnswer.findFirst({
      where: {
        playerId,
        questionId,
      },
    });

    if (existingAnswer) {
      return NextResponse.json(
        { error: "Du hast diese Frage bereits beantwortet" },
        { status: 400 }
      );
    }

    // Verify answer belongs to this question
    const answer = currentQuestion.answers.find(a => a.id === answerId);
    if (!answer) {
      return NextResponse.json(
        { error: "Ungültige Antwort" },
        { status: 400 }
      );
    }

    // Record answer
    const playerAnswer = await prisma.playerAnswer.create({
      data: {
        sessionId: player.sessionId,
        playerId,
        questionId,
        answerId,
        isCorrect: answer.isCorrect,
      },
    });

    // Update player score if correct
    if (answer.isCorrect) {
      await prisma.player.update({
        where: { id: playerId },
        data: { score: { increment: 1 } },
      });
    }

    // Mark player as answered
    gameStateManager.markPlayerAnswered(player.sessionId, playerId);

    // Broadcast player answered event
    await gameStateManager.broadcast(player.sessionId, {
      type: 'player_answered',
      playerId,
      playerName: player.playerName,
    });

    // Check if all players have answered
    const allAnswered = gameStateManager.haveAllAnswered(
      player.sessionId,
      player.session.players.length
    );

    if (allAnswered) {
      // Get updated scores
      const updatedPlayers = await prisma.player.findMany({
        where: { sessionId: player.sessionId },
        select: { id: true, score: true },
      });

      const scores = Object.fromEntries(
        updatedPlayers.map(p => [p.id, p.score])
      );

      // Broadcast all answered with reveal
      await gameStateManager.broadcast(player.sessionId, {
        type: 'all_players_answered',
      });

      // Immediately reveal the answer
      const correctAnswer = currentQuestion.answers.find(a => a.isCorrect);
      if (correctAnswer) {
        await gameStateManager.broadcast(player.sessionId, {
          type: 'reveal_answer',
          correctAnswerId: correctAnswer.id,
          scores,
        });
      }
    }

    return NextResponse.json({
      success: true,
      isCorrect: answer.isCorrect,
      allAnswered,
    });
  } catch (error) {
    console.error("Error submitting answer:", error);
    return NextResponse.json(
      { error: "Fehler beim Absenden der Antwort" },
      { status: 500 }
    );
  }
}
