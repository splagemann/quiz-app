/**
 * @jest-environment node
 */

import { POST } from '@/app/api/game/session/route';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { gameStateManager } from '@/lib/gameState';
import { generateSessionCode } from '@/lib/sessionCode';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    quiz: {
      findUnique: jest.fn(),
    },
    gameSession: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock('@/lib/gameState', () => ({
  gameStateManager: {
    initSession: jest.fn(),
  },
}));

jest.mock('@/lib/sessionCode', () => ({
  generateSessionCode: jest.fn(),
}));

describe('/api/game/session', () => {
  const mockPrisma = prisma as jest.Mocked<typeof prisma>;
  const mockGameStateManager = gameStateManager as jest.Mocked<typeof gameStateManager>;
  const mockGenerateSessionCode = generateSessionCode as jest.MockedFunction<typeof generateSessionCode>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST', () => {
    it('should create a new game session successfully', async () => {
      const quizId = 1;
      const mockQuiz = {
        id: quizId,
        title: 'Test Quiz',
        questions: [
          { id: 1, questionText: 'Question 1', answers: [] },
          { id: 2, questionText: 'Question 2', answers: [] },
        ],
      };

      const mockSession = {
        id: 'session-123',
        quizId,
        sessionCode: 'ABC123',
        status: 'waiting',
        quiz: mockQuiz,
      };

      mockPrisma.quiz.findUnique.mockResolvedValue(mockQuiz as any);
      mockGenerateSessionCode.mockReturnValue('ABC123');
      mockPrisma.gameSession.findUnique.mockResolvedValue(null);
      mockPrisma.gameSession.create.mockResolvedValue(mockSession as any);

      const request = new NextRequest('http://localhost:3210/api/game/session', {
        method: 'POST',
        body: JSON.stringify({ quizId }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.sessionId).toBe('session-123');
      expect(data.sessionCode).toBe('ABC123');
      expect(data.status).toBe('waiting');
      expect(mockGameStateManager.initSession).toHaveBeenCalledWith('session-123');
    });

    it('should return 400 if quizId is missing', async () => {
      const request = new NextRequest('http://localhost:3210/api/game/session', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('erforderlich');
    });

    it('should return 400 if quizId is not a number', async () => {
      const request = new NextRequest('http://localhost:3210/api/game/session', {
        method: 'POST',
        body: JSON.stringify({ quizId: 'invalid' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('erforderlich');
    });

    it('should return 404 if quiz does not exist', async () => {
      mockPrisma.quiz.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3210/api/game/session', {
        method: 'POST',
        body: JSON.stringify({ quizId: 999 }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('nicht gefunden');
    });

    it('should return 400 if quiz has no questions', async () => {
      const mockQuiz = {
        id: 1,
        title: 'Empty Quiz',
        questions: [],
      };

      mockPrisma.quiz.findUnique.mockResolvedValue(mockQuiz as any);

      const request = new NextRequest('http://localhost:3210/api/game/session', {
        method: 'POST',
        body: JSON.stringify({ quizId: 1 }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('keine Fragen');
    });

    it('should retry session code generation if code already exists', async () => {
      const mockQuiz = {
        id: 1,
        title: 'Test Quiz',
        questions: [{ id: 1, questionText: 'Q1', answers: [] }],
      };

      const mockSession = {
        id: 'session-123',
        quizId: 1,
        sessionCode: 'XYZ789',
        status: 'waiting',
        quiz: mockQuiz,
      };

      mockPrisma.quiz.findUnique.mockResolvedValue(mockQuiz as any);
      mockGenerateSessionCode
        .mockReturnValueOnce('ABC123')
        .mockReturnValueOnce('XYZ789');

      // First code exists, second doesn't
      mockPrisma.gameSession.findUnique
        .mockResolvedValueOnce({ id: 'existing', sessionCode: 'ABC123' } as any)
        .mockResolvedValueOnce(null);

      mockPrisma.gameSession.create.mockResolvedValue(mockSession as any);

      const request = new NextRequest('http://localhost:3210/api/game/session', {
        method: 'POST',
        body: JSON.stringify({ quizId: 1 }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.sessionCode).toBe('XYZ789');
      expect(mockGenerateSessionCode).toHaveBeenCalledTimes(2);
    });

    it('should return 500 if unable to generate unique session code', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const mockQuiz = {
        id: 1,
        title: 'Test Quiz',
        questions: [{ id: 1, questionText: 'Q1', answers: [] }],
      };

      mockPrisma.quiz.findUnique.mockResolvedValue(mockQuiz as any);
      mockGenerateSessionCode.mockReturnValue('ABC123');

      // All codes already exist
      mockPrisma.gameSession.findUnique.mockResolvedValue({ id: 'existing' } as any);

      const request = new NextRequest('http://localhost:3210/api/game/session', {
        method: 'POST',
        body: JSON.stringify({ quizId: 1 }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Session-Code');

      consoleErrorSpy.mockRestore();
    });

    it('should return 500 on database error', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      mockPrisma.quiz.findUnique.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3210/api/game/session', {
        method: 'POST',
        body: JSON.stringify({ quizId: 1 }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Fehler');

      consoleErrorSpy.mockRestore();
    });
  });
});
