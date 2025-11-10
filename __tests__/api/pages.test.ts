/**
 * @jest-environment node
 */

import { POST } from '@/app/api/pages/route';
import { PUT, DELETE } from '@/app/api/pages/[pageId]/route';
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
    page: {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

describe('/api/pages', () => {
  const mockPrisma = prisma as jest.Mocked<typeof prisma>;
  const mockIsAuthenticated = isAuthenticated as jest.MockedFunction<typeof isAuthenticated>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsAuthenticated.mockResolvedValue(true);
  });

  describe('POST /api/pages', () => {
    it('should create a new page successfully', async () => {
      const pageData = {
        quizId: 1,
        title: 'Introduction',
        content: '# Welcome\n\nThis is a test page.',
        orderIndex: 0,
      };

      const mockPage = {
        id: 1,
        ...pageData,
        pageType: 'custom',
        createdAt: new Date(),
      };

      mockPrisma.page.create.mockResolvedValue(mockPage as any);

      const request = new NextRequest('http://localhost:3000/api/pages', {
        method: 'POST',
        body: JSON.stringify(pageData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe(1);
      expect(data.title).toBe('Introduction');
      expect(mockPrisma.page.create).toHaveBeenCalledWith({
        data: pageData,
      });
    });

    it('should return 401 if not authenticated', async () => {
      mockIsAuthenticated.mockResolvedValue(false);

      const request = new NextRequest('http://localhost:3000/api/pages', {
        method: 'POST',
        body: JSON.stringify({ quizId: 1, title: 'Test', content: 'Test', orderIndex: 0 }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
      expect(mockPrisma.page.create).not.toHaveBeenCalled();
    });

    it('should return 500 on database error', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockPrisma.page.create.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/pages', {
        method: 'POST',
        body: JSON.stringify({ quizId: 1, title: 'Test', content: 'Test', orderIndex: 0 }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to create page');
      consoleErrorSpy.mockRestore();
    });
  });

  describe('PUT /api/pages/[pageId]', () => {
    it('should update a page successfully', async () => {
      const pageId = '1';
      const updateData = {
        title: 'Updated Title',
        content: '# Updated Content',
      };

      const mockPage = {
        id: 1,
        quizId: 1,
        ...updateData,
        pageType: 'custom',
        orderIndex: 0,
        createdAt: new Date(),
      };

      mockPrisma.page.update.mockResolvedValue(mockPage as any);

      const request = new NextRequest(`http://localhost:3000/api/pages/${pageId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
      });

      const params = Promise.resolve({ pageId });
      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.title).toBe('Updated Title');
      expect(mockPrisma.page.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: updateData,
      });
    });

    it('should return 401 if not authenticated', async () => {
      mockIsAuthenticated.mockResolvedValue(false);

      const request = new NextRequest('http://localhost:3000/api/pages/1', {
        method: 'PUT',
        body: JSON.stringify({ title: 'Test', content: 'Test' }),
      });

      const params = Promise.resolve({ pageId: '1' });
      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
      expect(mockPrisma.page.update).not.toHaveBeenCalled();
    });

    it('should return 500 on database error', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockPrisma.page.update.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/pages/1', {
        method: 'PUT',
        body: JSON.stringify({ title: 'Test', content: 'Test' }),
      });

      const params = Promise.resolve({ pageId: '1' });
      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to update page');
      consoleErrorSpy.mockRestore();
    });
  });

  describe('DELETE /api/pages/[pageId]', () => {
    it('should delete a page successfully', async () => {
      const pageId = '1';

      mockPrisma.page.delete.mockResolvedValue({} as any);

      const request = new NextRequest(`http://localhost:3000/api/pages/${pageId}`, {
        method: 'DELETE',
      });

      const params = Promise.resolve({ pageId });
      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockPrisma.page.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should return 401 if not authenticated', async () => {
      mockIsAuthenticated.mockResolvedValue(false);

      const request = new NextRequest('http://localhost:3000/api/pages/1', {
        method: 'DELETE',
      });

      const params = Promise.resolve({ pageId: '1' });
      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
      expect(mockPrisma.page.delete).not.toHaveBeenCalled();
    });

    it('should return 500 on database error', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockPrisma.page.delete.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/pages/1', {
        method: 'DELETE',
      });

      const params = Promise.resolve({ pageId: '1' });
      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to delete page');
      consoleErrorSpy.mockRestore();
    });
  });
});
