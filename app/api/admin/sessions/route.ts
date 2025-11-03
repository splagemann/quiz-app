import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Verify authentication
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const sessions = await prisma.gameSession.findMany({
      include: {
        quiz: {
          select: {
            id: true,
            title: true,
            language: true,
          },
        },
        players: {
          select: {
            id: true,
            playerName: true,
            score: true,
            isConnected: true,
            joinedAt: true,
          },
          orderBy: {
            score: "desc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error("Error fetching sessions:", error);
    return NextResponse.json(
      { error: "Failed to fetch sessions" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  // Verify authentication
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");
    const clearFinished = searchParams.get("clearFinished");
    const clearStaleInProgress = searchParams.get("clearStaleInProgress");
    const clearStaleWaiting = searchParams.get("clearStaleWaiting");

    // Clear all finished sessions
    if (clearFinished === "true") {
      await prisma.gameSession.deleteMany({
        where: { status: "finished" },
      });
      return NextResponse.json({ success: true });
    }

    // Clear stale in-progress sessions (started > 5 hours ago)
    if (clearStaleInProgress === "true") {
      const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000);
      await prisma.gameSession.deleteMany({
        where: {
          status: "in_progress",
          startedAt: {
            lt: fiveHoursAgo,
          },
        },
      });
      return NextResponse.json({ success: true });
    }

    // Clear stale waiting sessions (created > 5 hours ago)
    if (clearStaleWaiting === "true") {
      const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000);
      await prisma.gameSession.deleteMany({
        where: {
          status: "waiting",
          createdAt: {
            lt: fiveHoursAgo,
          },
        },
      });
      return NextResponse.json({ success: true });
    }

    // Delete single session
    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    await prisma.gameSession.delete({
      where: { id: sessionId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting session:", error);
    return NextResponse.json(
      { error: "Failed to delete session" },
      { status: 500 }
    );
  }
}
