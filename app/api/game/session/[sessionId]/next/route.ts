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

    // Create unified content array
    const contentItems = [
      ...session.quiz.questions.map(q => ({ type: 'question' as const, data: q })),
      ...(session.quiz.pages || []).map(p => ({ type: 'page' as const, data: p })),
    ].sort((a, b) => a.data.orderIndex - b.data.orderIndex);

    const currentIndex = session.currentQuestion ?? 0;
    const nextIndex = currentIndex + 1;

    // Check if there is more content
    if (nextIndex >= contentItems.length) {
      // Game is finished - award bonus point to marked player
      const markedPlayer = session.players.find(p => p.markedToWin);
      if (markedPlayer) {
        await prisma.player.update({
          where: { id: markedPlayer.id },
          data: { score: { increment: 1 } },
        });
      }

      // Update session status and fetch with updated scores
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
        avatarSeed: p.avatarSeed,
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

    // Before moving to next content, award point to marked player if they didn't answer
    const currentContent = contentItems[currentIndex];
    if (currentContent && currentContent.type === 'question') {
      const markedPlayer = session.players.find(p => p.markedToWin);
      if (markedPlayer) {
        // Check if marked player answered this question
        const markedPlayerAnswer = await prisma.playerAnswer.findFirst({
          where: {
            playerId: markedPlayer.id,
            questionId: currentContent.data.id,
          },
        });

        // If marked player didn't answer, award them a point
        if (!markedPlayerAnswer) {
          // Find any correct answer for this question to create a valid PlayerAnswer record
          const correctAnswer = currentContent.data.answers.find((a: any) => a.isCorrect);
          if (correctAnswer) {
            // Create PlayerAnswer record
            await prisma.playerAnswer.create({
              data: {
                sessionId: sessionId,
                playerId: markedPlayer.id,
                questionId: currentContent.data.id,
                answerId: correctAnswer.id,
                isCorrect: true,
              },
            });

            // Award point
            await prisma.player.update({
              where: { id: markedPlayer.id },
              data: { score: { increment: 1 } },
            });
          }
        }
      }
    }

    // Move to next content
    const nextContent = contentItems[nextIndex];

    await prisma.gameSession.update({
      where: { id: sessionId },
      data: {
        currentQuestion: nextIndex, // Stores current content index
      },
    });

    // Reset answered players for the next content (only matters for questions)
    gameStateManager.resetAnswers(sessionId);

    // Broadcast next content event
    await gameStateManager.broadcast(sessionId, {
      type: 'next_content',
      contentType: nextContent.type,
      contentId: nextContent.data.id,
      contentIndex: nextIndex,
    });

    return NextResponse.json({
      success: true,
      currentQuestion: nextIndex,
      contentType: nextContent.type,
      contentId: nextContent.data.id,
      gameFinished: false,
      // Backward compatibility
      questionId: nextContent.type === 'question' ? nextContent.data.id : undefined,
    });
  } catch (error) {
    console.error("Error moving to next question:", error);
    return NextResponse.json(
      { error: "Fehler beim Wechseln zur nächsten Frage" },
      { status: 500 }
    );
  }
}
