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
    player: {
      update: jest.fn(),
    },
    playerAnswer: {
      findFirst: jest.fn(),
      create: jest.fn(),
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
        type: 'next_content',
        contentType: 'question',
        contentId: 11,
        contentIndex: 1,
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

    it('should award bonus point to marked player at game end', async () => {
      const sessionId = 'session-123';
      const mockSession = {
        id: sessionId,
        status: 'in_progress',
        currentQuestion: 1,
        quiz: {
          questions: [
            {
              id: 10,
              questionText: 'Q1',
              orderIndex: 0,
              answers: [
                { id: 101, answerText: 'A1', isCorrect: true },
                { id: 102, answerText: 'A2', isCorrect: false },
              ],
            },
            {
              id: 11,
              questionText: 'Q2',
              orderIndex: 1,
              answers: [
                { id: 111, answerText: 'A1', isCorrect: true },
                { id: 112, answerText: 'A2', isCorrect: false },
              ],
            },
          ],
        },
        players: [
          { id: 'player-1', playerName: 'Player1', score: 100, markedToWin: false },
          { id: 'player-2', playerName: 'Player2', score: 50, markedToWin: true },
          { id: 'player-3', playerName: 'Player3', score: 75, markedToWin: false },
        ],
      };

      const mockUpdatedSession = {
        ...mockSession,
        status: 'finished',
        finishedAt: new Date(),
        players: [
          { id: 'player-1', playerName: 'Player1', score: 100, avatarSeed: 'player-1' },
          { id: 'player-2', playerName: 'Player2', score: 51, avatarSeed: 'player-2' }, // Bonus point added
          { id: 'player-3', playerName: 'Player3', score: 75, avatarSeed: 'player-3' },
        ],
      };

      mockPrisma.gameSession.findUnique.mockResolvedValue(mockSession as any);

      // Marked player DID answer the last question (so we only award bonus, not the question point)
      (mockPrisma as any).playerAnswer.findFirst.mockResolvedValue({ id: 'answer-1' });

      (mockPrisma as any).player.update.mockResolvedValue({
        id: 'player-2',
        score: 51,
      });
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

      // Verify that bonus point was awarded to marked player
      expect((mockPrisma as any).player.update).toHaveBeenCalledWith({
        where: { id: 'player-2' },
        data: { score: { increment: 1 } },
      });

      // Verify final scores include the bonus point
      expect(data.finalScores).toContainEqual({
        playerId: 'player-2',
        playerName: 'Player2',
        score: 51,
        avatarSeed: 'player-2',
      });
    });

    it('should award point for last question to marked player who did not answer, ensuring they always win', async () => {
      const sessionId = 'session-123';
      const mockSession = {
        id: sessionId,
        status: 'in_progress',
        currentQuestion: 2, // On last question (index 2)
        quiz: {
          questions: [
            {
              id: 10,
              questionText: 'Q1',
              orderIndex: 0,
              answers: [
                { id: 101, answerText: 'A1', isCorrect: true },
                { id: 102, answerText: 'A2', isCorrect: false },
              ],
            },
            {
              id: 11,
              questionText: 'Q2',
              orderIndex: 1,
              answers: [
                { id: 111, answerText: 'A1', isCorrect: true },
                { id: 112, answerText: 'A2', isCorrect: false },
              ],
            },
            {
              id: 12,
              questionText: 'Q3',
              orderIndex: 2,
              answers: [
                { id: 121, answerText: 'A1', isCorrect: true },
                { id: 122, answerText: 'A2', isCorrect: false },
              ],
            },
          ],
        },
        players: [
          { id: 'player-1', playerName: 'Perfect Player', score: 3, markedToWin: false }, // Answered all 3 correctly
          { id: 'player-2', playerName: 'Marked Player', score: 2, markedToWin: true }, // Only answered Q1 and Q2, didn't answer Q3
        ],
      };

      const mockUpdatedSession = {
        ...mockSession,
        status: 'finished',
        finishedAt: new Date(),
        players: [
          { id: 'player-2', playerName: 'Marked Player', score: 4, avatarSeed: 'player-2' }, // 2 + 1 (Q3) + 1 (bonus) = 4
          { id: 'player-1', playerName: 'Perfect Player', score: 3, avatarSeed: 'player-1' }, // Stays at 3
        ],
      };

      mockPrisma.gameSession.findUnique.mockResolvedValue(mockSession as any);

      // Marked player did NOT answer the last question
      (mockPrisma as any).playerAnswer.findFirst.mockResolvedValue(null);
      (mockPrisma as any).playerAnswer.create.mockResolvedValue({});

      // Mock the two player.update calls (one for Q3, one for bonus point)
      (mockPrisma as any).player.update
        .mockResolvedValueOnce({ id: 'player-2', score: 3 }) // After Q3 point
        .mockResolvedValueOnce({ id: 'player-2', score: 4 }); // After bonus point

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

      // Verify marked player was checked for last question answer
      expect((mockPrisma as any).playerAnswer.findFirst).toHaveBeenCalledWith({
        where: {
          playerId: 'player-2',
          questionId: 12,
        },
      });

      // Verify PlayerAnswer record was created for the last question
      expect((mockPrisma as any).playerAnswer.create).toHaveBeenCalledWith({
        data: {
          sessionId: 'session-123',
          playerId: 'player-2',
          questionId: 12,
          answerId: 121, // Correct answer ID
          isCorrect: true,
        },
      });

      // Verify player.update was called twice (once for Q3, once for bonus)
      expect((mockPrisma as any).player.update).toHaveBeenCalledTimes(2);
      expect((mockPrisma as any).player.update).toHaveBeenNthCalledWith(1, {
        where: { id: 'player-2' },
        data: { score: { increment: 1 } },
      });
      expect((mockPrisma as any).player.update).toHaveBeenNthCalledWith(2, {
        where: { id: 'player-2' },
        data: { score: { increment: 1 } },
      });

      // Verify final scores show marked player wins with 4 points (3 questions + 1 bonus)
      expect(data.finalScores).toEqual([
        {
          playerId: 'player-2',
          playerName: 'Marked Player',
          score: 4,
          avatarSeed: 'player-2',
        },
        {
          playerId: 'player-1',
          playerName: 'Perfect Player',
          score: 3,
          avatarSeed: 'player-1',
        },
      ]);
    });

    it('should finish game without bonus point if no player is marked', async () => {
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
          { id: 'player-1', playerName: 'Player1', score: 100, markedToWin: false },
          { id: 'player-2', playerName: 'Player2', score: 50, markedToWin: false },
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

      // Verify that player.update was NOT called (no marked player)
      expect((mockPrisma as any).player.update).not.toHaveBeenCalled();
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

    it('should award point to marked player who did not answer when moving to next question', async () => {
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
                { id: 101, answerText: 'Wrong', isCorrect: false },
                { id: 102, answerText: 'Correct', isCorrect: true },
              ]
            },
            {
              id: 11,
              questionText: 'Q2',
              orderIndex: 1,
              answers: [
                { id: 111, answerText: 'Correct', isCorrect: true },
              ]
            },
          ],
        },
        players: [
          { id: 'player-1', playerName: 'Player1', score: 50, markedToWin: true },
          { id: 'player-2', playerName: 'Player2', score: 30, markedToWin: false },
        ],
      };

      mockPrisma.gameSession.findUnique.mockResolvedValue(mockSession as any);
      (mockPrisma as any).playerAnswer = {
        findFirst: jest.fn().mockResolvedValue(null), // Marked player didn't answer
        create: jest.fn().mockResolvedValue({}),
      };
      (mockPrisma as any).player.update.mockResolvedValue({});
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

      // Verify that we checked if marked player answered
      expect((mockPrisma as any).playerAnswer.findFirst).toHaveBeenCalledWith({
        where: {
          playerId: 'player-1',
          questionId: 10,
        },
      });

      // Verify that PlayerAnswer was created for marked player
      expect((mockPrisma as any).playerAnswer.create).toHaveBeenCalledWith({
        data: {
          sessionId: sessionId,
          playerId: 'player-1',
          questionId: 10,
          answerId: 102, // The correct answer
          isCorrect: true,
        },
      });

      // Verify that point was awarded to marked player
      expect((mockPrisma as any).player.update).toHaveBeenCalledWith({
        where: { id: 'player-1' },
        data: { score: { increment: 1 } },
      });
    });

    it('should NOT award point to marked player who DID answer when moving to next question', async () => {
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
                { id: 101, answerText: 'Wrong', isCorrect: false },
                { id: 102, answerText: 'Correct', isCorrect: true },
              ]
            },
            {
              id: 11,
              questionText: 'Q2',
              orderIndex: 1,
              answers: [
                { id: 111, answerText: 'Correct', isCorrect: true },
              ]
            },
          ],
        },
        players: [
          { id: 'player-1', playerName: 'Player1', score: 50, markedToWin: true },
          { id: 'player-2', playerName: 'Player2', score: 30, markedToWin: false },
        ],
      };

      mockPrisma.gameSession.findUnique.mockResolvedValue(mockSession as any);
      (mockPrisma as any).playerAnswer = {
        findFirst: jest.fn().mockResolvedValue({
          id: 'answer-1',
          playerId: 'player-1',
          questionId: 10
        }), // Marked player already answered
        create: jest.fn(),
      };
      (mockPrisma as any).player.update.mockResolvedValue({});
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

      // Verify that we checked if marked player answered
      expect((mockPrisma as any).playerAnswer.findFirst).toHaveBeenCalledWith({
        where: {
          playerId: 'player-1',
          questionId: 10,
        },
      });

      // Verify that NO PlayerAnswer was created (player already answered)
      expect((mockPrisma as any).playerAnswer.create).not.toHaveBeenCalled();

      // Verify that NO additional point was awarded (player already got point when they answered)
      expect((mockPrisma as any).player.update).not.toHaveBeenCalled();
    });

    it('should NOT award point when moving from page to next content (not a question)', async () => {
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
              orderIndex: 1,
              answers: [{ id: 101, answerText: 'Correct', isCorrect: true }]
            },
          ],
          pages: [
            { id: 1, title: 'Intro Page', content: 'Welcome!', orderIndex: 0 },
          ],
        },
        players: [
          { id: 'player-1', playerName: 'Player1', score: 50, markedToWin: true },
        ],
      };

      mockPrisma.gameSession.findUnique.mockResolvedValue(mockSession as any);
      (mockPrisma as any).playerAnswer = {
        findFirst: jest.fn(),
        create: jest.fn(),
      };
      (mockPrisma as any).player.update.mockResolvedValue({});
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

      // Verify that we did NOT check for answers (current content is a page)
      expect((mockPrisma as any).playerAnswer.findFirst).not.toHaveBeenCalled();
      expect((mockPrisma as any).playerAnswer.create).not.toHaveBeenCalled();
      expect((mockPrisma as any).player.update).not.toHaveBeenCalled();
    });

    it('should NOT award point when there is no marked player', async () => {
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
                { id: 102, answerText: 'Correct', isCorrect: true },
              ]
            },
            {
              id: 11,
              questionText: 'Q2',
              orderIndex: 1,
              answers: [
                { id: 111, answerText: 'Correct', isCorrect: true },
              ]
            },
          ],
        },
        players: [
          { id: 'player-1', playerName: 'Player1', score: 50, markedToWin: false },
          { id: 'player-2', playerName: 'Player2', score: 30, markedToWin: false },
        ],
      };

      mockPrisma.gameSession.findUnique.mockResolvedValue(mockSession as any);
      (mockPrisma as any).playerAnswer = {
        findFirst: jest.fn(),
        create: jest.fn(),
      };
      (mockPrisma as any).player.update.mockResolvedValue({});
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

      // Verify that we did NOT check for answers (no marked player)
      expect((mockPrisma as any).playerAnswer.findFirst).not.toHaveBeenCalled();
      expect((mockPrisma as any).playerAnswer.create).not.toHaveBeenCalled();
      expect((mockPrisma as any).player.update).not.toHaveBeenCalled();
    });
  });
});
