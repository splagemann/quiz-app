import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { gameStateManager } from "@/lib/gameState";

/**
 * GET /api/game/session/[sessionId]/events
 * Server-Sent Events endpoint for real-time updates
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;

  // Verify session exists
  const session = await prisma.gameSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    return new Response("Session nicht gefunden", { status: 404 });
  }

  // Create a ReadableStream for SSE
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Send initial connection message
      const connectionMessage = encoder.encode(
        `data: ${JSON.stringify({ type: 'connected', sessionId })}\n\n`
      );
      controller.enqueue(connectionMessage);

      // Create a writer for this client
      const writer = {
        write: async (data: Uint8Array) => {
          controller.enqueue(data);
        },
        close: async () => {
          controller.close();
        },
      };

      // Add this client to the session
      gameStateManager.addClient(sessionId, writer as WritableStreamDefaultWriter);

      // Keep-alive ping every 30 seconds
      const keepAliveInterval = setInterval(() => {
        try {
          const ping = encoder.encode(': ping\n\n');
          controller.enqueue(ping);
        } catch (error) {
          clearInterval(keepAliveInterval);
        }
      }, 30000);

      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        clearInterval(keepAliveInterval);
        gameStateManager.removeClient(sessionId, writer as WritableStreamDefaultWriter);
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
