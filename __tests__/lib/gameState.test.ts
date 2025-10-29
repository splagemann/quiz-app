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

  describe('cleanupSession', () => {
    it('should remove session from state', () => {
      gameStateManager.initSession(sessionId);
      expect(gameStateManager.getSession(sessionId)).toBeDefined();

      gameStateManager.cleanupSession(sessionId);
      expect(gameStateManager.getSession(sessionId)).toBeUndefined();
    });

    it('should handle cleanup of non-existent session', () => {
      expect(() => {
        gameStateManager.cleanupSession('NONEXISTENT');
      }).not.toThrow();
    });
  });
});
