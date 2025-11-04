/**
 * @jest-environment node
 */

import { PATCH } from '@/app/api/admin/sessions/[sessionId]/players/[playerId]/mark-winner/route';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAuthenticated } from '@/lib/auth';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    player: {
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}));

jest.mock('@/lib/auth', () => ({
  isAuthenticated: jest.fn(),
}));

describe('/api/admin/sessions/[sessionId]/players/[playerId]/mark-winner', () => {
  const mockPrisma = prisma as jest.Mocked<typeof prisma>;
  const mockIsAuthenticated = isAuthenticated as jest.MockedFunction<typeof isAuthenticated>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('PATCH', () => {
    it('should return 401 if not authenticated', async () => {
      mockIsAuthenticated.mockResolvedValue(false);

      const request = new NextRequest(
        'http://localhost:3210/api/admin/sessions/session-1/players/player-1/mark-winner',
        { method: 'PATCH' }
      );

      const response = await PATCH(request, {
        params: Promise.resolve({ sessionId: 'session-1', playerId: 'player-1' }),
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
      expect(mockPrisma.player.findUnique).not.toHaveBeenCalled();
    });

    it('should return 404 if player does not exist', async () => {
      mockIsAuthenticated.mockResolvedValue(true);
      mockPrisma.player.findUnique.mockResolvedValue(null);

      const request = new NextRequest(
        'http://localhost:3210/api/admin/sessions/session-1/players/player-999/mark-winner',
        { method: 'PATCH' }
      );

      const response = await PATCH(request, {
        params: Promise.resolve({ sessionId: 'session-1', playerId: 'player-999' }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Player not found');
      expect(mockPrisma.player.findUnique).toHaveBeenCalledWith({
        where: { id: 'player-999' },
        select: {
          id: true,
          sessionId: true,
          markedToWin: true,
        },
      });
    });

    it('should return 400 if player does not belong to the session', async () => {
      mockIsAuthenticated.mockResolvedValue(true);
      mockPrisma.player.findUnique.mockResolvedValue({
        id: 'player-1',
        sessionId: 'session-2',
        markedToWin: false,
      } as any);

      const request = new NextRequest(
        'http://localhost:3210/api/admin/sessions/session-1/players/player-1/mark-winner',
        { method: 'PATCH' }
      );

      const response = await PATCH(request, {
        params: Promise.resolve({ sessionId: 'session-1', playerId: 'player-1' }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Player does not belong to this session');
    });

    it('should mark player to win and unmark other players in the session', async () => {
      mockIsAuthenticated.mockResolvedValue(true);

      const mockPlayer = {
        id: 'player-1',
        sessionId: 'session-1',
        markedToWin: false,
      };

      const mockUpdatedPlayer = {
        id: 'player-1',
        playerName: 'Player 1',
        score: 100,
        isConnected: true,
        markedToWin: true,
        joinedAt: new Date('2025-01-01'),
      };

      mockPrisma.player.findUnique.mockResolvedValue(mockPlayer as any);
      mockPrisma.player.updateMany.mockResolvedValue({ count: 2 } as any);
      mockPrisma.player.update.mockResolvedValue(mockUpdatedPlayer as any);

      const request = new NextRequest(
        'http://localhost:3210/api/admin/sessions/session-1/players/player-1/mark-winner',
        { method: 'PATCH' }
      );

      const response = await PATCH(request, {
        params: Promise.resolve({ sessionId: 'session-1', playerId: 'player-1' }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.player.markedToWin).toBe(true);
      expect(data.player.id).toBe('player-1');
      expect(data.player.playerName).toBe('Player 1');

      // Verify other players were unmarked
      expect(mockPrisma.player.updateMany).toHaveBeenCalledWith({
        where: {
          sessionId: 'session-1',
          id: { not: 'player-1' },
        },
        data: {
          markedToWin: false,
        },
      });

      // Verify the target player was updated
      expect(mockPrisma.player.update).toHaveBeenCalledWith({
        where: { id: 'player-1' },
        data: {
          markedToWin: true,
        },
        select: {
          id: true,
          playerName: true,
          score: true,
          isConnected: true,
          markedToWin: true,
          joinedAt: true,
        },
      });
    });

    it('should unmark player without unmarking other players', async () => {
      mockIsAuthenticated.mockResolvedValue(true);

      const mockPlayer = {
        id: 'player-1',
        sessionId: 'session-1',
        markedToWin: true,
      };

      const mockUpdatedPlayer = {
        id: 'player-1',
        playerName: 'Player 1',
        score: 100,
        isConnected: true,
        markedToWin: false,
        joinedAt: new Date('2025-01-01'),
      };

      mockPrisma.player.findUnique.mockResolvedValue(mockPlayer as any);
      mockPrisma.player.update.mockResolvedValue(mockUpdatedPlayer as any);

      const request = new NextRequest(
        'http://localhost:3210/api/admin/sessions/session-1/players/player-1/mark-winner',
        { method: 'PATCH' }
      );

      const response = await PATCH(request, {
        params: Promise.resolve({ sessionId: 'session-1', playerId: 'player-1' }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.player.markedToWin).toBe(false);

      // Verify updateMany was NOT called (no need to unmark others when unmarking)
      expect(mockPrisma.player.updateMany).not.toHaveBeenCalled();

      // Verify the target player was updated
      expect(mockPrisma.player.update).toHaveBeenCalledWith({
        where: { id: 'player-1' },
        data: {
          markedToWin: false,
        },
        select: {
          id: true,
          playerName: true,
          score: true,
          isConnected: true,
          markedToWin: true,
          joinedAt: true,
        },
      });
    });

    it('should return 500 on database error during findUnique', async () => {
      mockIsAuthenticated.mockResolvedValue(true);
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockPrisma.player.findUnique.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest(
        'http://localhost:3210/api/admin/sessions/session-1/players/player-1/mark-winner',
        { method: 'PATCH' }
      );

      const response = await PATCH(request, {
        params: Promise.resolve({ sessionId: 'session-1', playerId: 'player-1' }),
      });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to update player');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error toggling markedToWin:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('should return 500 on database error during update', async () => {
      mockIsAuthenticated.mockResolvedValue(true);
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const mockPlayer = {
        id: 'player-1',
        sessionId: 'session-1',
        markedToWin: false,
      };

      mockPrisma.player.findUnique.mockResolvedValue(mockPlayer as any);
      mockPrisma.player.updateMany.mockResolvedValue({ count: 2 } as any);
      mockPrisma.player.update.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest(
        'http://localhost:3210/api/admin/sessions/session-1/players/player-1/mark-winner',
        { method: 'PATCH' }
      );

      const response = await PATCH(request, {
        params: Promise.resolve({ sessionId: 'session-1', playerId: 'player-1' }),
      });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to update player');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error toggling markedToWin:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('should handle mutual exclusion correctly with multiple players', async () => {
      mockIsAuthenticated.mockResolvedValue(true);

      const mockPlayer = {
        id: 'player-2',
        sessionId: 'session-1',
        markedToWin: false,
      };

      const mockUpdatedPlayer = {
        id: 'player-2',
        playerName: 'Player 2',
        score: 50,
        isConnected: true,
        markedToWin: true,
        joinedAt: new Date('2025-01-01'),
      };

      mockPrisma.player.findUnique.mockResolvedValue(mockPlayer as any);
      mockPrisma.player.updateMany.mockResolvedValue({ count: 3 } as any); // 3 other players unmarked
      mockPrisma.player.update.mockResolvedValue(mockUpdatedPlayer as any);

      const request = new NextRequest(
        'http://localhost:3210/api/admin/sessions/session-1/players/player-2/mark-winner',
        { method: 'PATCH' }
      );

      const response = await PATCH(request, {
        params: Promise.resolve({ sessionId: 'session-1', playerId: 'player-2' }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.player.id).toBe('player-2');
      expect(data.player.markedToWin).toBe(true);

      // Verify all other players in the session were unmarked
      expect(mockPrisma.player.updateMany).toHaveBeenCalledWith({
        where: {
          sessionId: 'session-1',
          id: { not: 'player-2' },
        },
        data: {
          markedToWin: false,
        },
      });
    });
  });
});
