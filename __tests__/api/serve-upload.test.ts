/**
 * @jest-environment node
 */

import { GET } from '@/app/api/serve-upload/[filename]/route';
import { NextRequest } from 'next/server';
import { writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

describe('/api/serve-upload/[filename]', () => {
  const testUploadDir = join(process.cwd(), 'public', 'uploads');
  const testFilename = 'test-image.png';
  const testFilePath = join(testUploadDir, testFilename);

  beforeAll(async () => {
    // Ensure upload directory exists
    if (!existsSync(testUploadDir)) {
      await mkdir(testUploadDir, { recursive: true });
    }

    // Create a test file
    const testContent = Buffer.from('fake-image-content');
    await writeFile(testFilePath, testContent);
  });

  afterAll(async () => {
    // Clean up test file
    try {
      await rm(testFilePath);
    } catch (error) {
      // Ignore if file doesn't exist
    }
  });

  it('should serve existing image file', async () => {
    const request = new NextRequest('http://localhost:3210/api/serve-upload/test-image.png');
    const params = Promise.resolve({ filename: testFilename });

    const response = await GET(request, { params });

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('image/png');
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=31536000, immutable');
  });

  it('should return 404 for non-existent file', async () => {
    const request = new NextRequest('http://localhost:3210/api/serve-upload/nonexistent.png');
    const params = Promise.resolve({ filename: 'nonexistent.png' });

    const response = await GET(request, { params });

    expect(response.status).toBe(404);
  });

  it('should return correct content type for different image formats', async () => {
    const formats = [
      { ext: 'jpg', contentType: 'image/jpeg' },
      { ext: 'jpeg', contentType: 'image/jpeg' },
      { ext: 'png', contentType: 'image/png' },
      { ext: 'gif', contentType: 'image/gif' },
      { ext: 'webp', contentType: 'image/webp' },
    ];

    for (const format of formats) {
      const filename = `test.${format.ext}`;
      const filepath = join(testUploadDir, filename);

      // Create test file
      await writeFile(filepath, Buffer.from('test'));

      const request = new NextRequest(`http://localhost:3210/api/serve-upload/${filename}`);
      const params = Promise.resolve({ filename });

      const response = await GET(request, { params });

      expect(response.headers.get('Content-Type')).toBe(format.contentType);

      // Clean up
      await rm(filepath);
    }
  });
});
