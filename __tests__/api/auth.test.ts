/**
 * @jest-environment node
 */

import { POST, DELETE } from '@/app/api/auth/route';
import { NextRequest } from 'next/server';
import * as auth from '@/lib/auth';

// Mock the auth module
jest.mock('@/lib/auth', () => ({
  verifyPassphrase: jest.fn(),
  setAuthCookie: jest.fn(),
  clearAuthCookie: jest.fn(),
}));

const mockAuth = auth as jest.Mocked<typeof auth>;

describe('POST /api/auth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 400 when passphrase is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: 'Passphrase is required' });
    expect(mockAuth.verifyPassphrase).not.toHaveBeenCalled();
    expect(mockAuth.setAuthCookie).not.toHaveBeenCalled();
  });

  it('should return 400 when passphrase is empty string', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth', {
      method: 'POST',
      body: JSON.stringify({ passphrase: '' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: 'Passphrase is required' });
    expect(mockAuth.verifyPassphrase).not.toHaveBeenCalled();
    expect(mockAuth.setAuthCookie).not.toHaveBeenCalled();
  });

  it('should return 401 when passphrase is incorrect', async () => {
    mockAuth.verifyPassphrase.mockReturnValue(false);

    const request = new NextRequest('http://localhost:3000/api/auth', {
      method: 'POST',
      body: JSON.stringify({ passphrase: 'wrong-passphrase' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({ error: 'Invalid passphrase' });
    expect(mockAuth.verifyPassphrase).toHaveBeenCalledWith('wrong-passphrase');
    expect(mockAuth.setAuthCookie).not.toHaveBeenCalled();
  });

  it('should return 200 and set cookie when passphrase is correct', async () => {
    mockAuth.verifyPassphrase.mockReturnValue(true);
    mockAuth.setAuthCookie.mockResolvedValue(undefined);

    const request = new NextRequest('http://localhost:3000/api/auth', {
      method: 'POST',
      body: JSON.stringify({ passphrase: 'correct-passphrase' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true });
    expect(mockAuth.verifyPassphrase).toHaveBeenCalledWith('correct-passphrase');
    expect(mockAuth.setAuthCookie).toHaveBeenCalledWith('correct-passphrase');
  });

  it('should handle special characters in passphrase', async () => {
    mockAuth.verifyPassphrase.mockReturnValue(true);
    mockAuth.setAuthCookie.mockResolvedValue(undefined);

    const specialPassphrase = 'p@ssw0rd!#$%^&*()';
    const request = new NextRequest('http://localhost:3000/api/auth', {
      method: 'POST',
      body: JSON.stringify({ passphrase: specialPassphrase }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true });
    expect(mockAuth.verifyPassphrase).toHaveBeenCalledWith(specialPassphrase);
    expect(mockAuth.setAuthCookie).toHaveBeenCalledWith(specialPassphrase);
  });

  it('should handle unicode characters in passphrase', async () => {
    mockAuth.verifyPassphrase.mockReturnValue(true);
    mockAuth.setAuthCookie.mockResolvedValue(undefined);

    const unicodePassphrase = 'パスワード123';
    const request = new NextRequest('http://localhost:3000/api/auth', {
      method: 'POST',
      body: JSON.stringify({ passphrase: unicodePassphrase }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true });
    expect(mockAuth.verifyPassphrase).toHaveBeenCalledWith(unicodePassphrase);
  });

  it('should return 500 when setAuthCookie throws error', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    mockAuth.verifyPassphrase.mockReturnValue(true);
    mockAuth.setAuthCookie.mockRejectedValue(new Error('Cookie error'));

    const request = new NextRequest('http://localhost:3000/api/auth', {
      method: 'POST',
      body: JSON.stringify({ passphrase: 'correct-passphrase' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Authentication failed' });
    expect(consoleErrorSpy).toHaveBeenCalledWith('Auth error:', expect.any(Error));

    consoleErrorSpy.mockRestore();
  });

  it('should return 500 when request body is invalid JSON', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    const request = new NextRequest('http://localhost:3000/api/auth', {
      method: 'POST',
      body: 'invalid json',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Authentication failed' });
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it('should return 500 when verifyPassphrase throws error', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    mockAuth.verifyPassphrase.mockImplementation(() => {
      throw new Error('Verification error');
    });

    const request = new NextRequest('http://localhost:3000/api/auth', {
      method: 'POST',
      body: JSON.stringify({ passphrase: 'test' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Authentication failed' });
    expect(consoleErrorSpy).toHaveBeenCalledWith('Auth error:', expect.any(Error));

    consoleErrorSpy.mockRestore();
  });
});

describe('DELETE /api/auth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 200 and clear auth cookie on successful logout', async () => {
    mockAuth.clearAuthCookie.mockResolvedValue(undefined);

    const response = await DELETE();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true });
    expect(mockAuth.clearAuthCookie).toHaveBeenCalledTimes(1);
  });

  it('should return 500 when clearAuthCookie throws error', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    mockAuth.clearAuthCookie.mockRejectedValue(new Error('Cookie deletion error'));

    const response = await DELETE();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Logout failed' });
    expect(consoleErrorSpy).toHaveBeenCalledWith('Logout error:', expect.any(Error));

    consoleErrorSpy.mockRestore();
  });

  it('should successfully logout multiple times', async () => {
    mockAuth.clearAuthCookie.mockResolvedValue(undefined);

    const response1 = await DELETE();
    const data1 = await response1.json();

    expect(response1.status).toBe(200);
    expect(data1).toEqual({ success: true });

    const response2 = await DELETE();
    const data2 = await response2.json();

    expect(response2.status).toBe(200);
    expect(data2).toEqual({ success: true });
    expect(mockAuth.clearAuthCookie).toHaveBeenCalledTimes(2);
  });
});
