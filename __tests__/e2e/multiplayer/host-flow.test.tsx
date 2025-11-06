/**
 * @jest-environment node
 */

import { POST as createSession } from '@/app/api/game/session/route';
import { GET as getSession } from '@/app/api/game/session/[sessionId]/route';
import { POST as startGame } from '@/app/api/game/session/[sessionId]/start/route';
import { POST as nextQuestion } from '@/app/api/game/session/[sessionId]/next/route';
import { POST as revealAnswer } from '@/app/api/game/session/[sessionId]/reveal/route';
import { POST as submitAnswer } from '@/app/api/game/players/[playerId]/answer/route';
import { NextRequest } from 'next/server';
import {
  createTestQuiz,
  createTestPlayer,
  cleanupTestQuiz,
  type TestQuiz,
} from '../utils/test-helpers';
import { gameStateManager } from '@/lib/gameState';
import { prisma } from '@/lib/prisma';

describe('Multiplayer E2E - Host Flow', () => {
  let testQuiz: TestQuiz;
  let sessionId: string;
  let sessionCode: string;

  beforeEach(async () => {
    // Create a test quiz with 2 questions, 3 answers each
    testQuiz = await createTestQuiz({
      title: 'Multiplayer Host Test Quiz',
      questionCount: 2,
      answersPerQuestion: 3,
      language: 'en',
    });
  });

  afterEach(async () => {
    // Cleanup
    if (sessionId) {
      try {
        gameStateManager.cleanupSession(sessionId);
      } catch (e) {
        // Session might not exist
      }
    }
    if (testQuiz) {
      await cleanupTestQuiz(testQuiz.id);
    }
  });

  describe('Host Creates Session', () => {
    it('should create a new game session successfully', async () => {
      const request = new NextRequest('http://localhost:3210/api/game/session', {
        method: 'POST',
        body: JSON.stringify({ quizId: testQuiz.id }),
      });

      const response = await createSession(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.sessionId).toBeDefined();
      expect(data.sessionCode).toBeDefined();
      expect(data.sessionCode).toHaveLength(6);
      expect(data.status).toBe('waiting');
      expect(data.quiz.id).toBe(testQuiz.id);
      expect(data.quiz.title).toBe(testQuiz.title);

      // Store for cleanup
      sessionId = data.sessionId;
      sessionCode = data.sessionCode;
    });

    it('should initialize session in game state manager', async () => {
      const request = new NextRequest('http://localhost:3210/api/game/session', {
        method: 'POST',
        body: JSON.stringify({ quizId: testQuiz.id }),
      });

      const response = await createSession(request);
      const data = await response.json();
      sessionId = data.sessionId;

      // Verify session exists in game state
      const sessionState = gameStateManager.getSession(sessionId);
      expect(sessionState).toBeDefined();
      expect(sessionState?.sessionId).toBe(sessionId);
    });

    it('should return error for non-existent quiz', async () => {
      const request = new NextRequest('http://localhost:3210/api/game/session', {
        method: 'POST',
        body: JSON.stringify({ quizId: 99999 }),
      });

      const response = await createSession(request);
      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data.error).toBeDefined();
    });
  });

  describe('Host Manages Session', () => {
    beforeEach(async () => {
      // Create a session for each test
      const request = new NextRequest('http://localhost:3210/api/game/session', {
        method: 'POST',
        body: JSON.stringify({ quizId: testQuiz.id }),
      });

      const response = await createSession(request);
      const data = await response.json();
      sessionId = data.sessionId;
      sessionCode = data.sessionCode;
    });

    it('should retrieve session details', async () => {
      const response = await getSession(
        new NextRequest(`http://localhost:3210/api/game/session/${sessionId}`),
        { params: { sessionId } }
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe(sessionId);
      expect(data.sessionCode).toBe(sessionCode);
      expect(data.status).toBe('waiting');
      expect(data.quiz.id).toBe(testQuiz.id);
      expect(data.players).toEqual([]);
    });

    it('should start game with players', async () => {
      // Add players
      const player1 = await createTestPlayer(sessionId, 'Player 1');
      const player2 = await createTestPlayer(sessionId, 'Player 2');

      // Start game
      const request = new NextRequest(
        `http://localhost:3210/api/game/session/${sessionId}/start`,
        { method: 'POST' }
      );

      const response = await startGame(request, { params: { sessionId } });
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.currentQuestion).toBe(0);

      // Verify session status in database
      const session = await prisma.gameSession.findUnique({
        where: { id: sessionId },
      });
      expect(session?.status).toBe('in_progress');

      // Verify session state
      const sessionState = gameStateManager.getSession(sessionId);
      expect(sessionState).toBeDefined();
    });

    it('should not start game without players', async () => {
      // Try to start game without players
      const request = new NextRequest(
        `http://localhost:3210/api/game/session/${sessionId}/start`,
        { method: 'POST' }
      );

      const response = await startGame(request, { params: { sessionId } });
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    it('should reveal answer and update scores', async () => {
      // Add players and start game
      const player1 = await createTestPlayer(sessionId, 'Player 1');
      await createTestPlayer(sessionId, 'Player 2');

      await startGame(
        new NextRequest(`http://localhost:3210/api/game/session/${sessionId}/start`, {
          method: 'POST',
        }),
        { params: { sessionId } }
      );

      // Submit answer for player 1 (correct answer)
      const firstQuestion = testQuiz.questions[0];
      const correctAnswer = firstQuestion.answers.find(a => a.isCorrect);

      await submitAnswer(
        new NextRequest(`http://localhost:3210/api/game/players/${player1.id}/answer`, {
          method: 'POST',
          body: JSON.stringify({
            questionId: firstQuestion.id,
            answerId: correctAnswer!.id,
          }),
        }),
        { params: { playerId: player1.id } }
      );

      // Reveal answer
      const request = new NextRequest(
        `http://localhost:3210/api/game/session/${sessionId}/reveal`,
        { method: 'POST' }
      );

      const response = await revealAnswer(request, { params: { sessionId } });
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);

      // Check score in database
      const updatedPlayer = await prisma.player.findUnique({
        where: { id: player1.id },
      });
      expect(updatedPlayer?.score).toBeGreaterThan(0);
    });

    it('should advance to next question', async () => {
      // Add players and start game
      await createTestPlayer(sessionId, 'Player 1');
      await startGame(
        new NextRequest(`http://localhost:3210/api/game/session/${sessionId}/start`, {
          method: 'POST',
        }),
        { params: { sessionId } }
      );

      // Reveal current answer first
      await revealAnswer(
        new NextRequest(`http://localhost:3210/api/game/session/${sessionId}/reveal`, {
          method: 'POST',
        }),
        { params: { sessionId } }
      );

      // Move to next question
      const request = new NextRequest(
        `http://localhost:3210/api/game/session/${sessionId}/next`,
        { method: 'POST' }
      );

      const response = await nextQuestion(request, { params: { sessionId } });
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.currentQuestion).toBe(1);
      expect(data.gameFinished).toBe(false);
    });

    it('should finish game after last question', async () => {
      // Add players and start game
      await createTestPlayer(sessionId, 'Player 1');
      await startGame(
        new NextRequest(`http://localhost:3210/api/game/session/${sessionId}/start`, {
          method: 'POST',
        }),
        { params: { sessionId } }
      );

      // Go through all questions
      for (let i = 0; i < testQuiz.questions.length; i++) {
        // Reveal answer
        await revealAnswer(
          new NextRequest(`http://localhost:3210/api/game/session/${sessionId}/reveal`, {
            method: 'POST',
          }),
          { params: { sessionId } }
        );

        // Move to next
        const response = await nextQuestion(
          new NextRequest(`http://localhost:3210/api/game/session/${sessionId}/next`, {
            method: 'POST',
          }),
          { params: { sessionId } }
        );

        const data = await response.json();

        if (i === testQuiz.questions.length - 1) {
          // Last question - game should finish
          expect(data.gameFinished).toBe(true);
          expect(data.finalScores).toBeDefined();
          expect(data.finalScores).toHaveLength(1);
        } else {
          // Not last question - should continue
          expect(data.gameFinished).toBe(false);
          expect(data.currentQuestion).toBe(i + 1);
        }
      }

      // Verify game is finished
      const sessionResponse = await getSession(
        new NextRequest(`http://localhost:3210/api/game/session/${sessionId}`),
        { params: { sessionId } }
      );
      const sessionData = await sessionResponse.json();
      expect(sessionData.status).toBe('finished');
    });
  });

  describe('Host Session State', () => {
    it('should track answered players', async () => {
      // Create session
      const createRequest = new NextRequest('http://localhost:3210/api/game/session', {
        method: 'POST',
        body: JSON.stringify({ quizId: testQuiz.id }),
      });

      const createResponse = await createSession(createRequest);
      const { sessionId: sid } = await createResponse.json();
      sessionId = sid;

      // Add players
      const player1 = await createTestPlayer(sessionId, 'Player 1');
      const player2 = await createTestPlayer(sessionId, 'Player 2');

      // Start game
      await startGame(
        new NextRequest(`http://localhost:3210/api/game/session/${sessionId}/start`, {
          method: 'POST',
        }),
        { params: { sessionId } }
      );

      // Initialize session state for answered players
      gameStateManager.initSession(sessionId);

      // Mark players as answered
      gameStateManager.markPlayerAnswered(sessionId, player1.id);
      expect(gameStateManager.haveAllAnswered(sessionId, 2)).toBe(false);

      gameStateManager.markPlayerAnswered(sessionId, player2.id);
      expect(gameStateManager.haveAllAnswered(sessionId, 2)).toBe(true);
    });

    it('should reset answered players for next question', async () => {
      // Create session
      const createRequest = new NextRequest('http://localhost:3210/api/game/session', {
        method: 'POST',
        body: JSON.stringify({ quizId: testQuiz.id }),
      });

      const createResponse = await createSession(createRequest);
      const { sessionId: sid } = await createResponse.json();
      sessionId = sid;

      const player1 = await createTestPlayer(sessionId, 'Player 1');

      gameStateManager.initSession(sessionId);
      gameStateManager.markPlayerAnswered(sessionId, player1.id);

      expect(gameStateManager.haveAllAnswered(sessionId, 1)).toBe(true);

      // Reset for next question
      gameStateManager.resetAnswers(sessionId);
      expect(gameStateManager.haveAllAnswered(sessionId, 1)).toBe(false);
    });
  });
});
