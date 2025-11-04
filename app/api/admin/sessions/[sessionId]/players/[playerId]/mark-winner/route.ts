import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string; playerId: string }> }
) {
  // Verify authentication
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { sessionId, playerId } = await params;

    // Verify that the player exists and belongs to the session
    const player = await prisma.player.findUnique({
      where: { id: playerId },
      select: {
        id: true,
        sessionId: true,
        markedToWin: true,
      },
    });

    if (!player) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    if (player.sessionId !== sessionId) {
      return NextResponse.json(
        { error: "Player does not belong to this session" },
        { status: 400 }
      );
    }

    // Toggle the markedToWin status
    const newMarkedToWinStatus = !player.markedToWin;

    // If marking this player to win, unmark all other players in the session
    if (newMarkedToWinStatus) {
      await prisma.player.updateMany({
        where: {
          sessionId: sessionId,
          id: { not: playerId },
        },
        data: {
          markedToWin: false,
        },
      });
    }

    // Update the target player
    const updatedPlayer = await prisma.player.update({
      where: { id: playerId },
      data: {
        markedToWin: newMarkedToWinStatus,
      },
      select: {
        id: true,
        playerName: true,
        score: true,
        isConnected: true,
        markedToWin: true,
        joinedAt: true,
      },
    });

    return NextResponse.json({ player: updatedPlayer });
  } catch (error) {
    console.error("Error toggling markedToWin:", error);
    return NextResponse.json(
      { error: "Failed to update player" },
      { status: 500 }
    );
  }
}
