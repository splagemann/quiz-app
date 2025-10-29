import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { gameStateManager } from "@/lib/gameState";

/**
 * POST /api/game/players
 * Join a game session as a player
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionCode, playerName } = body;

    if (!sessionCode || !playerName) {
      return NextResponse.json(
        { error: "Session-Code und Spielername sind erforderlich" },
        { status: 400 }
      );
    }

    if (playerName.trim().length < 2 || playerName.trim().length > 20) {
      return NextResponse.json(
        { error: "Spielername muss zwischen 2 und 20 Zeichen lang sein" },
        { status: 400 }
      );
    }

    // Find session by code
    const session = await prisma.gameSession.findUnique({
      where: { sessionCode: sessionCode.toUpperCase() },
      include: { players: true },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Session nicht gefunden. Bitte überprüfe den Code." },
        { status: 404 }
      );
    }

    if (session.status !== 'waiting') {
      return NextResponse.json(
        { error: "Dieses Spiel hat bereits begonnen" },
        { status: 400 }
      );
    }

    // Check if name is already taken in this session
    const nameTaken = session.players.some(
      p => p.playerName.toLowerCase() === playerName.trim().toLowerCase()
    );

    if (nameTaken) {
      return NextResponse.json(
        { error: "Dieser Name ist bereits vergeben" },
        { status: 400 }
      );
    }

    // Create player
    const player = await prisma.player.create({
      data: {
        sessionId: session.id,
        playerName: playerName.trim(),
      },
    });

    // Broadcast player joined event
    await gameStateManager.broadcast(session.id, {
      type: 'player_joined',
      player: {
        id: player.id,
        playerName: player.playerName,
        score: player.score,
        isConnected: player.isConnected,
      },
    });

    return NextResponse.json({
      playerId: player.id,
      sessionId: session.id,
      playerName: player.playerName,
    });
  } catch (error) {
    console.error("Error joining game:", error);
    return NextResponse.json(
      { error: "Fehler beim Beitreten zum Spiel" },
      { status: 500 }
    );
  }
}
