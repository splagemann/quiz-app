/**
 * Test helpers for E2E tests
 */

import { prisma } from '@/lib/prisma';

export type TestQuiz = {
  id: number;
  title: string;
  description: string | null;
  language: string;
  questions: TestQuestion[];
};

export type TestQuestion = {
  id: number;
  title: string | null;
  questionText: string;
  description: string | null;
  imageUrl: string | null;
  orderIndex: number;
  answers: TestAnswer[];
};

export type TestAnswer = {
  id: number;
  answerText: string;
  imageUrl: string | null;
  isCorrect: boolean;
  orderIndex: number;
};

/**
 * Create a test quiz with questions and answers
 */
export async function createTestQuiz(options?: {
  title?: string;
  questionCount?: number;
  answersPerQuestion?: number;
  language?: string;
}): Promise<TestQuiz> {
  const {
    title = 'Test Quiz',
    questionCount = 2,
    answersPerQuestion = 3,
    language = 'en',
  } = options || {};

  const quiz = await prisma.quiz.create({
    data: {
      title,
      description: 'A test quiz for E2E testing',
      language,
      questions: {
        create: Array.from({ length: questionCount }, (_, i) => ({
          title: `Question ${i + 1}`,
          questionText: `What is the answer to question ${i + 1}?`,
          description: `Description for question ${i + 1}`,
          orderIndex: i,
          answers: {
            create: Array.from({ length: answersPerQuestion }, (_, j) => ({
              answerText: `Answer ${j + 1} for Q${i + 1}`,
              isCorrect: j === 0, // First answer is correct
              orderIndex: j,
            })),
          },
        })),
      },
    },
    include: {
      questions: {
        include: {
          answers: true,
        },
        orderBy: {
          orderIndex: 'asc',
        },
      },
    },
  });

  return quiz as TestQuiz;
}

/**
 * Create a test game session
 */
export async function createTestSession(quizId: number, sessionCode?: string): Promise<any> {
  const code = sessionCode || `TEST${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  const session = await prisma.gameSession.create({
    data: {
      quizId,
      sessionCode: code,
      status: 'waiting',
    },
    include: {
      quiz: {
        include: {
          questions: {
            include: {
              answers: true,
            },
            orderBy: {
              orderIndex: 'asc',
            },
          },
        },
      },
    },
  });

  return session;
}

/**
 * Create a test player
 */
export async function createTestPlayer(
  sessionId: string,
  playerName: string,
  score = 0
): Promise<any> {
  const player = await prisma.player.create({
    data: {
      sessionId,
      playerName,
      score,
      isConnected: true,
      markedToWin: false,
    },
  });

  return player;
}

/**
 * Submit a player answer
 */
export async function submitTestAnswer(
  playerId: string,
  questionId: number,
  answerId: number
): Promise<any> {
  const answer = await prisma.playerAnswer.create({
    data: {
      playerId,
      questionId,
      answerId,
    },
  });

  return answer;
}

/**
 * Clean up test data
 */
export async function cleanupTestQuiz(quizId: number): Promise<void> {
  // Cascade delete will handle questions, answers, sessions, players, etc.
  await prisma.quiz.delete({
    where: { id: quizId },
  });
}

/**
 * Clean up test session
 */
export async function cleanupTestSession(sessionId: string): Promise<void> {
  // Cascade delete will handle players and their answers
  await prisma.gameSession.delete({
    where: { id: sessionId },
  });
}

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout = 5000,
  interval = 100
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error('Condition not met within timeout');
}

/**
 * Mock SSE (Server-Sent Events) for testing
 */
export class MockEventSource {
  private listeners: Map<string, Function[]> = new Map();
  public readyState = 1; // OPEN

  addEventListener(event: string, handler: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(handler);
  }

  removeEventListener(event: string, handler: Function) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  close() {
    this.readyState = 2; // CLOSED
  }

  // Test helper to trigger events
  triggerEvent(event: string, data: any) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        handler({ data: JSON.stringify(data) });
      });
    }
  }

  // Expose for direct message triggering
  set onmessage(handler: Function) {
    this.addEventListener('message', handler);
  }

  set onerror(handler: Function) {
    this.addEventListener('error', handler);
  }
}
