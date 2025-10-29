/**
 * @jest-environment node
 */

import { POST } from '@/app/api/upload/route';
import { NextRequest } from 'next/server';

describe('/api/upload', () => {
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

  it('should return error for invalid file type', async () => {
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
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
    const imageContent = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0]); // JPEG header
    const file = new File([imageContent], 'test.jpg', { type: 'image/jpeg' });
    const formData = new FormData();
    formData.append('file', file);

    const request = new NextRequest('http://localhost:3210/api/upload', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);

    // Note: This will create an actual file in the test environment
    // In a real-world scenario, you'd want to mock fs operations
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.url).toMatch(/^\/uploads\/.+\.jpg$/);
  });
});
