/**
 * Game event types for real-time communication
 */

export type Player = {
  id: string;
  playerName: string;
  score: number;
  isConnected: boolean;
  avatarSeed?: string | null;
};

export type GameEvent =
  | { type: 'player_joined'; player: Player }
  | { type: 'player_left'; playerId: string; playerName: string }
  | { type: 'avatar_changed'; playerId: string; playerName: string; avatarSeed: string }
  | { type: 'game_started'; contentType: 'question' | 'page'; contentId: number; contentIndex: number }
  | { type: 'player_answered'; playerId: string; playerName: string }
  | { type: 'all_players_answered' }
  | { type: 'reveal_answer'; correctAnswerId: number; scores: Record<string, number> }
  | { type: 'next_content'; contentType: 'question' | 'page'; contentId: number; contentIndex: number }
  | { type: 'page_displayed'; pageId: number; pageIndex: number }
  | { type: 'game_finished'; finalScores: Array<{ playerId: string; playerName: string; score: number; avatarSeed?: string | null }> }
  | { type: 'session_ended' };

/**
 * Format event for Server-Sent Events
 */
export function formatSSEMessage(event: GameEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}
