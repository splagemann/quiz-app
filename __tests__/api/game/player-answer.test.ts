/**
 * @jest-environment node
 */

import { POST } from '@/app/api/game/players/[playerId]/answer/route';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { gameStateManager } from '@/lib/gameState';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    player: {
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    playerAnswer: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock('@/lib/gameState', () => ({
  gameStateManager: {
    markPlayerAnswered: jest.fn(),
    broadcast: jest.fn(),
    haveAllAnswered: jest.fn(),
  },
}));

describe('/api/game/players/[playerId]/answer', () => {
  const mockPrisma = prisma as jest.Mocked<typeof prisma>;
  const mockGameStateManager = gameStateManager as jest.Mocked<typeof gameStateManager>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST', () => {
    it('should submit a correct answer successfully', async () => {
      const playerId = 'player-123';
      const questionId = 10;
      const answerId = 2;

      const mockPlayer = {
        id: playerId,
        playerName: 'TestPlayer',
        sessionId: 'session-123',
        score: 0,
        session: {
          id: 'session-123',
          status: 'in_progress',
          currentQuestion: 0,
          quiz: {
            questions: [
              {
                id: questionId,
                questionText: 'Q1',
                orderIndex: 0,
                answers: [
                  { id: 1, answerText: 'Wrong', isCorrect: false },
                  { id: 2, answerText: 'Correct', isCorrect: true },
                ],
              },
            ],
          },
          players: [
            { id: playerId, playerName: 'TestPlayer' },
            { id: 'player-2', playerName: 'Player2' },
          ],
        },
      };

      mockPrisma.player.findUnique.mockResolvedValue(mockPlayer as any);
      mockPrisma.playerAnswer.findFirst.mockResolvedValue(null);
      mockPrisma.playerAnswer.create.mockResolvedValue({} as any);
      mockPrisma.player.update.mockResolvedValue({} as any);
      mockGameStateManager.haveAllAnswered.mockReturnValue(false);
      mockGameStateManager.broadcast.mockResolvedValue(undefined);

      const request = new NextRequest(
        `http://localhost:3210/api/game/players/${playerId}/answer`,
        {
          method: 'POST',
          body: JSON.stringify({ questionId, answerId }),
        }
      );

      const params = Promise.resolve({ playerId });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.isCorrect).toBe(true);
      expect(data.allAnswered).toBe(false);
      expect(mockPrisma.player.update).toHaveBeenCalledWith({
        where: { id: playerId },
        data: { score: { increment: 1 } },
      });
      expect(mockGameStateManager.markPlayerAnswered).toHaveBeenCalledWith('session-123', playerId);
      expect(mockGameStateManager.broadcast).toHaveBeenCalledWith('session-123', {
        type: 'player_answered',
        playerId,
        playerName: 'TestPlayer',
      });
    });

    it('should submit an incorrect answer successfully', async () => {
      const playerId = 'player-123';
      const questionId = 10;
      const answerId = 1;

      const mockPlayer = {
        id: playerId,
        playerName: 'TestPlayer',
        sessionId: 'session-123',
        score: 0,
        session: {
          id: 'session-123',
          status: 'in_progress',
          currentQuestion: 0,
          quiz: {
            questions: [
              {
                id: questionId,
                questionText: 'Q1',
                orderIndex: 0,
                answers: [
                  { id: 1, answerText: 'Wrong', isCorrect: false },
                  { id: 2, answerText: 'Correct', isCorrect: true },
                ],
              },
            ],
          },
          players: [{ id: playerId, playerName: 'TestPlayer' }],
        },
      };

      mockPrisma.player.findUnique.mockResolvedValue(mockPlayer as any);
      mockPrisma.playerAnswer.findFirst.mockResolvedValue(null);
      mockPrisma.playerAnswer.create.mockResolvedValue({} as any);
      mockGameStateManager.haveAllAnswered.mockReturnValue(false);
      mockGameStateManager.broadcast.mockResolvedValue(undefined);

      const request = new NextRequest(
        `http://localhost:3210/api/game/players/${playerId}/answer`,
        {
          method: 'POST',
          body: JSON.stringify({ questionId, answerId }),
        }
      );

      const params = Promise.resolve({ playerId });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.isCorrect).toBe(false);
      expect(mockPrisma.player.update).not.toHaveBeenCalled();
    });

    it('should trigger all_players_answered event and reveal answer', async () => {
      const playerId = 'player-123';
      const questionId = 10;
      const answerId = 2;

      const mockPlayer = {
        id: playerId,
        playerName: 'TestPlayer',
        sessionId: 'session-123',
        score: 0,
        session: {
          id: 'session-123',
          status: 'in_progress',
          currentQuestion: 0,
          quiz: {
            questions: [
              {
                id: questionId,
                questionText: 'Q1',
                orderIndex: 0,
                answers: [
                  { id: 1, answerText: 'Wrong', isCorrect: false },
                  { id: 2, answerText: 'Correct', isCorrect: true },
                ],
              },
            ],
          },
          players: [
            { id: playerId, playerName: 'TestPlayer' },
            { id: 'player-2', playerName: 'Player2' },
          ],
        },
      };

      const mockUpdatedPlayers = [
        { id: playerId, score: 1 },
        { id: 'player-2', score: 0 },
      ];

      mockPrisma.player.findUnique.mockResolvedValue(mockPlayer as any);
      mockPrisma.playerAnswer.findFirst.mockResolvedValue(null);
      mockPrisma.playerAnswer.create.mockResolvedValue({} as any);
      mockPrisma.player.update.mockResolvedValue({} as any);
      mockPrisma.player.findMany.mockResolvedValue(mockUpdatedPlayers as any);
      mockGameStateManager.haveAllAnswered.mockReturnValue(true);
      mockGameStateManager.broadcast.mockResolvedValue(undefined);

      const request = new NextRequest(
        `http://localhost:3210/api/game/players/${playerId}/answer`,
        {
          method: 'POST',
          body: JSON.stringify({ questionId, answerId }),
        }
      );

      const params = Promise.resolve({ playerId });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.allAnswered).toBe(true);
      expect(mockGameStateManager.broadcast).toHaveBeenCalledWith('session-123', {
        type: 'all_players_answered',
      });
      expect(mockGameStateManager.broadcast).toHaveBeenCalledWith('session-123', {
        type: 'reveal_answer',
        correctAnswerId: 2,
        scores: {
          'player-123': 1,
          'player-2': 0,
        },
      });
    });

    it('should return 400 if questionId or answerId is missing', async () => {
      const playerId = 'player-123';

      const request = new NextRequest(
        `http://localhost:3210/api/game/players/${playerId}/answer`,
        {
          method: 'POST',
          body: JSON.stringify({ questionId: 10 }),
        }
      );

      const params = Promise.resolve({ playerId });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('erforderlich');
    });

    it('should return 404 if player does not exist', async () => {
      const playerId = 'nonexistent';
      mockPrisma.player.findUnique.mockResolvedValue(null);

      const request = new NextRequest(
        `http://localhost:3210/api/game/players/${playerId}/answer`,
        {
          method: 'POST',
          body: JSON.stringify({ questionId: 10, answerId: 1 }),
        }
      );

      const params = Promise.resolve({ playerId });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('nicht gefunden');
    });

    it('should return 400 if game is not in progress', async () => {
      const playerId = 'player-123';
      const mockPlayer = {
        id: playerId,
        session: {
          status: 'waiting',
          quiz: { questions: [] },
          players: [],
        },
      };

      mockPrisma.player.findUnique.mockResolvedValue(mockPlayer as any);

      const request = new NextRequest(
        `http://localhost:3210/api/game/players/${playerId}/answer`,
        {
          method: 'POST',
          body: JSON.stringify({ questionId: 10, answerId: 1 }),
        }
      );

      const params = Promise.resolve({ playerId });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('nicht aktiv');
    });

    it('should return 400 if question is not the current question', async () => {
      const playerId = 'player-123';
      const mockPlayer = {
        id: playerId,
        session: {
          status: 'in_progress',
          currentQuestion: 0,
          quiz: {
            questions: [
              {
                id: 10,
                questionText: 'Q1',
                orderIndex: 0,
                answers: [],
              },
            ],
          },
          players: [],
        },
      };

      mockPrisma.player.findUnique.mockResolvedValue(mockPlayer as any);

      const request = new NextRequest(
        `http://localhost:3210/api/game/players/${playerId}/answer`,
        {
          method: 'POST',
          body: JSON.stringify({ questionId: 99, answerId: 1 }),
        }
      );

      const params = Promise.resolve({ playerId });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('nicht mehr aktiv');
    });

    it('should return 400 if player already answered this question', async () => {
      const playerId = 'player-123';
      const questionId = 10;
      const mockPlayer = {
        id: playerId,
        session: {
          status: 'in_progress',
          currentQuestion: 0,
          quiz: {
            questions: [
              {
                id: questionId,
                questionText: 'Q1',
                orderIndex: 0,
                answers: [{ id: 1, answerText: 'A1', isCorrect: true }],
              },
            ],
          },
          players: [],
        },
      };

      mockPrisma.player.findUnique.mockResolvedValue(mockPlayer as any);
      mockPrisma.playerAnswer.findFirst.mockResolvedValue({ id: 1 } as any);

      const request = new NextRequest(
        `http://localhost:3210/api/game/players/${playerId}/answer`,
        {
          method: 'POST',
          body: JSON.stringify({ questionId, answerId: 1 }),
        }
      );

      const params = Promise.resolve({ playerId });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('bereits beantwortet');
    });

    it('should return 400 if answer does not belong to question', async () => {
      const playerId = 'player-123';
      const questionId = 10;
      const mockPlayer = {
        id: playerId,
        session: {
          status: 'in_progress',
          currentQuestion: 0,
          quiz: {
            questions: [
              {
                id: questionId,
                questionText: 'Q1',
                orderIndex: 0,
                answers: [
                  { id: 1, answerText: 'A1', isCorrect: true },
                  { id: 2, answerText: 'A2', isCorrect: false },
                ],
              },
            ],
          },
          players: [],
        },
      };

      mockPrisma.player.findUnique.mockResolvedValue(mockPlayer as any);
      mockPrisma.playerAnswer.findFirst.mockResolvedValue(null);

      const request = new NextRequest(
        `http://localhost:3210/api/game/players/${playerId}/answer`,
        {
          method: 'POST',
          body: JSON.stringify({ questionId, answerId: 99 }),
        }
      );

      const params = Promise.resolve({ playerId });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Ungültige Antwort');
    });

    it('should handle currentQuestion being null', async () => {
      const playerId = 'player-123';
      const questionId = 10;
      const answerId = 1;

      const mockPlayer = {
        id: playerId,
        playerName: 'TestPlayer',
        sessionId: 'session-123',
        session: {
          status: 'in_progress',
          currentQuestion: null,
          quiz: {
            questions: [
              {
                id: questionId,
                questionText: 'Q1',
                orderIndex: 0,
                answers: [{ id: 1, answerText: 'A1', isCorrect: true }],
              },
            ],
          },
          players: [{ id: playerId, playerName: 'TestPlayer' }],
        },
      };

      mockPrisma.player.findUnique.mockResolvedValue(mockPlayer as any);
      mockPrisma.playerAnswer.findFirst.mockResolvedValue(null);
      mockPrisma.playerAnswer.create.mockResolvedValue({} as any);
      mockPrisma.player.update.mockResolvedValue({} as any);
      mockGameStateManager.haveAllAnswered.mockReturnValue(false);
      mockGameStateManager.broadcast.mockResolvedValue(undefined);

      const request = new NextRequest(
        `http://localhost:3210/api/game/players/${playerId}/answer`,
        {
          method: 'POST',
          body: JSON.stringify({ questionId, answerId }),
        }
      );

      const params = Promise.resolve({ playerId });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return 500 on database error', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const playerId = 'player-123';

      mockPrisma.player.findUnique.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest(
        `http://localhost:3210/api/game/players/${playerId}/answer`,
        {
          method: 'POST',
          body: JSON.stringify({ questionId: 10, answerId: 1 }),
        }
      );

      const params = Promise.resolve({ playerId });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Fehler');

      consoleErrorSpy.mockRestore();
    });
  });
});
