/**
 * @jest-environment node
 */

import { POST } from '@/app/api/game/players/route';
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
      create: jest.fn(),
    },
  },
}));

jest.mock('@/lib/gameState', () => ({
  gameStateManager: {
    broadcast: jest.fn(),
  },
}));

describe('/api/game/players', () => {
  const mockPrisma = prisma as jest.Mocked<typeof prisma>;
  const mockGameStateManager = gameStateManager as jest.Mocked<typeof gameStateManager>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST', () => {
    it('should allow player to join a game session', async () => {
      const mockSession = {
        id: 'session-123',
        sessionCode: 'ABC123',
        status: 'waiting',
        players: [],
      };

      const mockPlayer = {
        id: 'player-456',
        sessionId: 'session-123',
        playerName: 'TestPlayer',
        score: 0,
        isConnected: true,
      };

      mockPrisma.gameSession.findUnique.mockResolvedValue(mockSession as any);
      mockPrisma.player.create.mockResolvedValue(mockPlayer as any);
      mockGameStateManager.broadcast.mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost:3210/api/game/players', {
        method: 'POST',
        body: JSON.stringify({
          sessionCode: 'ABC123',
          playerName: 'TestPlayer',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.playerId).toBe('player-456');
      expect(data.sessionId).toBe('session-123');
      expect(data.playerName).toBe('TestPlayer');
      expect(mockGameStateManager.broadcast).toHaveBeenCalledWith('session-123', {
        type: 'player_joined',
        player: {
          id: 'player-456',
          playerName: 'TestPlayer',
          score: 0,
          isConnected: true,
        },
      });
    });

    it('should return 400 if sessionCode is missing', async () => {
      const request = new NextRequest('http://localhost:3210/api/game/players', {
        method: 'POST',
        body: JSON.stringify({ playerName: 'TestPlayer' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('erforderlich');
    });

    it('should return 400 if playerName is missing', async () => {
      const request = new NextRequest('http://localhost:3210/api/game/players', {
        method: 'POST',
        body: JSON.stringify({ sessionCode: 'ABC123' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('erforderlich');
    });

    it('should return 400 if playerName is too short', async () => {
      const request = new NextRequest('http://localhost:3210/api/game/players', {
        method: 'POST',
        body: JSON.stringify({
          sessionCode: 'ABC123',
          playerName: 'A',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('2 und 20 Zeichen');
    });

    it('should return 400 if playerName is too long', async () => {
      const request = new NextRequest('http://localhost:3210/api/game/players', {
        method: 'POST',
        body: JSON.stringify({
          sessionCode: 'ABC123',
          playerName: 'A'.repeat(21),
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('2 und 20 Zeichen');
    });

    it('should return 404 if session does not exist', async () => {
      mockPrisma.gameSession.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3210/api/game/players', {
        method: 'POST',
        body: JSON.stringify({
          sessionCode: 'INVALID',
          playerName: 'TestPlayer',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('nicht gefunden');
    });

    it('should return 400 if game has already started', async () => {
      const mockSession = {
        id: 'session-123',
        sessionCode: 'ABC123',
        status: 'in_progress',
        players: [],
      };

      mockPrisma.gameSession.findUnique.mockResolvedValue(mockSession as any);

      const request = new NextRequest('http://localhost:3210/api/game/players', {
        method: 'POST',
        body: JSON.stringify({
          sessionCode: 'ABC123',
          playerName: 'TestPlayer',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('bereits begonnen');
    });

    it('should return 400 if playerName is already taken', async () => {
      const mockSession = {
        id: 'session-123',
        sessionCode: 'ABC123',
        status: 'waiting',
        players: [
          { id: 'player-1', playerName: 'TestPlayer' },
        ],
      };

      mockPrisma.gameSession.findUnique.mockResolvedValue(mockSession as any);

      const request = new NextRequest('http://localhost:3210/api/game/players', {
        method: 'POST',
        body: JSON.stringify({
          sessionCode: 'ABC123',
          playerName: 'TestPlayer',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('bereits vergeben');
    });

    it('should handle case-insensitive name checking', async () => {
      const mockSession = {
        id: 'session-123',
        sessionCode: 'ABC123',
        status: 'waiting',
        players: [
          { id: 'player-1', playerName: 'TestPlayer' },
        ],
      };

      mockPrisma.gameSession.findUnique.mockResolvedValue(mockSession as any);

      const request = new NextRequest('http://localhost:3210/api/game/players', {
        method: 'POST',
        body: JSON.stringify({
          sessionCode: 'ABC123',
          playerName: 'testplayer', // lowercase
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('bereits vergeben');
    });

    it('should trim playerName before saving', async () => {
      const mockSession = {
        id: 'session-123',
        sessionCode: 'ABC123',
        status: 'waiting',
        players: [],
      };

      const mockPlayer = {
        id: 'player-456',
        sessionId: 'session-123',
        playerName: 'TestPlayer',
        score: 0,
        isConnected: true,
      };

      mockPrisma.gameSession.findUnique.mockResolvedValue(mockSession as any);
      mockPrisma.player.create.mockResolvedValue(mockPlayer as any);

      const request = new NextRequest('http://localhost:3210/api/game/players', {
        method: 'POST',
        body: JSON.stringify({
          sessionCode: 'ABC123',
          playerName: '  TestPlayer  ',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockPrisma.player.create).toHaveBeenCalledWith({
        data: {
          sessionId: 'session-123',
          playerName: 'TestPlayer',
        },
      });
    });

    it('should convert sessionCode to uppercase', async () => {
      const mockSession = {
        id: 'session-123',
        sessionCode: 'ABC123',
        status: 'waiting',
        players: [],
      };

      const mockPlayer = {
        id: 'player-456',
        sessionId: 'session-123',
        playerName: 'TestPlayer',
        score: 0,
        isConnected: true,
      };

      mockPrisma.gameSession.findUnique.mockResolvedValue(mockSession as any);
      mockPrisma.player.create.mockResolvedValue(mockPlayer as any);

      const request = new NextRequest('http://localhost:3210/api/game/players', {
        method: 'POST',
        body: JSON.stringify({
          sessionCode: 'abc123', // lowercase
          playerName: 'TestPlayer',
        }),
      });

      await POST(request);

      expect(mockPrisma.gameSession.findUnique).toHaveBeenCalledWith({
        where: { sessionCode: 'ABC123' },
        include: { players: true },
      });
    });

    it('should return 500 on database error', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      mockPrisma.gameSession.findUnique.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3210/api/game/players', {
        method: 'POST',
        body: JSON.stringify({
          sessionCode: 'ABC123',
          playerName: 'TestPlayer',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Fehler');

      consoleErrorSpy.mockRestore();
    });
  });
});
