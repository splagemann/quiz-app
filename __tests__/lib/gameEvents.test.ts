import { formatSSEMessage } from '@/lib/gameEvents';
import type { GameEvent } from '@/lib/gameEvents';

describe('gameEvents', () => {
  describe('formatSSEMessage', () => {
    it('should format player_joined event', () => {
      const event: GameEvent = {
        type: 'player_joined',
        player: {
          id: '123',
          playerName: 'TestPlayer',
          score: 0,
          isConnected: true,
        },
      };

      const result = formatSSEMessage(event);
      expect(result).toBe(`data: ${JSON.stringify(event)}\n\n`);
      expect(result).toContain('player_joined');
      expect(result).toContain('TestPlayer');
    });

    it('should format player_left event', () => {
      const event: GameEvent = {
        type: 'player_left',
        playerId: '123',
        playerName: 'TestPlayer',
      };

      const result = formatSSEMessage(event);
      expect(result).toBe(`data: ${JSON.stringify(event)}\n\n`);
      expect(result).toContain('player_left');
    });

    it('should format game_started event', () => {
      const event: GameEvent = {
        type: 'game_started',
        questionId: 1,
        questionIndex: 0,
      };

      const result = formatSSEMessage(event);
      expect(result).toBe(`data: ${JSON.stringify(event)}\n\n`);
      expect(result).toContain('game_started');
    });

    it('should format player_answered event', () => {
      const event: GameEvent = {
        type: 'player_answered',
        playerId: '123',
        playerName: 'TestPlayer',
      };

      const result = formatSSEMessage(event);
      expect(result).toBe(`data: ${JSON.stringify(event)}\n\n`);
      expect(result).toContain('player_answered');
    });

    it('should format all_players_answered event', () => {
      const event: GameEvent = {
        type: 'all_players_answered',
      };

      const result = formatSSEMessage(event);
      expect(result).toBe(`data: ${JSON.stringify(event)}\n\n`);
      expect(result).toContain('all_players_answered');
    });

    it('should format reveal_answer event', () => {
      const event: GameEvent = {
        type: 'reveal_answer',
        correctAnswerId: 1,
        scores: { '123': 100, '456': 50 },
      };

      const result = formatSSEMessage(event);
      expect(result).toBe(`data: ${JSON.stringify(event)}\n\n`);
      expect(result).toContain('reveal_answer');
    });

    it('should format next_question event', () => {
      const event: GameEvent = {
        type: 'next_question',
        questionId: 2,
        questionIndex: 1,
      };

      const result = formatSSEMessage(event);
      expect(result).toBe(`data: ${JSON.stringify(event)}\n\n`);
      expect(result).toContain('next_question');
    });

    it('should format game_finished event', () => {
      const event: GameEvent = {
        type: 'game_finished',
        finalScores: [
          { playerId: '123', playerName: 'Player1', score: 100 },
          { playerId: '456', playerName: 'Player2', score: 50 },
        ],
      };

      const result = formatSSEMessage(event);
      expect(result).toBe(`data: ${JSON.stringify(event)}\n\n`);
      expect(result).toContain('game_finished');
    });

    it('should format session_ended event', () => {
      const event: GameEvent = {
        type: 'session_ended',
      };

      const result = formatSSEMessage(event);
      expect(result).toBe(`data: ${JSON.stringify(event)}\n\n`);
      expect(result).toContain('session_ended');
    });

    it('should end with double newline for SSE format', () => {
      const event: GameEvent = {
        type: 'all_players_answered',
      };

      const result = formatSSEMessage(event);
      expect(result.endsWith('\n\n')).toBe(true);
    });

    it('should start with data: prefix', () => {
      const event: GameEvent = {
        type: 'all_players_answered',
      };

      const result = formatSSEMessage(event);
      expect(result.startsWith('data: ')).toBe(true);
    });
  });
});
