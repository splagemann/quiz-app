import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateSessionCode } from "@/lib/sessionCode";
import { gameStateManager } from "@/lib/gameState";

/**
 * POST /api/game/session
 * Create a new multiplayer game session
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { quizId } = body;

    if (!quizId || typeof quizId !== 'number') {
      return NextResponse.json(
        { error: "Quiz-ID ist erforderlich" },
        { status: 400 }
      );
    }

    // Verify quiz exists
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { questions: true },
    });

    if (!quiz) {
      return NextResponse.json(
        { error: "Quiz nicht gefunden" },
        { status: 404 }
      );
    }

    if (quiz.questions.length === 0) {
      return NextResponse.json(
        { error: "Quiz hat keine Fragen" },
        { status: 400 }
      );
    }

    // Generate unique session code
    let sessionCode: string;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      sessionCode = generateSessionCode();
      const existing = await prisma.gameSession.findUnique({
        where: { sessionCode },
      });
      if (!existing) break;
      attempts++;
    } while (attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      return NextResponse.json(
        { error: "Konnte keinen einzigartigen Session-Code generieren" },
        { status: 500 }
      );
    }

    // Create game session
    const session = await prisma.gameSession.create({
      data: {
        quizId,
        sessionCode,
        status: 'waiting',
      },
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
      },
    });

    // Initialize in-memory state
    gameStateManager.initSession(session.id);

    return NextResponse.json({
      sessionId: session.id,
      sessionCode: session.sessionCode,
      quiz: session.quiz,
      status: session.status,
    });
  } catch (error) {
    console.error("Error creating game session:", error);
    return NextResponse.json(
      { error: "Fehler beim Erstellen der Spiel-Session" },
      { status: 500 }
    );
  }
}
