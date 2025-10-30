import { gameStateManager } from '@/lib/gameState';

describe('GameStateManager', () => {
  const sessionId = 'TEST123';

  beforeEach(() => {
    // Clean up any existing session
    gameStateManager.cleanupSession(sessionId);
  });

  afterEach(() => {
    gameStateManager.cleanupSession(sessionId);
  });

  describe('initSession', () => {
    it('should initialize a new session', () => {
      gameStateManager.initSession(sessionId);
      const session = gameStateManager.getSession(sessionId);

      expect(session).toBeDefined();
      expect(session?.sessionId).toBe(sessionId);
    });

    it('should not reinitialize an existing session', () => {
      gameStateManager.initSession(sessionId);
      gameStateManager.markPlayerAnswered(sessionId, 'player1');

      // Try to reinit
      gameStateManager.initSession(sessionId);

      // Player should still be marked as answered
      expect(gameStateManager.haveAllAnswered(sessionId, 1)).toBe(true);
    });
  });

  describe('answer tracking', () => {
    beforeEach(() => {
      gameStateManager.initSession(sessionId);
    });

    it('should mark players as answered', () => {
      gameStateManager.markPlayerAnswered(sessionId, 'player1');
      expect(gameStateManager.haveAllAnswered(sessionId, 1)).toBe(true);
    });

    it('should track multiple players', () => {
      gameStateManager.markPlayerAnswered(sessionId, 'player1');
      expect(gameStateManager.haveAllAnswered(sessionId, 2)).toBe(false);

      gameStateManager.markPlayerAnswered(sessionId, 'player2');
      expect(gameStateManager.haveAllAnswered(sessionId, 2)).toBe(true);
    });

    it('should reset answers for next question', () => {
      gameStateManager.markPlayerAnswered(sessionId, 'player1');
      gameStateManager.markPlayerAnswered(sessionId, 'player2');

      gameStateManager.resetAnswers(sessionId);

      expect(gameStateManager.haveAllAnswered(sessionId, 2)).toBe(false);
    });
  });

  describe('client management', () => {
    let mockWriter: WritableStreamDefaultWriter;

    beforeEach(() => {
      gameStateManager.initSession(sessionId);
      mockWriter = {
        write: jest.fn().mockResolvedValue(undefined),
        close: jest.fn().mockResolvedValue(undefined),
      } as unknown as WritableStreamDefaultWriter;
    });

    it('should add client to session', () => {
      gameStateManager.addClient(sessionId, mockWriter);
      const session = gameStateManager.getSession(sessionId);
      expect(session?.clients.has(mockWriter)).toBe(true);
    });

    it('should not add client to non-existent session', () => {
      gameStateManager.addClient('NONEXISTENT', mockWriter);
      // Should not throw, just silently fail
    });

    it('should remove client from session', () => {
      gameStateManager.addClient(sessionId, mockWriter);
      gameStateManager.removeClient(sessionId, mockWriter);
      const session = gameStateManager.getSession(sessionId);
      expect(session?.clients.has(mockWriter)).toBe(false);
    });

    it('should not remove client from non-existent session', () => {
      expect(() => {
        gameStateManager.removeClient('NONEXISTENT', mockWriter);
      }).not.toThrow();
    });
  });

  describe('broadcast', () => {
    let mockWriter1: WritableStreamDefaultWriter;
    let mockWriter2: WritableStreamDefaultWriter;

    beforeEach(() => {
      gameStateManager.initSession(sessionId);
      mockWriter1 = {
        write: jest.fn().mockResolvedValue(undefined),
        close: jest.fn().mockResolvedValue(undefined),
      } as unknown as WritableStreamDefaultWriter;
      mockWriter2 = {
        write: jest.fn().mockResolvedValue(undefined),
        close: jest.fn().mockResolvedValue(undefined),
      } as unknown as WritableStreamDefaultWriter;
    });

    it('should broadcast event to all connected clients', async () => {
      gameStateManager.addClient(sessionId, mockWriter1);
      gameStateManager.addClient(sessionId, mockWriter2);

      const event = { type: 'player_joined' as const, player: { id: '1', playerName: 'Test', score: 0, isConnected: true } };
      await gameStateManager.broadcast(sessionId, event);

      expect(mockWriter1.write).toHaveBeenCalled();
      expect(mockWriter2.write).toHaveBeenCalled();
    });

    it('should handle broadcast to non-existent session', async () => {
      const event = { type: 'player_joined' as const, player: { id: '1', playerName: 'Test', score: 0, isConnected: true } };
      await expect(gameStateManager.broadcast('NONEXISTENT', event)).resolves.not.toThrow();
    });

    it('should remove dead clients after failed write', async () => {
      const deadWriter = {
        write: jest.fn().mockRejectedValue(new Error('Connection closed')),
        close: jest.fn().mockResolvedValue(undefined),
      } as unknown as WritableStreamDefaultWriter;

      gameStateManager.addClient(sessionId, mockWriter1);
      gameStateManager.addClient(sessionId, deadWriter);

      const event = { type: 'player_joined' as const, player: { id: '1', playerName: 'Test', score: 0, isConnected: true } };
      await gameStateManager.broadcast(sessionId, event);

      const session = gameStateManager.getSession(sessionId);
      expect(session?.clients.has(deadWriter)).toBe(false);
      expect(session?.clients.has(mockWriter1)).toBe(true);
    });
  });

  describe('cleanupSession', () => {
    it('should remove session from state', () => {
      gameStateManager.initSession(sessionId);
      expect(gameStateManager.getSession(sessionId)).toBeDefined();

      gameStateManager.cleanupSession(sessionId);
      expect(gameStateManager.getSession(sessionId)).toBeUndefined();
    });

    it('should close all client connections on cleanup', async () => {
      gameStateManager.initSession(sessionId);

      const mockWriter1 = {
        write: jest.fn().mockResolvedValue(undefined),
        close: jest.fn().mockResolvedValue(undefined),
      } as unknown as WritableStreamDefaultWriter;

      const mockWriter2 = {
        write: jest.fn().mockResolvedValue(undefined),
        close: jest.fn().mockResolvedValue(undefined),
      } as unknown as WritableStreamDefaultWriter;

      gameStateManager.addClient(sessionId, mockWriter1);
      gameStateManager.addClient(sessionId, mockWriter2);

      gameStateManager.cleanupSession(sessionId);

      // Give async operations time to complete
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockWriter1.close).toHaveBeenCalled();
      expect(mockWriter2.close).toHaveBeenCalled();
    });

    it('should handle cleanup of non-existent session', () => {
      expect(() => {
        gameStateManager.cleanupSession('NONEXISTENT');
      }).not.toThrow();
    });

    it('should handle errors when closing clients', async () => {
      gameStateManager.initSession(sessionId);

      const mockWriter = {
        write: jest.fn().mockResolvedValue(undefined),
        close: jest.fn().mockRejectedValue(new Error('Close failed')),
      } as unknown as WritableStreamDefaultWriter;

      gameStateManager.addClient(sessionId, mockWriter);

      expect(() => {
        gameStateManager.cleanupSession(sessionId);
      }).not.toThrow();

      expect(gameStateManager.getSession(sessionId)).toBeUndefined();
    });
  });
});
