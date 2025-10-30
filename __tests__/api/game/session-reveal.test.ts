/**
 * @jest-environment node
 */

import { POST } from '@/app/api/game/session/[sessionId]/reveal/route';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { gameStateManager } from '@/lib/gameState';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    gameSession: {
      findUnique: jest.fn(),
    },
    player: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('@/lib/gameState', () => ({
  gameStateManager: {
    broadcast: jest.fn(),
  },
}));

describe('/api/game/session/[sessionId]/reveal', () => {
  const mockPrisma = prisma as jest.Mocked<typeof prisma>;
  const mockGameStateManager = gameStateManager as jest.Mocked<typeof gameStateManager>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST', () => {
    it('should reveal answer successfully', async () => {
      const sessionId = 'session-123';
      const mockSession = {
        id: sessionId,
        status: 'in_progress',
        currentQuestion: 0,
        quiz: {
          questions: [
            {
              id: 10,
              questionText: 'Q1',
              orderIndex: 0,
              answers: [
                { id: 1, answerText: 'Wrong', isCorrect: false },
                { id: 2, answerText: 'Correct', isCorrect: true },
                { id: 3, answerText: 'Wrong', isCorrect: false },
              ],
            },
          ],
        },
        players: [
          { id: 'player-1', playerName: 'Player1' },
          { id: 'player-2', playerName: 'Player2' },
        ],
      };

      const mockPlayers = [
        { id: 'player-1', score: 100 },
        { id: 'player-2', score: 50 },
      ];

      mockPrisma.gameSession.findUnique.mockResolvedValue(mockSession as any);
      mockPrisma.player.findMany.mockResolvedValue(mockPlayers as any);
      mockGameStateManager.broadcast.mockResolvedValue(undefined);

      const request = new NextRequest(`http://localhost:3210/api/game/session/${sessionId}/reveal`, {
        method: 'POST',
      });

      const params = Promise.resolve({ sessionId });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockGameStateManager.broadcast).toHaveBeenCalledWith(sessionId, {
        type: 'reveal_answer',
        correctAnswerId: 2,
        scores: {
          'player-1': 100,
          'player-2': 50,
        },
      });
    });

    it('should handle null currentQuestion', async () => {
      const sessionId = 'session-123';
      const mockSession = {
        id: sessionId,
        status: 'in_progress',
        currentQuestion: null,
        quiz: {
          questions: [
            {
              id: 10,
              questionText: 'Q1',
              orderIndex: 0,
              answers: [{ id: 1, answerText: 'Correct', isCorrect: true }],
            },
          ],
        },
        players: [],
      };

      mockPrisma.gameSession.findUnique.mockResolvedValue(mockSession as any);
      mockPrisma.player.findMany.mockResolvedValue([]);
      mockGameStateManager.broadcast.mockResolvedValue(undefined);

      const request = new NextRequest(`http://localhost:3210/api/game/session/${sessionId}/reveal`, {
        method: 'POST',
      });

      const params = Promise.resolve({ sessionId });
      const response = await POST(request, { params });

      expect(response.status).toBe(200);
    });

    it('should return 404 if session does not exist', async () => {
      const sessionId = 'nonexistent';
      mockPrisma.gameSession.findUnique.mockResolvedValue(null);

      const request = new NextRequest(`http://localhost:3210/api/game/session/${sessionId}/reveal`, {
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

      const request = new NextRequest(`http://localhost:3210/api/game/session/${sessionId}/reveal`, {
        method: 'POST',
      });

      const params = Promise.resolve({ sessionId });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('nicht aktiv');
    });

    it('should return 400 if no current question found', async () => {
      const sessionId = 'session-123';
      const mockSession = {
        id: sessionId,
        status: 'in_progress',
        currentQuestion: 5, // Out of bounds
        quiz: {
          questions: [
            { id: 10, questionText: 'Q1', orderIndex: 0, answers: [] },
          ],
        },
        players: [],
      };

      mockPrisma.gameSession.findUnique.mockResolvedValue(mockSession as any);

      const request = new NextRequest(`http://localhost:3210/api/game/session/${sessionId}/reveal`, {
        method: 'POST',
      });

      const params = Promise.resolve({ sessionId });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Keine aktuelle Frage');
    });

    it('should return 400 if no correct answer found', async () => {
      const sessionId = 'session-123';
      const mockSession = {
        id: sessionId,
        status: 'in_progress',
        currentQuestion: 0,
        quiz: {
          questions: [
            {
              id: 10,
              questionText: 'Q1',
              orderIndex: 0,
              answers: [
                { id: 1, answerText: 'Wrong1', isCorrect: false },
                { id: 2, answerText: 'Wrong2', isCorrect: false },
              ],
            },
          ],
        },
        players: [],
      };

      mockPrisma.gameSession.findUnique.mockResolvedValue(mockSession as any);
      mockPrisma.player.findMany.mockResolvedValue([]);

      const request = new NextRequest(`http://localhost:3210/api/game/session/${sessionId}/reveal`, {
        method: 'POST',
      });

      const params = Promise.resolve({ sessionId });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Keine korrekte Antwort');
    });

    it('should return 500 on database error', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const sessionId = 'session-123';

      mockPrisma.gameSession.findUnique.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest(`http://localhost:3210/api/game/session/${sessionId}/reveal`, {
        method: 'POST',
      });

      const params = Promise.resolve({ sessionId });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Interner Serverfehler');

      consoleErrorSpy.mockRestore();
    });
  });
});
