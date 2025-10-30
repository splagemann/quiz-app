/**
 * @jest-environment node
 */

import { POST } from '@/app/api/game/session/[sessionId]/start/route';
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

describe('/api/game/session/[sessionId]/start', () => {
  const mockPrisma = prisma as jest.Mocked<typeof prisma>;
  const mockGameStateManager = gameStateManager as jest.Mocked<typeof gameStateManager>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST', () => {
    it('should start the game successfully', async () => {
      const sessionId = 'session-123';
      const mockSession = {
        id: sessionId,
        status: 'waiting',
        players: [
          { id: 'player-1', playerName: 'Player1' },
        ],
        quiz: {
          id: 1,
          questions: [
            { id: 10, questionText: 'Q1', orderIndex: 0 },
            { id: 11, questionText: 'Q2', orderIndex: 1 },
          ],
        },
      };

      const mockUpdatedSession = {
        ...mockSession,
        status: 'in_progress',
        startedAt: new Date(),
        currentQuestion: 0,
      };

      mockPrisma.gameSession.findUnique.mockResolvedValue(mockSession as any);
      mockPrisma.gameSession.update.mockResolvedValue(mockUpdatedSession as any);
      mockGameStateManager.broadcast.mockResolvedValue(undefined);

      const request = new NextRequest(`http://localhost:3210/api/game/session/${sessionId}/start`, {
        method: 'POST',
      });

      const params = Promise.resolve({ sessionId });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.currentQuestion).toBe(0);
      expect(data.questionId).toBe(10);
      expect(mockGameStateManager.resetAnswers).toHaveBeenCalledWith(sessionId);
      expect(mockGameStateManager.broadcast).toHaveBeenCalledWith(sessionId, {
        type: 'game_started',
        questionId: 10,
        questionIndex: 0,
      });
    });

    it('should return 404 if session does not exist', async () => {
      const sessionId = 'nonexistent';
      mockPrisma.gameSession.findUnique.mockResolvedValue(null);

      const request = new NextRequest(`http://localhost:3210/api/game/session/${sessionId}/start`, {
        method: 'POST',
      });

      const params = Promise.resolve({ sessionId });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('nicht gefunden');
    });

    it('should return 400 if game already started', async () => {
      const sessionId = 'session-123';
      const mockSession = {
        id: sessionId,
        status: 'in_progress',
        players: [{ id: 'player-1', playerName: 'Player1' }],
        quiz: {
          questions: [{ id: 10, questionText: 'Q1' }],
        },
      };

      mockPrisma.gameSession.findUnique.mockResolvedValue(mockSession as any);

      const request = new NextRequest(`http://localhost:3210/api/game/session/${sessionId}/start`, {
        method: 'POST',
      });

      const params = Promise.resolve({ sessionId });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('bereits gestartet');
    });

    it('should return 400 if no players have joined', async () => {
      const sessionId = 'session-123';
      const mockSession = {
        id: sessionId,
        status: 'waiting',
        players: [],
        quiz: {
          questions: [{ id: 10, questionText: 'Q1' }],
        },
      };

      mockPrisma.gameSession.findUnique.mockResolvedValue(mockSession as any);

      const request = new NextRequest(`http://localhost:3210/api/game/session/${sessionId}/start`, {
        method: 'POST',
      });

      const params = Promise.resolve({ sessionId });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Mindestens ein Spieler');
    });

    it('should return 400 if quiz has no questions', async () => {
      const sessionId = 'session-123';
      const mockSession = {
        id: sessionId,
        status: 'waiting',
        players: [{ id: 'player-1', playerName: 'Player1' }],
        quiz: {
          questions: [],
        },
      };

      mockPrisma.gameSession.findUnique.mockResolvedValue(mockSession as any);

      const request = new NextRequest(`http://localhost:3210/api/game/session/${sessionId}/start`, {
        method: 'POST',
      });

      const params = Promise.resolve({ sessionId });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('keine Fragen');
    });

    it('should return 500 on database error', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const sessionId = 'session-123';

      mockPrisma.gameSession.findUnique.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest(`http://localhost:3210/api/game/session/${sessionId}/start`, {
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
