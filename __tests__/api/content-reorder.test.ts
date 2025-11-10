/**
 * @jest-environment node
 */

import { POST } from '@/app/api/content/reorder/route';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAuthenticated } from '@/lib/auth';

// Mock authentication
jest.mock('@/lib/auth', () => ({
  isAuthenticated: jest.fn(),
}));

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    question: {
      update: jest.fn(),
    },
    page: {
      update: jest.fn(),
    },
  },
}));

describe('/api/content/reorder', () => {
  const mockPrisma = prisma as jest.Mocked<typeof prisma>;
  const mockIsAuthenticated = isAuthenticated as jest.MockedFunction<typeof isAuthenticated>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsAuthenticated.mockResolvedValue(true);
  });

  describe('POST /api/content/reorder', () => {
    it('should reorder questions successfully', async () => {
      const reorderData = {
        quizId: 1,
        items: [
          { type: 'question' as const, id: 1, orderIndex: 0 },
          { type: 'question' as const, id: 2, orderIndex: 1 },
          { type: 'question' as const, id: 3, orderIndex: 2 },
        ],
      };

      mockPrisma.question.update.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost:3000/api/content/reorder', {
        method: 'POST',
        body: JSON.stringify(reorderData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockPrisma.question.update).toHaveBeenCalledTimes(3);
      expect(mockPrisma.question.update).toHaveBeenNthCalledWith(1, {
        where: { id: 1 },
        data: { orderIndex: 0 },
      });
      expect(mockPrisma.question.update).toHaveBeenNthCalledWith(2, {
        where: { id: 2 },
        data: { orderIndex: 1 },
      });
      expect(mockPrisma.question.update).toHaveBeenNthCalledWith(3, {
        where: { id: 3 },
        data: { orderIndex: 2 },
      });
    });

    it('should reorder pages successfully', async () => {
      const reorderData = {
        quizId: 1,
        items: [
          { type: 'page' as const, id: 1, orderIndex: 0 },
          { type: 'page' as const, id: 2, orderIndex: 1 },
        ],
      };

      mockPrisma.page.update.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost:3000/api/content/reorder', {
        method: 'POST',
        body: JSON.stringify(reorderData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockPrisma.page.update).toHaveBeenCalledTimes(2);
      expect(mockPrisma.page.update).toHaveBeenNthCalledWith(1, {
        where: { id: 1 },
        data: { orderIndex: 0 },
      });
      expect(mockPrisma.page.update).toHaveBeenNthCalledWith(2, {
        where: { id: 2 },
        data: { orderIndex: 1 },
      });
    });

    it('should reorder mixed content (questions and pages) successfully', async () => {
      const reorderData = {
        quizId: 1,
        items: [
          { type: 'page' as const, id: 1, orderIndex: 0 },
          { type: 'question' as const, id: 1, orderIndex: 1 },
          { type: 'question' as const, id: 2, orderIndex: 2 },
          { type: 'page' as const, id: 2, orderIndex: 3 },
        ],
      };

      mockPrisma.question.update.mockResolvedValue({} as any);
      mockPrisma.page.update.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost:3000/api/content/reorder', {
        method: 'POST',
        body: JSON.stringify(reorderData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockPrisma.page.update).toHaveBeenCalledTimes(2);
      expect(mockPrisma.question.update).toHaveBeenCalledTimes(2);
    });

    it('should return 401 if not authenticated', async () => {
      mockIsAuthenticated.mockResolvedValue(false);

      const request = new NextRequest('http://localhost:3000/api/content/reorder', {
        method: 'POST',
        body: JSON.stringify({
          quizId: 1,
          items: [{ type: 'question', id: 1, orderIndex: 0 }],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
      expect(mockPrisma.question.update).not.toHaveBeenCalled();
      expect(mockPrisma.page.update).not.toHaveBeenCalled();
    });

    it('should return 500 on database error', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockPrisma.question.update.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/content/reorder', {
        method: 'POST',
        body: JSON.stringify({
          quizId: 1,
          items: [{ type: 'question', id: 1, orderIndex: 0 }],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to reorder content');
      consoleErrorSpy.mockRestore();
    });

    it('should handle empty items array', async () => {
      const reorderData = {
        quizId: 1,
        items: [],
      };

      const request = new NextRequest('http://localhost:3000/api/content/reorder', {
        method: 'POST',
        body: JSON.stringify(reorderData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockPrisma.question.update).not.toHaveBeenCalled();
      expect(mockPrisma.page.update).not.toHaveBeenCalled();
    });
  });
});
