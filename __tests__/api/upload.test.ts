/**
 * @jest-environment node
 */

import { POST } from '@/app/api/upload/route';
import { NextRequest } from 'next/server';
import { isAuthenticated } from '@/lib/auth';

// Mock authentication
jest.mock('@/lib/auth', () => ({
  isAuthenticated: jest.fn(),
}));

// Mock file system operations
jest.mock('fs/promises', () => ({
  writeFile: jest.fn(),
}));

describe('/api/upload', () => {
  const mockIsAuthenticated = isAuthenticated as jest.MockedFunction<typeof isAuthenticated>;

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock authenticated by default for existing tests
    mockIsAuthenticated.mockResolvedValue(true);
  });

  it('should return error when no file is provided', async () => {
    const formData = new FormData();
    const request = new NextRequest('http://localhost:3210/api/upload', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('No file provided');
  });

  it('should return error for invalid file type (based on magic numbers)', async () => {
    // Text file signature, not an image
    const textContent = Buffer.from('This is text');
    const file = new File([textContent], 'test.txt', { type: 'image/jpeg' }); // Fake MIME type
    const formData = new FormData();
    formData.append('file', file);

    const request = new NextRequest('http://localhost:3210/api/upload', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Invalid file type');
  });

  it('should return error for file too large', async () => {
    // Create a file larger than 5MB
    const largeContent = new Uint8Array(6 * 1024 * 1024); // 6MB
    const file = new File([largeContent], 'large.jpg', { type: 'image/jpeg' });
    const formData = new FormData();
    formData.append('file', file);

    const request = new NextRequest('http://localhost:3210/api/upload', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('File too large');
  });

  it('should accept valid image file', async () => {
    const { writeFile } = require('fs/promises');

    const imageContent = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0]); // JPEG header
    const file = new File([imageContent], 'test.jpg', { type: 'image/jpeg' });
    const formData = new FormData();
    formData.append('file', file);

    const request = new NextRequest('http://localhost:3210/api/upload', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.url).toMatch(/^\/uploads\/.+\.jpg$/);
    expect(writeFile).toHaveBeenCalled();
  });

  it('should prevent path traversal attacks', async () => {
    const { writeFile } = require('fs/promises');

    // Try to upload with path traversal in filename
    const imageContent = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0]); // JPEG header
    const file = new File([imageContent], '../../../etc/passwd.jpg', { type: 'image/jpeg' });
    const formData = new FormData();
    formData.append('file', file);

    const request = new NextRequest('http://localhost:3210/api/upload', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);

    expect(response.status).toBe(200);

    // Verify that the path was sanitized
    const data = await response.json();
    expect(data.url).toMatch(/^\/uploads\/.+\.jpg$/);
    expect(data.url).not.toContain('..');
    expect(data.url).not.toContain('/etc/');

    // Verify writeFile was called with a safe path
    expect(writeFile).toHaveBeenCalled();
    const callArgs = writeFile.mock.calls[0];
    expect(callArgs[0]).toContain('public/uploads');
    expect(callArgs[0]).not.toContain('..');
  });

  it('should return 500 error when file write fails', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    const { writeFile } = require('fs/promises');

    const imageContent = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0]); // JPEG header
    const file = new File([imageContent], 'test.jpg', { type: 'image/jpeg' });
    const formData = new FormData();
    formData.append('file', file);

    // Mock writeFile to throw an error
    writeFile.mockRejectedValue(new Error('Disk full'));

    const request = new NextRequest('http://localhost:3210/api/upload', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to upload file');
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});
