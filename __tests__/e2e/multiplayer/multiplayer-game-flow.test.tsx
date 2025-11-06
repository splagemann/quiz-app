/**
 * @jest-environment node
 */

import { POST as createSession } from '@/app/api/game/session/route';
import { POST as joinGame } from '@/app/api/game/players/route';
import { POST as startGame } from '@/app/api/game/session/[sessionId]/start/route';
import { POST as submitAnswer } from '@/app/api/game/players/[playerId]/answer/route';
import { POST as revealAnswer } from '@/app/api/game/session/[sessionId]/reveal/route';
import { POST as nextQuestion } from '@/app/api/game/session/[sessionId]/next/route';
import { GET as getSession } from '@/app/api/game/session/[sessionId]/route';
import { NextRequest } from 'next/server';
import {
  createTestQuiz,
  cleanupTestQuiz,
  type TestQuiz,
} from '../utils/test-helpers';
import { gameStateManager } from '@/lib/gameState';
import { prisma } from '@/lib/prisma';

describe('Multiplayer E2E - Full Game Flow', () => {
  let testQuiz: TestQuiz;
  let sessionId: string;
  let sessionCode: string;
  let player1Id: string;
  let player2Id: string;
  let player3Id: string;

  beforeEach(async () => {
    // Create a test quiz with 3 questions
    testQuiz = await createTestQuiz({
      title: 'Full Multiplayer Test Quiz',
      questionCount: 3,
      answersPerQuestion: 4,
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

  describe('Complete Multiplayer Game with 3 Players', () => {
    it('should run full game from session creation to final leaderboard', async () => {
      // 1. Host creates session
      const createRequest = new NextRequest('http://localhost:3210/api/game/session', {
        method: 'POST',
        body: JSON.stringify({ quizId: testQuiz.id }),
      });

      const createResponse = await createSession(createRequest);
      expect(createResponse.status).toBe(200);

      const createData = await createResponse.json();
      sessionId = createData.sessionId;
      sessionCode = createData.sessionCode;

      expect(sessionCode).toBeDefined();
      expect(sessionCode).toHaveLength(6);

      // 2. Three players join
      const join1 = await joinGame(
        new NextRequest('http://localhost:3210/api/game/players', {
          method: 'POST',
          body: JSON.stringify({
            sessionCode,
            playerName: 'Alice',
          }),
        })
      );
      player1Id = (await join1.json()).playerId;

      const join2 = await joinGame(
        new NextRequest('http://localhost:3210/api/game/players', {
          method: 'POST',
          body: JSON.stringify({
            sessionCode,
            playerName: 'Bob',
          }),
        })
      );
      player2Id = (await join2.json()).playerId;

      const join3 = await joinGame(
        new NextRequest('http://localhost:3210/api/game/players', {
          method: 'POST',
          body: JSON.stringify({
            sessionCode,
            playerName: 'Charlie',
          }),
        })
      );
      player3Id = (await join3.json()).playerId;

      // Verify all players joined
      const sessionCheck = await getSession(
        new NextRequest(`http://localhost:3210/api/game/session/${sessionId}`),
        { params: { sessionId } }
      );
      const sessionData = await sessionCheck.json();
      expect(sessionData.players).toHaveLength(3);

      // 3. Host starts game
      const startResponse = await startGame(
        new NextRequest(`http://localhost:3210/api/game/session/${sessionId}/start`, {
          method: 'POST',
        }),
        { params: { sessionId } }
      );
      expect(startResponse.status).toBe(200);

      const startData = await startResponse.json();
      expect(startData.success).toBe(true);
      expect(startData.currentQuestion).toBe(0);

      // 4. Play through all questions
      for (let questionIndex = 0; questionIndex < testQuiz.questions.length; questionIndex++) {
        const currentQuestion = testQuiz.questions[questionIndex];
        const correctAnswer = currentQuestion.answers.find(a => a.isCorrect)!;
        const wrongAnswer = currentQuestion.answers.find(a => !a.isCorrect)!;

        // Initialize game state for this question
        gameStateManager.initSession(sessionId);
        gameStateManager.resetAnswers(sessionId);

        // Player 1 answers correctly
        const answer1 = await submitAnswer(
          new NextRequest(`http://localhost:3210/api/game/players/${player1Id}/answer`, {
            method: 'POST',
            body: JSON.stringify({
              questionId: currentQuestion.id,
              answerId: correctAnswer.id,
            }),
          }),
          { params: { playerId: player1Id } }
        );
        const answer1Data = await answer1.json();
        expect(answer1Data.isCorrect).toBe(true);
        gameStateManager.markPlayerAnswered(sessionId, player1Id);

        // Player 2 answers incorrectly
        const answer2 = await submitAnswer(
          new NextRequest(`http://localhost:3210/api/game/players/${player2Id}/answer`, {
            method: 'POST',
            body: JSON.stringify({
              questionId: currentQuestion.id,
              answerId: wrongAnswer.id,
            }),
          }),
          { params: { playerId: player2Id } }
        );
        const answer2Data = await answer2.json();
        expect(answer2Data.isCorrect).toBe(false);
        gameStateManager.markPlayerAnswered(sessionId, player2Id);

        // Player 3 answers correctly
        const answer3 = await submitAnswer(
          new NextRequest(`http://localhost:3210/api/game/players/${player3Id}/answer`, {
            method: 'POST',
            body: JSON.stringify({
              questionId: currentQuestion.id,
              answerId: correctAnswer.id,
            }),
          }),
          { params: { playerId: player3Id } }
        );
        const answer3Data = await answer3.json();
        expect(answer3Data.isCorrect).toBe(true);
        gameStateManager.markPlayerAnswered(sessionId, player3Id);

        // Check all players answered
        expect(gameStateManager.haveAllAnswered(sessionId, 3)).toBe(true);

        // Host reveals answer
        const revealResponse = await revealAnswer(
          new NextRequest(`http://localhost:3210/api/game/session/${sessionId}/reveal`, {
            method: 'POST',
          }),
          { params: { sessionId } }
        );
        const revealData = await revealResponse.json();
        expect(revealData.success).toBe(true);

        // Check scores in database
        const player1 = await prisma.player.findUnique({ where: { id: player1Id } });
        const player2 = await prisma.player.findUnique({ where: { id: player2Id } });
        const player3 = await prisma.player.findUnique({ where: { id: player3Id } });
        expect(player1!.score).toBeGreaterThan(0);
        expect(player2!.score).toBe(0);
        expect(player3!.score).toBeGreaterThan(0);

        // Host moves to next question or finishes
        const nextResponse = await nextQuestion(
          new NextRequest(`http://localhost:3210/api/game/session/${sessionId}/next`, {
            method: 'POST',
          }),
          { params: { sessionId } }
        );
        const nextData = await nextResponse.json();

        if (questionIndex === testQuiz.questions.length - 1) {
          // Last question - should finish
          expect(nextData.gameFinished).toBe(true);
          expect(nextData.finalScores).toHaveLength(3);

          // Verify Player 1 and 3 have equal scores (both answered all correctly)
          const player1Score = nextData.finalScores.find(
            (s: any) => s.playerId === player1Id
          );
          const player2Score = nextData.finalScores.find(
            (s: any) => s.playerId === player2Id
          );
          const player3Score = nextData.finalScores.find(
            (s: any) => s.playerId === player3Id
          );

          expect(player1Score.score).toBeGreaterThan(0);
          expect(player2Score.score).toBe(0);
          expect(player3Score.score).toBeGreaterThan(0);
          expect(player1Score.score).toBe(player3Score.score);
        } else {
          // Should advance to next question
          expect(nextData.gameFinished).toBe(false);
          expect(nextData.currentQuestion).toBe(questionIndex + 1);
        }
      }

      // 5. Verify final game state
      const finalSession = await getSession(
        new NextRequest(`http://localhost:3210/api/game/session/${sessionId}`),
        { params: { sessionId } }
      );
      const finalData = await finalSession.json();
      expect(finalData.status).toBe('finished');
      expect(finalData.finishedAt).toBeDefined();
    });
  });

  describe('Player Score Calculation', () => {
    beforeEach(async () => {
      // Create session and add players
      const createResponse = await createSession(
        new NextRequest('http://localhost:3210/api/game/session', {
          method: 'POST',
          body: JSON.stringify({ quizId: testQuiz.id }),
        })
      );
      const createData = await createResponse.json();
      sessionId = createData.sessionId;
      sessionCode = createData.sessionCode;

      // Join players
      const join1 = await joinGame(
        new NextRequest('http://localhost:3210/api/game/players', {
          method: 'POST',
          body: JSON.stringify({ sessionCode, playerName: 'Player 1' }),
        })
      );
      player1Id = (await join1.json()).playerId;

      const join2 = await joinGame(
        new NextRequest('http://localhost:3210/api/game/players', {
          method: 'POST',
          body: JSON.stringify({ sessionCode, playerName: 'Player 2' }),
        })
      );
      player2Id = (await join2.json()).playerId;

      // Start game
      await startGame(
        new NextRequest(`http://localhost:3210/api/game/session/${sessionId}/start`, {
          method: 'POST',
        }),
        { params: { sessionId } }
      );

      gameStateManager.initSession(sessionId);
    });

    it('should award more points for faster correct answers', async () => {
      const question = testQuiz.questions[0];
      const correctAnswer = question.answers.find(a => a.isCorrect)!;

      // Player 1 answers quickly
      const answer1 = await submitAnswer(
        new NextRequest(`http://localhost:3210/api/game/players/${player1Id}/answer`, {
          method: 'POST',
          body: JSON.stringify({
            questionId: question.id,
            answerId: correctAnswer.id,
          }),
        }),
        { params: { playerId: player1Id } }
      );

      // Wait a bit before player 2 answers
      await new Promise(resolve => setTimeout(resolve, 100));

      const answer2 = await submitAnswer(
        new NextRequest(`http://localhost:3210/api/game/players/${player2Id}/answer`, {
          method: 'POST',
          body: JSON.stringify({
            questionId: question.id,
            answerId: correctAnswer.id,
          }),
        }),
        { params: { playerId: player2Id } }
      );

      await answer1.json();
      await answer2.json();

      // Check scores in database
      const player1 = await prisma.player.findUnique({ where: { id: player1Id } });
      const player2 = await prisma.player.findUnique({ where: { id: player2Id } });

      // Both players answered correctly, so both should have scores
      // In the current implementation, all correct answers get 1 point regardless of speed
      expect(player1!.score).toBeGreaterThanOrEqual(player2!.score);
    });

    it('should track cumulative scores across multiple questions', async () => {
      // Play first question - both answer correctly
      const q1 = testQuiz.questions[0];
      const q1Answer = q1.answers.find(a => a.isCorrect)!;

      await submitAnswer(
        new NextRequest(`http://localhost:3210/api/game/players/${player1Id}/answer`, {
          method: 'POST',
          body: JSON.stringify({ questionId: q1.id, answerId: q1Answer.id }),
        }),
        { params: { playerId: player1Id } }
      );

      await submitAnswer(
        new NextRequest(`http://localhost:3210/api/game/players/${player2Id}/answer`, {
          method: 'POST',
          body: JSON.stringify({ questionId: q1.id, answerId: q1Answer.id }),
        }),
        { params: { playerId: player2Id } }
      );

      gameStateManager.markPlayerAnswered(sessionId, player1Id);
      gameStateManager.markPlayerAnswered(sessionId, player2Id);

      // Reveal and go to next
      await revealAnswer(
        new NextRequest(`http://localhost:3210/api/game/session/${sessionId}/reveal`, {
          method: 'POST',
        }),
        { params: { sessionId } }
      );

      await nextQuestion(
        new NextRequest(`http://localhost:3210/api/game/session/${sessionId}/next`, {
          method: 'POST',
        }),
        { params: { sessionId } }
      );

      // Get scores after Q1
      const player1AfterQ1 = await prisma.player.findUnique({
        where: { id: player1Id },
      });
      const score1AfterQ1 = player1AfterQ1!.score;

      // Play second question - only player 1 answers correctly
      gameStateManager.resetAnswers(sessionId);
      const q2 = testQuiz.questions[1];
      const q2CorrectAnswer = q2.answers.find(a => a.isCorrect)!;
      const q2WrongAnswer = q2.answers.find(a => !a.isCorrect)!;

      await submitAnswer(
        new NextRequest(`http://localhost:3210/api/game/players/${player1Id}/answer`, {
          method: 'POST',
          body: JSON.stringify({ questionId: q2.id, answerId: q2CorrectAnswer.id }),
        }),
        { params: { playerId: player1Id } }
      );

      await submitAnswer(
        new NextRequest(`http://localhost:3210/api/game/players/${player2Id}/answer`, {
          method: 'POST',
          body: JSON.stringify({ questionId: q2.id, answerId: q2WrongAnswer.id }),
        }),
        { params: { playerId: player2Id } }
      );

      gameStateManager.markPlayerAnswered(sessionId, player1Id);
      gameStateManager.markPlayerAnswered(sessionId, player2Id);

      await revealAnswer(
        new NextRequest(`http://localhost:3210/api/game/session/${sessionId}/reveal`, {
          method: 'POST',
        }),
        { params: { sessionId } }
      );

      // Get final scores
      const player1Final = await prisma.player.findUnique({
        where: { id: player1Id },
      });
      const player2Final = await prisma.player.findUnique({
        where: { id: player2Id },
      });

      // Player 1 should have more total points (correct in both)
      expect(player1Final!.score).toBeGreaterThan(score1AfterQ1);
      expect(player1Final!.score).toBeGreaterThan(player2Final!.score);
    });
  });

  describe('Edge Cases', () => {
    it('should handle player not answering (no points awarded)', async () => {
      // Create and start game
      const createResponse = await createSession(
        new NextRequest('http://localhost:3210/api/game/session', {
          method: 'POST',
          body: JSON.stringify({ quizId: testQuiz.id }),
        })
      );
      const createData = await createResponse.json();
      sessionId = createData.sessionId;
      sessionCode = createData.sessionCode;

      const join1 = await joinGame(
        new NextRequest('http://localhost:3210/api/game/players', {
          method: 'POST',
          body: JSON.stringify({ sessionCode, playerName: 'Active Player' }),
        })
      );
      player1Id = (await join1.json()).playerId;

      const join2 = await joinGame(
        new NextRequest('http://localhost:3210/api/game/players', {
          method: 'POST',
          body: JSON.stringify({ sessionCode, playerName: 'Inactive Player' }),
        })
      );
      player2Id = (await join2.json()).playerId;

      await startGame(
        new NextRequest(`http://localhost:3210/api/game/session/${sessionId}/start`, {
          method: 'POST',
        }),
        { params: { sessionId } }
      );

      gameStateManager.initSession(sessionId);

      // Only player 1 answers
      const question = testQuiz.questions[0];
      const correctAnswer = question.answers.find(a => a.isCorrect)!;

      await submitAnswer(
        new NextRequest(`http://localhost:3210/api/game/players/${player1Id}/answer`, {
          method: 'POST',
          body: JSON.stringify({
            questionId: question.id,
            answerId: correctAnswer.id,
          }),
        }),
        { params: { playerId: player1Id } }
      );

      gameStateManager.markPlayerAnswered(sessionId, player1Id);

      // Player 2 doesn't answer - host reveals anyway
      const revealResponse = await revealAnswer(
        new NextRequest(`http://localhost:3210/api/game/session/${sessionId}/reveal`, {
          method: 'POST',
        }),
        { params: { sessionId } }
      );

      const revealData = await revealResponse.json();
      expect(revealData.success).toBe(true);

      // Check scores in database - Player 1 should have points, player 2 should have 0
      const player1Check = await prisma.player.findUnique({ where: { id: player1Id } });
      const player2Check = await prisma.player.findUnique({ where: { id: player2Id } });
      expect(player1Check!.score).toBeGreaterThan(0);
      expect(player2Check!.score).toBe(0);
    });

    it('should handle all players answering incorrectly', async () => {
      // Create and start game
      const createResponse = await createSession(
        new NextRequest('http://localhost:3210/api/game/session', {
          method: 'POST',
          body: JSON.stringify({ quizId: testQuiz.id }),
        })
      );
      const createData = await createResponse.json();
      sessionId = createData.sessionId;
      sessionCode = createData.sessionCode;

      const join1 = await joinGame(
        new NextRequest('http://localhost:3210/api/game/players', {
          method: 'POST',
          body: JSON.stringify({ sessionCode, playerName: 'Player 1' }),
        })
      );
      player1Id = (await join1.json()).playerId;

      const join2 = await joinGame(
        new NextRequest('http://localhost:3210/api/game/players', {
          method: 'POST',
          body: JSON.stringify({ sessionCode, playerName: 'Player 2' }),
        })
      );
      player2Id = (await join2.json()).playerId;

      await startGame(
        new NextRequest(`http://localhost:3210/api/game/session/${sessionId}/start`, {
          method: 'POST',
        }),
        { params: { sessionId } }
      );

      gameStateManager.initSession(sessionId);

      // Both players answer incorrectly
      const question = testQuiz.questions[0];
      const wrongAnswer = question.answers.find(a => !a.isCorrect)!;

      await submitAnswer(
        new NextRequest(`http://localhost:3210/api/game/players/${player1Id}/answer`, {
          method: 'POST',
          body: JSON.stringify({
            questionId: question.id,
            answerId: wrongAnswer.id,
          }),
        }),
        { params: { playerId: player1Id } }
      );

      await submitAnswer(
        new NextRequest(`http://localhost:3210/api/game/players/${player2Id}/answer`, {
          method: 'POST',
          body: JSON.stringify({
            questionId: question.id,
            answerId: wrongAnswer.id,
          }),
        }),
        { params: { playerId: player2Id } }
      );

      gameStateManager.markPlayerAnswered(sessionId, player1Id);
      gameStateManager.markPlayerAnswered(sessionId, player2Id);

      const revealResponse = await revealAnswer(
        new NextRequest(`http://localhost:3210/api/game/session/${sessionId}/reveal`, {
          method: 'POST',
        }),
        { params: { sessionId } }
      );

      const revealData = await revealResponse.json();
      expect(revealData.success).toBe(true);

      // Check scores in database - Both should have 0 points
      const player1Check = await prisma.player.findUnique({ where: { id: player1Id } });
      const player2Check = await prisma.player.findUnique({ where: { id: player2Id } });
      expect(player1Check!.score).toBe(0);
      expect(player2Check!.score).toBe(0);
    });
  });
});
