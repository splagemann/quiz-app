/**
 * @jest-environment node
 */

import { POST as QuestionsPost } from '@/app/api/questions/route';
import { PUT as QuestionsPut, DELETE as QuestionsDelete } from '@/app/api/questions/[questionId]/route';
import { POST as UploadPost } from '@/app/api/upload/route';
import { NextRequest } from 'next/server';
import { isAuthenticated } from '@/lib/auth';

// Mock authentication
jest.mock('@/lib/auth', () => ({
  isAuthenticated: jest.fn(),
}));

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    question: {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
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

// Mock fs/promises
jest.mock('fs/promises', () => ({
  writeFile: jest.fn(),
}));

describe('Admin API Authentication', () => {
  const mockIsAuthenticated = isAuthenticated as jest.MockedFunction<typeof isAuthenticated>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/questions', () => {
    it('should return 401 when unauthenticated', async () => {
      mockIsAuthenticated.mockResolvedValue(false);

      const request = new NextRequest('http://localhost:3210/api/questions', {
        method: 'POST',
        body: JSON.stringify({
          quizId: 1,
          questionText: 'Test question',
          answers: [
            { text: 'Answer 1', isCorrect: true },
            { text: 'Answer 2', isCorrect: false },
          ],
        }),
      });

      const response = await QuestionsPost(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should allow authenticated requests', async () => {
      mockIsAuthenticated.mockResolvedValue(true);

      const request = new NextRequest('http://localhost:3210/api/questions', {
        method: 'POST',
        body: JSON.stringify({
          quizId: 1,
          questionText: 'Test question',
          answers: [],
        }),
      });

      // Mock Prisma to prevent actual database operations
      const { prisma } = require('@/lib/prisma');
      prisma.question.create.mockResolvedValue({
        id: 1,
        questionText: 'Test question',
        answers: [],
      });

      const response = await QuestionsPost(request);

      expect(response.status).not.toBe(401);
    });
  });

  describe('PUT /api/questions/[questionId]', () => {
    it('should return 401 when unauthenticated', async () => {
      mockIsAuthenticated.mockResolvedValue(false);

      const request = new NextRequest('http://localhost:3210/api/questions/1', {
        method: 'PUT',
        body: JSON.stringify({
          questionText: 'Updated question',
          answers: [],
        }),
      });

      const params = Promise.resolve({ questionId: '1' });
      const response = await QuestionsPut(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should allow authenticated requests', async () => {
      mockIsAuthenticated.mockResolvedValue(true);

      const request = new NextRequest('http://localhost:3210/api/questions/1', {
        method: 'PUT',
        body: JSON.stringify({
          questionText: 'Updated question',
          answers: [],
        }),
      });

      // Mock Prisma
      const { prisma } = require('@/lib/prisma');
      prisma.answer.findMany.mockResolvedValue([]);
      prisma.question.update.mockResolvedValue({
        id: 1,
        questionText: 'Updated question',
        answers: [],
      });

      const params = Promise.resolve({ questionId: '1' });
      const response = await QuestionsPut(request, { params });

      expect(response.status).not.toBe(401);
    });
  });

  describe('DELETE /api/questions/[questionId]', () => {
    it('should return 401 when unauthenticated', async () => {
      mockIsAuthenticated.mockResolvedValue(false);

      const request = new NextRequest('http://localhost:3210/api/questions/1', {
        method: 'DELETE',
      });

      const params = Promise.resolve({ questionId: '1' });
      const response = await QuestionsDelete(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should allow authenticated requests', async () => {
      mockIsAuthenticated.mockResolvedValue(true);

      const request = new NextRequest('http://localhost:3210/api/questions/1', {
        method: 'DELETE',
      });

      // Mock Prisma
      const { prisma } = require('@/lib/prisma');
      prisma.playerAnswer.deleteMany.mockResolvedValue({ count: 0 });
      prisma.question.delete.mockResolvedValue({ id: 1 });

      const params = Promise.resolve({ questionId: '1' });
      const response = await QuestionsDelete(request, { params });

      expect(response.status).not.toBe(401);
    });
  });

  describe('POST /api/upload', () => {
    it('should return 401 when unauthenticated', async () => {
      mockIsAuthenticated.mockResolvedValue(false);

      const formData = new FormData();
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      formData.append('file', file);

      const request = new NextRequest('http://localhost:3210/api/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await UploadPost(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should allow authenticated requests with valid image', async () => {
      mockIsAuthenticated.mockResolvedValue(true);

      // Create a buffer with JPEG signature (FF D8 FF)
      const jpegSignature = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]);
      const file = new File([jpegSignature], 'test.jpg', { type: 'image/jpeg' });

      const formData = new FormData();
      formData.append('file', file);

      const request = new NextRequest('http://localhost:3210/api/upload', {
        method: 'POST',
        body: formData,
      });

      // Mock writeFile
      const { writeFile } = require('fs/promises');
      writeFile.mockResolvedValue(undefined);

      const response = await UploadPost(request);

      expect(response.status).not.toBe(401);
    });
  });
});
