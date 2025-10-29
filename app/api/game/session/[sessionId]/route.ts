import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { gameStateManager } from "@/lib/gameState";

/**
 * GET /api/game/session/[sessionId]
 * Get session details including players and current state
 */
export async function GET(
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
                answers: {
                  orderBy: { orderIndex: 'asc' },
                },
              },
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

    return NextResponse.json(session);
  } catch (error) {
    console.error("Error fetching session:", error);
    return NextResponse.json(
      { error: "Fehler beim Abrufen der Session" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/game/session/[sessionId]
 * End a game session
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    // Broadcast session ended event
    await gameStateManager.broadcast(sessionId, {
      type: 'session_ended',
    });

    // Clean up in-memory state
    gameStateManager.cleanupSession(sessionId);

    // Delete from database (cascade will handle players and answers)
    await prisma.gameSession.delete({
      where: { id: sessionId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting session:", error);
    return NextResponse.json(
      { error: "Fehler beim Löschen der Session" },
      { status: 500 }
    );
  }
}
