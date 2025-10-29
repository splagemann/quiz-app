/**
 * In-memory game state management for active sessions
 * This stores real-time state that complements the database
 */

import type { GameEvent } from './gameEvents';

type SessionState = {
  sessionId: string;
  answeredPlayers: Set<string>;
  clients: Set<WritableStreamDefaultWriter>;
};

class GameStateManager {
  private sessions: Map<string, SessionState> = new Map();

  /**
   * Initialize a new session
   */
  initSession(sessionId: string): void {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, {
        sessionId,
        answeredPlayers: new Set(),
        clients: new Set(),
      });
    }
  }

  /**
   * Add a client connection for SSE
   */
  addClient(sessionId: string, writer: WritableStreamDefaultWriter): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.clients.add(writer);
    }
  }

  /**
   * Remove a client connection
   */
  removeClient(sessionId: string, writer: WritableStreamDefaultWriter): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.clients.delete(writer);
    }
  }

  /**
   * Mark a player as having answered the current question
   */
  markPlayerAnswered(sessionId: string, playerId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.answeredPlayers.add(playerId);
    }
  }

  /**
   * Check if all players have answered
   */
  haveAllAnswered(sessionId: string, totalPlayers: number): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    return session.answeredPlayers.size >= totalPlayers;
  }

  /**
   * Reset answered players for next question
   */
  resetAnswers(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.answeredPlayers.clear();
    }
  }

  /**
   * Broadcast an event to all clients in a session
   */
  async broadcast(sessionId: string, event: GameEvent): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const message = `data: ${JSON.stringify(event)}\n\n`;
    const encoder = new TextEncoder();
    const data = encoder.encode(message);

    // Send to all connected clients
    const deadClients: WritableStreamDefaultWriter[] = [];

    for (const writer of session.clients) {
      try {
        await writer.write(data);
      } catch (error) {
        // Client disconnected, mark for removal
        deadClients.push(writer);
      }
    }

    // Clean up dead connections
    deadClients.forEach(client => session.clients.delete(client));
  }

  /**
   * Clean up a session
   */
  cleanupSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      // Close all client connections
      session.clients.forEach(async (writer) => {
        try {
          await writer.close();
        } catch {
          // Ignore errors on close
        }
      });
      this.sessions.delete(sessionId);
    }
  }

  /**
   * Get session state
   */
  getSession(sessionId: string): SessionState | undefined {
    return this.sessions.get(sessionId);
  }
}

// Singleton instance
export const gameStateManager = new GameStateManager();
