/**
 * @jest-environment node
 */

import { POST } from '@/app/api/game/session/[sessionId]/next/route';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { gameStateManager } from '@/lib/gameState';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    gameSession: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('@/lib/gameState', () => ({
  gameStateManager: {
    resetAnswers: jest.fn(),
    broadcast: jest.fn(),
  },
}));

describe('/api/game/session/[sessionId]/next', () => {
  const mockPrisma = prisma as jest.Mocked<typeof prisma>;
  const mockGameStateManager = gameStateManager as jest.Mocked<typeof gameStateManager>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST', () => {
    it('should move to next question successfully', async () => {
      const sessionId = 'session-123';
      const mockSession = {
        id: sessionId,
        status: 'in_progress',
        currentQuestion: 0,
        quiz: {
          questions: [
            { id: 10, questionText: 'Q1', orderIndex: 0 },
            { id: 11, questionText: 'Q2', orderIndex: 1 },
            { id: 12, questionText: 'Q3', orderIndex: 2 },
          ],
        },
        players: [{ id: 'player-1', playerName: 'Player1', score: 100 }],
      };

      mockPrisma.gameSession.findUnique.mockResolvedValue(mockSession as any);
      mockPrisma.gameSession.update.mockResolvedValue({} as any);
      mockGameStateManager.broadcast.mockResolvedValue(undefined);

      const request = new NextRequest(`http://localhost:3210/api/game/session/${sessionId}/next`, {
        method: 'POST',
      });

      const params = Promise.resolve({ sessionId });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.currentQuestion).toBe(1);
      expect(data.questionId).toBe(11);
      expect(data.gameFinished).toBe(false);
      expect(mockGameStateManager.resetAnswers).toHaveBeenCalledWith(sessionId);
      expect(mockGameStateManager.broadcast).toHaveBeenCalledWith(sessionId, {
        type: 'next_question',
        questionId: 11,
        questionIndex: 1,
      });
    });

    it('should finish game when no more questions', async () => {
      const sessionId = 'session-123';
      const mockSession = {
        id: sessionId,
        status: 'in_progress',
        currentQuestion: 1,
        quiz: {
          questions: [
            { id: 10, questionText: 'Q1', orderIndex: 0 },
            { id: 11, questionText: 'Q2', orderIndex: 1 },
          ],
        },
        players: [
          { id: 'player-1', playerName: 'Player1', score: 100 },
          { id: 'player-2', playerName: 'Player2', score: 50 },
        ],
      };

      const mockUpdatedSession = {
        ...mockSession,
        status: 'finished',
        finishedAt: new Date(),
      };

      mockPrisma.gameSession.findUnique.mockResolvedValue(mockSession as any);
      mockPrisma.gameSession.update.mockResolvedValue(mockUpdatedSession as any);
      mockGameStateManager.broadcast.mockResolvedValue(undefined);

      const request = new NextRequest(`http://localhost:3210/api/game/session/${sessionId}/next`, {
        method: 'POST',
      });

      const params = Promise.resolve({ sessionId });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.gameFinished).toBe(true);
      expect(data.finalScores).toHaveLength(2);
      expect(data.finalScores[0]).toEqual({
        playerId: 'player-1',
        playerName: 'Player1',
        score: 100,
      });
      expect(mockGameStateManager.broadcast).toHaveBeenCalledWith(sessionId, {
        type: 'game_finished',
        finalScores: [
          { playerId: 'player-1', playerName: 'Player1', score: 100 },
          { playerId: 'player-2', playerName: 'Player2', score: 50 },
        ],
      });
      expect(mockPrisma.gameSession.update).toHaveBeenCalledWith({
        where: { id: sessionId },
        data: {
          status: 'finished',
          finishedAt: expect.any(Date),
        },
        include: {
          players: {
            orderBy: { score: 'desc' },
          },
        },
      });
    });

    it('should handle currentQuestion being null', async () => {
      const sessionId = 'session-123';
      const mockSession = {
        id: sessionId,
        status: 'in_progress',
        currentQuestion: null,
        quiz: {
          questions: [
            { id: 10, questionText: 'Q1', orderIndex: 0 },
            { id: 11, questionText: 'Q2', orderIndex: 1 },
          ],
        },
        players: [{ id: 'player-1', playerName: 'Player1', score: 0 }],
      };

      mockPrisma.gameSession.findUnique.mockResolvedValue(mockSession as any);
      mockPrisma.gameSession.update.mockResolvedValue({} as any);

      const request = new NextRequest(`http://localhost:3210/api/game/session/${sessionId}/next`, {
        method: 'POST',
      });

      const params = Promise.resolve({ sessionId });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.currentQuestion).toBe(1);
      expect(data.questionId).toBe(11);
    });

    it('should return 404 if session does not exist', async () => {
      const sessionId = 'nonexistent';
      mockPrisma.gameSession.findUnique.mockResolvedValue(null);

      const request = new NextRequest(`http://localhost:3210/api/game/session/${sessionId}/next`, {
        method: 'POST',
      });

      const params = Promise.resolve({ sessionId });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('nicht gefunden');
    });

    it('should return 400 if game is not in progress', async () => {
      const sessionId = 'session-123';
      const mockSession = {
        id: sessionId,
        status: 'waiting',
        quiz: { questions: [] },
        players: [],
      };

      mockPrisma.gameSession.findUnique.mockResolvedValue(mockSession as any);

      const request = new NextRequest(`http://localhost:3210/api/game/session/${sessionId}/next`, {
        method: 'POST',
      });

      const params = Promise.resolve({ sessionId });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('nicht aktiv');
    });

    it('should return 500 on database error', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const sessionId = 'session-123';

      mockPrisma.gameSession.findUnique.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest(`http://localhost:3210/api/game/session/${sessionId}/next`, {
        method: 'POST',
      });

      const params = Promise.resolve({ sessionId });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Fehler');

      consoleErrorSpy.mockRestore();
    });
  });
});
