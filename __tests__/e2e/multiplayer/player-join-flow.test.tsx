/**
 * @jest-environment node
 */

import { POST as createSession } from '@/app/api/game/session/route';
import { POST as joinGame } from '@/app/api/game/players/route';
import { POST as submitAnswer } from '@/app/api/game/players/[playerId]/answer/route';
import { NextRequest } from 'next/server';
import {
  createTestQuiz,
  createTestSession,
  createTestPlayer,
  cleanupTestQuiz,
  type TestQuiz,
} from '../utils/test-helpers';
import { prisma } from '@/lib/prisma';

describe('Multiplayer E2E - Player Join Flow', () => {
  let testQuiz: TestQuiz;
  let sessionId: string;
  let sessionCode: string;

  beforeEach(async () => {
    // Create a test quiz
    testQuiz = await createTestQuiz({
      title: 'Player Join Test Quiz',
      questionCount: 2,
      answersPerQuestion: 3,
      language: 'en',
    });
  });

  afterEach(async () => {
    if (testQuiz) {
      await cleanupTestQuiz(testQuiz.id);
    }
  });

  describe('Player Joins via Session Code', () => {
    beforeEach(async () => {
      // Create a session for each test
      const session = await createTestSession(testQuiz.id);
      sessionId = session.id;
      sessionCode = session.sessionCode;
    });

    it('should successfully join game with valid session code', async () => {
      const request = new NextRequest('http://localhost:3210/api/game/players', {
        method: 'POST',
        body: JSON.stringify({
          sessionCode: sessionCode,
          playerName: 'Test Player',
        }),
      });

      const response = await joinGame(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.playerId).toBeDefined();
      expect(data.sessionId).toBe(sessionId);
      expect(data.playerName).toBe('Test Player');
    });

    it('should reject join with invalid session code', async () => {
      const request = new NextRequest('http://localhost:3210/api/game/players', {
        method: 'POST',
        body: JSON.stringify({
          sessionCode: 'INVALID',
          playerName: 'Test Player',
        }),
      });

      const response = await joinGame(request);
      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    it('should reject join with duplicate player name', async () => {
      const playerName = 'Duplicate Player';

      // First player joins successfully
      const request1 = new NextRequest('http://localhost:3210/api/game/players', {
        method: 'POST',
        body: JSON.stringify({
          sessionCode: sessionCode,
          playerName: playerName,
        }),
      });

      const response1 = await joinGame(request1);
      expect(response1.status).toBe(200);

      // Second player tries to join with same name
      const request2 = new NextRequest('http://localhost:3210/api/game/players', {
        method: 'POST',
        body: JSON.stringify({
          sessionCode: sessionCode,
          playerName: playerName,
        }),
      });

      const response2 = await joinGame(request2);
      expect(response2.status).toBe(400);

      const data = await response2.json();
      expect(data.error).toBeDefined();
      // Error message is in German: "Dieser Name ist bereits vergeben"
      expect(data.error).toMatch(/vergeben|taken/i);
    });

    it('should reject join with invalid player name (too short)', async () => {
      const request = new NextRequest('http://localhost:3210/api/game/players', {
        method: 'POST',
        body: JSON.stringify({
          sessionCode: sessionCode,
          playerName: 'A', // Only 1 character, minimum is 2
        }),
      });

      const response = await joinGame(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    it('should reject join with invalid player name (too long)', async () => {
      const request = new NextRequest('http://localhost:3210/api/game/players', {
        method: 'POST',
        body: JSON.stringify({
          sessionCode: sessionCode,
          playerName: 'A'.repeat(21), // 21 characters, maximum is 20
        }),
      });

      const response = await joinGame(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    it('should reject join when game has already started', async () => {
      // Add a player and start the game
      await createTestPlayer(sessionId, 'Player 1');

      // Update session status to in_progress
      await prisma.gameSession.update({
        where: { id: sessionId },
        data: { status: 'in_progress', startedAt: new Date() },
      });

      // Try to join after game started
      const request = new NextRequest('http://localhost:3210/api/game/players', {
        method: 'POST',
        body: JSON.stringify({
          sessionCode: sessionCode,
          playerName: 'Late Player',
        }),
      });

      const response = await joinGame(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBeDefined();
      // Error message is in German: "Dieses Spiel hat bereits begonnen"
      expect(data.error).toMatch(/bereits begonnen|already started/i);
    });
  });

  describe('Player Submits Answers', () => {
    let playerId: string;

    beforeEach(async () => {
      // Create session
      const session = await createTestSession(testQuiz.id);
      sessionId = session.id;
      sessionCode = session.sessionCode;

      // Join as player
      const joinRequest = new NextRequest('http://localhost:3210/api/game/players', {
        method: 'POST',
        body: JSON.stringify({
          sessionCode: sessionCode,
          playerName: 'Test Player',
        }),
      });

      const joinResponse = await joinGame(joinRequest);
      const joinData = await joinResponse.json();
      playerId = joinData.playerId;

      // Start game
      await prisma.gameSession.update({
        where: { id: sessionId },
        data: {
          status: 'in_progress',
          startedAt: new Date(),
          currentQuestion: 0,
        },
      });
    });

    it('should successfully submit answer', async () => {
      const firstQuestion = testQuiz.questions[0];
      const correctAnswer = firstQuestion.answers.find(a => a.isCorrect);

      const request = new NextRequest(
        `http://localhost:3210/api/game/players/${playerId}/answer`,
        {
          method: 'POST',
          body: JSON.stringify({
            questionId: firstQuestion.id,
            answerId: correctAnswer!.id,
          }),
        }
      );

      const response = await submitAnswer(request, { params: { playerId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.isCorrect).toBe(true);

      // Check score in database
      const player = await prisma.player.findUnique({
        where: { id: playerId },
      });
      expect(player?.score).toBeGreaterThan(0);
    });

    it('should award points for correct answer', async () => {
      const firstQuestion = testQuiz.questions[0];
      const correctAnswer = firstQuestion.answers.find(a => a.isCorrect);

      const request = new NextRequest(
        `http://localhost:3210/api/game/players/${playerId}/answer`,
        {
          method: 'POST',
          body: JSON.stringify({
            questionId: firstQuestion.id,
            answerId: correctAnswer!.id,
          }),
        }
      );

      const response = await submitAnswer(request, { params: { playerId } });
      const data = await response.json();

      expect(data.isCorrect).toBe(true);

      // Verify score in database
      const player = await prisma.player.findUnique({
        where: { id: playerId },
      });
      expect(player?.score).toBeGreaterThan(0);
    });

    it('should not award points for incorrect answer', async () => {
      const firstQuestion = testQuiz.questions[0];
      const incorrectAnswer = firstQuestion.answers.find(a => !a.isCorrect);

      const request = new NextRequest(
        `http://localhost:3210/api/game/players/${playerId}/answer`,
        {
          method: 'POST',
          body: JSON.stringify({
            questionId: firstQuestion.id,
            answerId: incorrectAnswer!.id,
          }),
        }
      );

      const response = await submitAnswer(request, { params: { playerId } });
      const data = await response.json();

      expect(data.isCorrect).toBe(false);

      // Verify score in database
      const player = await prisma.player.findUnique({
        where: { id: playerId },
      });
      expect(player?.score).toBe(0);
    });

    it('should reject duplicate answer submission', async () => {
      const firstQuestion = testQuiz.questions[0];
      const correctAnswer = firstQuestion.answers.find(a => a.isCorrect);

      // Submit first answer
      const request1 = new NextRequest(
        `http://localhost:3210/api/game/players/${playerId}/answer`,
        {
          method: 'POST',
          body: JSON.stringify({
            questionId: firstQuestion.id,
            answerId: correctAnswer!.id,
          }),
        }
      );

      const response1 = await submitAnswer(request1, { params: { playerId } });
      expect(response1.status).toBe(200);

      // Try to submit again
      const request2 = new NextRequest(
        `http://localhost:3210/api/game/players/${playerId}/answer`,
        {
          method: 'POST',
          body: JSON.stringify({
            questionId: firstQuestion.id,
            answerId: correctAnswer!.id,
          }),
        }
      );

      const response2 = await submitAnswer(request2, { params: { playerId } });
      expect(response2.status).toBe(400);

      const data = await response2.json();
      expect(data.error).toBeDefined();
    });

    it('should reject answer for non-existent question', async () => {
      const request = new NextRequest(
        `http://localhost:3210/api/game/players/${playerId}/answer`,
        {
          method: 'POST',
          body: JSON.stringify({
            questionId: 99999,
            answerId: 99999,
          }),
        }
      );

      const response = await submitAnswer(request, { params: { playerId } });
      expect(response.status).toBe(400);
    });
  });

  describe('Player Connection State', () => {
    it('should mark player as connected when joining', async () => {
      const session = await createTestSession(testQuiz.id);
      sessionId = session.id;
      sessionCode = session.sessionCode;

      const request = new NextRequest('http://localhost:3210/api/game/players', {
        method: 'POST',
        body: JSON.stringify({
          sessionCode: sessionCode,
          playerName: 'Connected Player',
        }),
      });

      const response = await joinGame(request);
      const data = await response.json();

      // Verify player is marked as connected in database
      const player = await prisma.player.findUnique({
        where: { id: data.playerId },
      });

      expect(player?.isConnected).toBe(true);
    });

    it('should track multiple players in same session', async () => {
      const session = await createTestSession(testQuiz.id);
      sessionId = session.id;
      sessionCode = session.sessionCode;

      // Join as first player
      const request1 = new NextRequest('http://localhost:3210/api/game/players', {
        method: 'POST',
        body: JSON.stringify({
          sessionCode: sessionCode,
          playerName: 'Player 1',
        }),
      });
      await joinGame(request1);

      // Join as second player
      const request2 = new NextRequest('http://localhost:3210/api/game/players', {
        method: 'POST',
        body: JSON.stringify({
          sessionCode: sessionCode,
          playerName: 'Player 2',
        }),
      });
      await joinGame(request2);

      // Verify both players are in session
      const players = await prisma.player.findMany({
        where: { sessionId },
      });

      expect(players).toHaveLength(2);
      expect(players.map(p => p.playerName)).toContain('Player 1');
      expect(players.map(p => p.playerName)).toContain('Player 2');
    });
  });
});
