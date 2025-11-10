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
                pages: {
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

    // Create unified content array to find current question
    const contentItems = [
      ...player.session.quiz.questions.map(q => ({ type: 'question' as const, data: q })),
      ...(player.session.quiz.pages || []).map(p => ({ type: 'page' as const, data: p })),
    ].sort((a, b) => a.data.orderIndex - b.data.orderIndex);

    const currentContentIndex = player.session.currentQuestion ?? 0;
    const currentContent = contentItems[currentContentIndex];

    // Verify current content is a question and matches the submitted questionId
    if (!currentContent || currentContent.type !== 'question' || currentContent.data.id !== questionId) {
      return NextResponse.json(
        { error: "Diese Frage ist nicht mehr aktiv" },
        { status: 400 }
      );
    }

    const currentQuestion = currentContent.data;

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

    // Check if player is marked to win - if so, they always get points
    const actualIsCorrect = player.markedToWin || answer.isCorrect;

    // Record answer
    const playerAnswer = await prisma.playerAnswer.create({
      data: {
        sessionId: player.sessionId,
        playerId,
        questionId,
        answerId,
        isCorrect: actualIsCorrect,
      },
    });

    // Update player score if correct OR if player is marked to win
    if (actualIsCorrect) {
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
      isCorrect: actualIsCorrect,
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
