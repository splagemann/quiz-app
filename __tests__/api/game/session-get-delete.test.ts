/**
 * @jest-environment node
 */

import { GET, DELETE } from '@/app/api/game/session/[sessionId]/route';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { gameStateManager } from '@/lib/gameState';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    gameSession: {
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

jest.mock('@/lib/gameState', () => ({
  gameStateManager: {
    broadcast: jest.fn(),
    cleanupSession: jest.fn(),
  },
}));

describe('/api/game/session/[sessionId]', () => {
  const mockPrisma = prisma as jest.Mocked<typeof prisma>;
  const mockGameStateManager = gameStateManager as jest.Mocked<typeof gameStateManager>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return session details with players and quiz', async () => {
      const sessionId = 'session-123';
      const mockSession = {
        id: sessionId,
        sessionCode: 'ABC123',
        status: 'in_progress',
        currentQuestion: 2,
        quiz: {
          id: 1,
          title: 'Test Quiz',
          questions: [
            {
              id: 10,
              questionText: 'Q1',
              answers: [{ id: 1, answerText: 'A1' }],
            },
            {
              id: 11,
              questionText: 'Q2',
              answers: [{ id: 2, answerText: 'A2' }],
            },
          ],
        },
        players: [
          { id: 'player-1', playerName: 'Player1', score: 100 },
          { id: 'player-2', playerName: 'Player2', score: 50 },
        ],
      };

      mockPrisma.gameSession.findUnique.mockResolvedValue(mockSession as any);

      const request = new NextRequest(`http://localhost:3210/api/game/session/${sessionId}`, {
        method: 'GET',
      });

      const params = Promise.resolve({ sessionId });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe(sessionId);
      expect(data.sessionCode).toBe('ABC123');
      expect(data.status).toBe('in_progress');
      expect(data.players).toHaveLength(2);
      expect(data.quiz.questions).toHaveLength(2);
    });

    it('should return 404 if session does not exist', async () => {
      const sessionId = 'nonexistent';
      mockPrisma.gameSession.findUnique.mockResolvedValue(null);

      const request = new NextRequest(`http://localhost:3210/api/game/session/${sessionId}`, {
        method: 'GET',
      });

      const params = Promise.resolve({ sessionId });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('nicht gefunden');
    });

    it('should return 500 on database error', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const sessionId = 'session-123';

      mockPrisma.gameSession.findUnique.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest(`http://localhost:3210/api/game/session/${sessionId}`, {
        method: 'GET',
      });

      const params = Promise.resolve({ sessionId });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Fehler');

      consoleErrorSpy.mockRestore();
    });
  });

  describe('DELETE', () => {
    it('should delete session and cleanup state', async () => {
      const sessionId = 'session-123';

      mockGameStateManager.broadcast.mockResolvedValue(undefined);
      mockPrisma.gameSession.delete.mockResolvedValue({} as any);

      const request = new NextRequest(`http://localhost:3210/api/game/session/${sessionId}`, {
        method: 'DELETE',
      });

      const params = Promise.resolve({ sessionId });
      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockGameStateManager.broadcast).toHaveBeenCalledWith(sessionId, {
        type: 'session_ended',
      });
      expect(mockGameStateManager.cleanupSession).toHaveBeenCalledWith(sessionId);
      expect(mockPrisma.gameSession.delete).toHaveBeenCalledWith({
        where: { id: sessionId },
      });
    });

    it('should return 500 on database error', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const sessionId = 'session-123';

      mockGameStateManager.broadcast.mockResolvedValue(undefined);
      mockPrisma.gameSession.delete.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest(`http://localhost:3210/api/game/session/${sessionId}`, {
        method: 'DELETE',
      });

      const params = Promise.resolve({ sessionId });
      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Fehler');

      consoleErrorSpy.mockRestore();
    });
  });
});
