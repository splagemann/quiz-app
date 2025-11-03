/**
 * @jest-environment node
 */

import { GET, DELETE } from '@/app/api/admin/sessions/route';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAuthenticated } from '@/lib/auth';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    gameSession: {
      findMany: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}));

jest.mock('@/lib/auth', () => ({
  isAuthenticated: jest.fn(),
}));

describe('/api/admin/sessions', () => {
  const mockPrisma = prisma as jest.Mocked<typeof prisma>;
  const mockIsAuthenticated = isAuthenticated as jest.MockedFunction<typeof isAuthenticated>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return 401 if not authenticated', async () => {
      mockIsAuthenticated.mockResolvedValue(false);

      const request = new NextRequest('http://localhost:3210/api/admin/sessions', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
      expect(mockPrisma.gameSession.findMany).not.toHaveBeenCalled();
    });

    it('should return all sessions with quiz and player data when authenticated', async () => {
      mockIsAuthenticated.mockResolvedValue(true);

      const mockSessions = [
        {
          id: 'session-1',
          sessionCode: 'ABC123',
          status: 'in_progress',
          currentQuestion: 1,
          createdAt: new Date('2025-01-01'),
          startedAt: new Date('2025-01-01'),
          finishedAt: null,
          quiz: {
            id: 1,
            title: 'Test Quiz 1',
            language: 'en',
          },
          players: [
            {
              id: 'player-1',
              playerName: 'Player 1',
              score: 100,
              isConnected: true,
              joinedAt: new Date('2025-01-01'),
            },
          ],
        },
        {
          id: 'session-2',
          sessionCode: 'XYZ789',
          status: 'finished',
          currentQuestion: 5,
          createdAt: new Date('2025-01-02'),
          startedAt: new Date('2025-01-02'),
          finishedAt: new Date('2025-01-02'),
          quiz: {
            id: 2,
            title: 'Test Quiz 2',
            language: 'de',
          },
          players: [],
        },
      ];

      mockPrisma.gameSession.findMany.mockResolvedValue(mockSessions as any);

      const request = new NextRequest('http://localhost:3210/api/admin/sessions', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.sessions).toHaveLength(2);
      expect(data.sessions[0].id).toBe('session-1');
      expect(data.sessions[0].quiz.title).toBe('Test Quiz 1');
      expect(data.sessions[0].players).toHaveLength(1);
      expect(data.sessions[1].id).toBe('session-2');
      expect(data.sessions[1].players).toHaveLength(0);

      expect(mockPrisma.gameSession.findMany).toHaveBeenCalledWith({
        include: {
          quiz: {
            select: {
              id: true,
              title: true,
              language: true,
            },
          },
          players: {
            select: {
              id: true,
              playerName: true,
              score: true,
              isConnected: true,
              joinedAt: true,
            },
            orderBy: {
              score: 'desc',
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    });

    it('should return empty array when no sessions exist', async () => {
      mockIsAuthenticated.mockResolvedValue(true);
      mockPrisma.gameSession.findMany.mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3210/api/admin/sessions', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.sessions).toEqual([]);
    });

    it('should return 500 on database error', async () => {
      mockIsAuthenticated.mockResolvedValue(true);
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockPrisma.gameSession.findMany.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3210/api/admin/sessions', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch sessions');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching sessions:', expect.any(Error));

      consoleErrorSpy.mockRestore();
    });
  });

  describe('DELETE', () => {
    it('should return 401 if not authenticated', async () => {
      mockIsAuthenticated.mockResolvedValue(false);

      const request = new NextRequest('http://localhost:3210/api/admin/sessions?sessionId=test', {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
      expect(mockPrisma.gameSession.delete).not.toHaveBeenCalled();
      expect(mockPrisma.gameSession.deleteMany).not.toHaveBeenCalled();
    });

    it('should delete a single session by sessionId', async () => {
      mockIsAuthenticated.mockResolvedValue(true);
      mockPrisma.gameSession.delete.mockResolvedValue({} as any);

      const sessionId = 'session-123';
      const request = new NextRequest(
        `http://localhost:3210/api/admin/sessions?sessionId=${sessionId}`,
        { method: 'DELETE' }
      );

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockPrisma.gameSession.delete).toHaveBeenCalledWith({
        where: { id: sessionId },
      });
    });

    it('should return 400 if sessionId is missing for single delete', async () => {
      mockIsAuthenticated.mockResolvedValue(true);

      const request = new NextRequest('http://localhost:3210/api/admin/sessions', {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Session ID is required');
      expect(mockPrisma.gameSession.delete).not.toHaveBeenCalled();
    });

    it('should clear all finished sessions when clearFinished=true', async () => {
      mockIsAuthenticated.mockResolvedValue(true);
      mockPrisma.gameSession.deleteMany.mockResolvedValue({ count: 5 } as any);

      const request = new NextRequest(
        'http://localhost:3210/api/admin/sessions?clearFinished=true',
        { method: 'DELETE' }
      );

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockPrisma.gameSession.deleteMany).toHaveBeenCalledWith({
        where: { status: 'finished' },
      });
    });

    it('should clear stale in-progress sessions when clearStaleInProgress=true', async () => {
      mockIsAuthenticated.mockResolvedValue(true);
      mockPrisma.gameSession.deleteMany.mockResolvedValue({ count: 3 } as any);

      const request = new NextRequest(
        'http://localhost:3210/api/admin/sessions?clearStaleInProgress=true',
        { method: 'DELETE' }
      );

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockPrisma.gameSession.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'in_progress',
            startedAt: expect.objectContaining({
              lt: expect.any(Date),
            }),
          }),
        })
      );
    });

    it('should clear stale waiting sessions when clearStaleWaiting=true', async () => {
      mockIsAuthenticated.mockResolvedValue(true);
      mockPrisma.gameSession.deleteMany.mockResolvedValue({ count: 2 } as any);

      const request = new NextRequest(
        'http://localhost:3210/api/admin/sessions?clearStaleWaiting=true',
        { method: 'DELETE' }
      );

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockPrisma.gameSession.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'waiting',
            createdAt: expect.objectContaining({
              lt: expect.any(Date),
            }),
          }),
        })
      );
    });

    it('should use correct time threshold for stale sessions (5 hours)', async () => {
      mockIsAuthenticated.mockResolvedValue(true);
      mockPrisma.gameSession.deleteMany.mockResolvedValue({ count: 1 } as any);

      const beforeRequest = Date.now();
      const request = new NextRequest(
        'http://localhost:3210/api/admin/sessions?clearStaleInProgress=true',
        { method: 'DELETE' }
      );
      await DELETE(request);
      const afterRequest = Date.now();

      const fiveHoursInMs = 5 * 60 * 60 * 1000;
      const expectedTimeMin = new Date(beforeRequest - fiveHoursInMs);
      const expectedTimeMax = new Date(afterRequest - fiveHoursInMs);

      const callArg = mockPrisma.gameSession.deleteMany.mock.calls[0][0];
      const actualTime = callArg.where.startedAt.lt;

      expect(actualTime.getTime()).toBeGreaterThanOrEqual(expectedTimeMin.getTime());
      expect(actualTime.getTime()).toBeLessThanOrEqual(expectedTimeMax.getTime());
    });

    it('should return 500 on database error during delete', async () => {
      mockIsAuthenticated.mockResolvedValue(true);
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockPrisma.gameSession.delete.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest(
        'http://localhost:3210/api/admin/sessions?sessionId=test',
        { method: 'DELETE' }
      );

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to delete session');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error deleting session:', expect.any(Error));

      consoleErrorSpy.mockRestore();
    });

    it('should prioritize clearFinished over sessionId parameter', async () => {
      mockIsAuthenticated.mockResolvedValue(true);
      mockPrisma.gameSession.deleteMany.mockResolvedValue({ count: 5 } as any);

      const request = new NextRequest(
        'http://localhost:3210/api/admin/sessions?clearFinished=true&sessionId=should-be-ignored',
        { method: 'DELETE' }
      );

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockPrisma.gameSession.deleteMany).toHaveBeenCalled();
      expect(mockPrisma.gameSession.delete).not.toHaveBeenCalled();
    });

    it('should prioritize clearStaleInProgress over sessionId parameter', async () => {
      mockIsAuthenticated.mockResolvedValue(true);
      mockPrisma.gameSession.deleteMany.mockResolvedValue({ count: 3 } as any);

      const request = new NextRequest(
        'http://localhost:3210/api/admin/sessions?clearStaleInProgress=true&sessionId=should-be-ignored',
        { method: 'DELETE' }
      );

      const response = await DELETE(request);

      expect(response.status).toBe(200);
      expect(mockPrisma.gameSession.deleteMany).toHaveBeenCalled();
      expect(mockPrisma.gameSession.delete).not.toHaveBeenCalled();
    });

    it('should prioritize clearStaleWaiting over sessionId parameter', async () => {
      mockIsAuthenticated.mockResolvedValue(true);
      mockPrisma.gameSession.deleteMany.mockResolvedValue({ count: 2 } as any);

      const request = new NextRequest(
        'http://localhost:3210/api/admin/sessions?clearStaleWaiting=true&sessionId=should-be-ignored',
        { method: 'DELETE' }
      );

      const response = await DELETE(request);

      expect(response.status).toBe(200);
      expect(mockPrisma.gameSession.deleteMany).toHaveBeenCalled();
      expect(mockPrisma.gameSession.delete).not.toHaveBeenCalled();
    });
  });
});
