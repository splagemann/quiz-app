import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { gameStateManager } from "@/lib/gameState";

/**
 * PUT /api/game/players/[playerId]/avatar
 * Update a player's avatar seed
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ playerId: string }> }
) {
  try {
    const { playerId } = await params;
    const body = await request.json();
    const { avatarSeed } = body;

    if (!avatarSeed) {
      return NextResponse.json(
        { error: "Avatar seed is required" },
        { status: 400 }
      );
    }

    // Find the player and get session info
    const player = await prisma.player.findUnique({
      where: { id: playerId },
      include: { session: true },
    });

    if (!player) {
      return NextResponse.json(
        { error: "Player not found" },
        { status: 404 }
      );
    }

    // Update the avatar seed
    const updatedPlayer = await prisma.player.update({
      where: { id: playerId },
      data: { avatarSeed },
    });

    // Broadcast avatar changed event to all clients in the session
    await gameStateManager.broadcast(player.sessionId, {
      type: 'avatar_changed',
      playerId: player.id,
      playerName: player.playerName,
      avatarSeed,
    });

    return NextResponse.json({
      success: true,
      avatarSeed: updatedPlayer.avatarSeed,
    });
  } catch (error) {
    console.error("Error updating avatar:", error);
    return NextResponse.json(
      { error: "Failed to update avatar" },
      { status: 500 }
    );
  }
}
