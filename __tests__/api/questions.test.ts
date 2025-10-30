/**
 * @jest-environment node
 */

import { POST } from '@/app/api/questions/route';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    question: {
      create: jest.fn(),
    },
  },
}));

describe('/api/questions', () => {
  const mockPrisma = prisma as jest.Mocked<typeof prisma>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a new question with answers', async () => {
    const questionData = {
      quizId: 1,
      title: 'Test Question',
      questionText: 'What is 2 + 2?',
      description: 'Basic math',
      imageUrl: null,
      orderIndex: 0,
      answers: [
        { text: '3', isCorrect: false },
        { text: '4', isCorrect: true },
        { text: '5', isCorrect: false },
      ],
    };

    const mockQuestion = {
      id: 1,
      ...questionData,
      answers: [
        { id: 1, answerText: '3', isCorrect: false, orderIndex: 0 },
        { id: 2, answerText: '4', isCorrect: true, orderIndex: 1 },
        { id: 3, answerText: '5', isCorrect: false, orderIndex: 2 },
      ],
    };

    mockPrisma.question.create.mockResolvedValue(mockQuestion as any);

    const request = new NextRequest('http://localhost:3210/api/questions', {
      method: 'POST',
      body: JSON.stringify(questionData),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe(1);
    expect(data.title).toBe('Test Question');
    expect(data.answers).toHaveLength(3);
    expect(mockPrisma.question.create).toHaveBeenCalledWith({
      data: {
        quizId: 1,
        title: 'Test Question',
        questionText: 'What is 2 + 2?',
        description: 'Basic math',
        imageUrl: null,
        orderIndex: 0,
        answers: {
          create: [
            { answerText: '3', isCorrect: false, orderIndex: 0 },
            { answerText: '4', isCorrect: true, orderIndex: 1 },
            { answerText: '5', isCorrect: false, orderIndex: 2 },
          ],
        },
      },
      include: {
        answers: true,
      },
    });
  });

  it('should return 500 error when creation fails', async () => {
    // Suppress console.error for this test
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    const questionData = {
      quizId: 1,
      title: 'Test Question',
      questionText: 'What is 2 + 2?',
      answers: [],
    };

    mockPrisma.question.create.mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost:3210/api/questions', {
      method: 'POST',
      body: JSON.stringify(questionData),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to create question');
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});
