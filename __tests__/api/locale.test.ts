/**
 * @jest-environment node
 */

import { POST, GET } from '@/app/api/locale/route';
import { NextRequest } from 'next/server';

// Mock cookies
const mockSet = jest.fn();
const mockGet = jest.fn();

jest.mock('next/headers', () => ({
  cookies: jest.fn(() => Promise.resolve({
    set: mockSet,
    get: mockGet,
  })),
}));

describe('POST /api/locale', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should set locale cookie for valid locale', async () => {
    const request = new NextRequest('http://localhost:3000/api/locale', {
      method: 'POST',
      body: JSON.stringify({ locale: 'en' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true });
    expect(mockSet).toHaveBeenCalledWith('locale', 'en', {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    });
  });

  it('should set locale cookie for German locale', async () => {
    const request = new NextRequest('http://localhost:3000/api/locale', {
      method: 'POST',
      body: JSON.stringify({ locale: 'de' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true });
    expect(mockSet).toHaveBeenCalledWith('locale', 'de', {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    });
  });

  it('should return 400 for invalid locale', async () => {
    const request = new NextRequest('http://localhost:3000/api/locale', {
      method: 'POST',
      body: JSON.stringify({ locale: 'invalid' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: 'Invalid locale' });
    expect(mockSet).not.toHaveBeenCalled();
  });

  it('should return 400 for missing locale', async () => {
    const request = new NextRequest('http://localhost:3000/api/locale', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: 'Invalid locale' });
    expect(mockSet).not.toHaveBeenCalled();
  });

  it('should return 500 on error', async () => {
    const request = new NextRequest('http://localhost:3000/api/locale', {
      method: 'POST',
      body: 'invalid json',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Failed to set locale' });
  });
});

describe('GET /api/locale', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return stored locale from cookie', async () => {
    mockGet.mockReturnValue({ value: 'de' });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ locale: 'de' });
    expect(mockGet).toHaveBeenCalledWith('locale');
  });

  it('should return default locale (en) when no cookie is set', async () => {
    mockGet.mockReturnValue(undefined);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ locale: 'en' });
    expect(mockGet).toHaveBeenCalledWith('locale');
  });

  it('should return English locale from cookie', async () => {
    mockGet.mockReturnValue({ value: 'en' });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ locale: 'en' });
  });
});
