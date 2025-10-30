/**
 * @jest-environment node
 */

import { PUT, DELETE } from '@/app/api/questions/[questionId]/route';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    question: {
      update: jest.fn(),
      delete: jest.fn(),
    },
    answer: {
      findMany: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    playerAnswer: {
      deleteMany: jest.fn(),
    },
  },
}));

describe('/api/questions/[questionId]', () => {
  const mockPrisma = prisma as jest.Mocked<typeof prisma>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('PUT', () => {
    it('should update question successfully', async () => {
      const questionId = '10';
      const existingAnswers = [
        { id: 1, answerText: 'Five', imageUrl: null, isCorrect: false, orderIndex: 0 },
        { id: 2, answerText: 'Six', imageUrl: null, isCorrect: true, orderIndex: 1 },
      ];
      const updatedQuestion = {
        id: 10,
        title: 'Updated Question',
        questionText: 'What is 3 + 3?',
        description: 'Math question',
        imageUrl: 'http://example.com/image.jpg',
        answers: [
          { id: 1, answerText: 'Six', imageUrl: null, isCorrect: true },
          { id: 2, answerText: 'Seven', imageUrl: null, isCorrect: false },
        ],
      };

      mockPrisma.answer.findMany.mockResolvedValue(existingAnswers as any);
      mockPrisma.answer.update.mockResolvedValue({} as any);
      mockPrisma.question.update.mockResolvedValue(updatedQuestion as any);

      const request = new NextRequest(
        `http://localhost:3210/api/questions/${questionId}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            title: 'Updated Question',
            questionText: 'What is 3 + 3?',
            description: 'Math question',
            imageUrl: 'http://example.com/image.jpg',
            answers: [
              { id: 1, text: 'Six', imageUrl: null, isCorrect: true },
              { id: 2, text: 'Seven', imageUrl: null, isCorrect: false },
            ],
          }),
        }
      );

      const params = Promise.resolve({ questionId });
      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe(10);
      expect(data.title).toBe('Updated Question');
      expect(data.questionText).toBe('What is 3 + 3?');
      expect(mockPrisma.answer.findMany).toHaveBeenCalledWith({
        where: { questionId: 10 },
      });
      expect(mockPrisma.answer.update).toHaveBeenCalled();
      expect(mockPrisma.question.update).toHaveBeenCalled();
    });

    it('should update question with null optional fields', async () => {
      const questionId = '10';
      const existingAnswers = [
        { id: 1, answerText: 'Answer 1', imageUrl: null, isCorrect: true, orderIndex: 0 },
        { id: 2, answerText: 'Answer 2', imageUrl: null, isCorrect: false, orderIndex: 1 },
      ];
      const updatedQuestion = {
        id: 10,
        title: null,
        questionText: 'Simple question',
        description: null,
        imageUrl: null,
        answers: [],
      };

      mockPrisma.answer.findMany.mockResolvedValue(existingAnswers as any);
      mockPrisma.playerAnswer.deleteMany.mockResolvedValue({ count: 0 } as any);
      mockPrisma.answer.delete.mockResolvedValue({} as any);
      mockPrisma.question.update.mockResolvedValue(updatedQuestion as any);

      const request = new NextRequest(
        `http://localhost:3210/api/questions/${questionId}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            title: null,
            questionText: 'Simple question',
            description: null,
            imageUrl: null,
            answers: [],
          }),
        }
      );

      const params = Promise.resolve({ questionId });
      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.questionText).toBe('Simple question');
    });

    it('should return 500 on database error', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const questionId = '10';

      mockPrisma.answer.findMany.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest(
        `http://localhost:3210/api/questions/${questionId}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            title: 'Test',
            questionText: 'Test',
            answers: [],
          }),
        }
      );

      const params = Promise.resolve({ questionId });
      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to update question');

      consoleErrorSpy.mockRestore();
    });
  });

  describe('DELETE', () => {
    it('should delete question successfully', async () => {
      const questionId = '10';

      mockPrisma.playerAnswer.deleteMany.mockResolvedValue({ count: 5 } as any);
      mockPrisma.question.delete.mockResolvedValue({} as any);

      const request = new NextRequest(
        `http://localhost:3210/api/questions/${questionId}`,
        {
          method: 'DELETE',
        }
      );

      const params = Promise.resolve({ questionId });
      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockPrisma.playerAnswer.deleteMany).toHaveBeenCalledWith({
        where: { questionId: 10 },
      });
      expect(mockPrisma.question.delete).toHaveBeenCalledWith({
        where: { id: 10 },
      });
    });

    it('should delete question even with no player answers', async () => {
      const questionId = '10';

      mockPrisma.playerAnswer.deleteMany.mockResolvedValue({ count: 0 } as any);
      mockPrisma.question.delete.mockResolvedValue({} as any);

      const request = new NextRequest(
        `http://localhost:3210/api/questions/${questionId}`,
        {
          method: 'DELETE',
        }
      );

      const params = Promise.resolve({ questionId });
      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return 500 on database error', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const questionId = '10';

      mockPrisma.playerAnswer.deleteMany.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest(
        `http://localhost:3210/api/questions/${questionId}`,
        {
          method: 'DELETE',
        }
      );

      const params = Promise.resolve({ questionId });
      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to delete question');

      consoleErrorSpy.mockRestore();
    });
  });
});
