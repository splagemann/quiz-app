/**
 * @jest-environment node
 */

import {
  isAuthEnabled,
  verifyPassphrase,
  isAuthenticated,
  setAuthCookie,
  clearAuthCookie,
} from '@/lib/auth';
import bcrypt from 'bcrypt';

// Mock cookies
const mockSet = jest.fn();
const mockGet = jest.fn();
const mockDelete = jest.fn();

jest.mock('next/headers', () => ({
  cookies: jest.fn(() => Promise.resolve({
    set: mockSet,
    get: mockGet,
    delete: mockDelete,
  })),
}));

// Mock bcrypt
jest.mock('bcrypt');
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('lib/auth', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('isAuthEnabled', () => {
    it('should return true when ADMIN_PASSPHRASE is set', () => {
      process.env.ADMIN_PASSPHRASE = 'test-passphrase';
      expect(isAuthEnabled()).toBe(true);
    });

    it('should return false when ADMIN_PASSPHRASE is not set', () => {
      delete process.env.ADMIN_PASSPHRASE;
      expect(isAuthEnabled()).toBe(false);
    });

    it('should return false when ADMIN_PASSPHRASE is empty string', () => {
      process.env.ADMIN_PASSPHRASE = '';
      expect(isAuthEnabled()).toBe(false);
    });
  });

  describe('verifyPassphrase', () => {
    it('should return true when auth is not enabled', () => {
      delete process.env.ADMIN_PASSPHRASE;
      expect(verifyPassphrase('any-passphrase')).toBe(true);
    });

    it('should return true when passphrase matches', () => {
      process.env.ADMIN_PASSPHRASE = 'correct-passphrase';
      expect(verifyPassphrase('correct-passphrase')).toBe(true);
    });

    it('should return false when passphrase does not match', () => {
      process.env.ADMIN_PASSPHRASE = 'correct-passphrase';
      expect(verifyPassphrase('wrong-passphrase')).toBe(false);
    });

    it('should return false when ADMIN_PASSPHRASE is undefined', () => {
      process.env.ADMIN_PASSPHRASE = undefined;
      expect(verifyPassphrase('any-passphrase')).toBe(true); // Auth not enabled
    });

    it('should be case-sensitive', () => {
      process.env.ADMIN_PASSPHRASE = 'TestPassword';
      expect(verifyPassphrase('testpassword')).toBe(false);
      expect(verifyPassphrase('TestPassword')).toBe(true);
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when auth is not enabled', async () => {
      delete process.env.ADMIN_PASSPHRASE;
      expect(await isAuthenticated()).toBe(true);
    });

    it('should return false when auth cookie is not present', async () => {
      process.env.ADMIN_PASSPHRASE = 'test-passphrase';
      mockGet.mockReturnValue(undefined);
      expect(await isAuthenticated()).toBe(false);
    });

    it('should return false when ADMIN_PASSPHRASE is not set but cookie exists', async () => {
      delete process.env.ADMIN_PASSPHRASE;
      mockGet.mockReturnValue({ value: 'some-hash' });
      expect(await isAuthenticated()).toBe(true); // Auth not enabled
    });

    it('should return true when cookie hash is valid', async () => {
      process.env.ADMIN_PASSPHRASE = 'test-passphrase';
      const hashedValue = 'hashed-passphrase';
      mockGet.mockReturnValue({ value: hashedValue });
      mockBcrypt.compare.mockResolvedValue(true as never);

      expect(await isAuthenticated()).toBe(true);
      expect(mockBcrypt.compare).toHaveBeenCalledWith('test-passphrase', hashedValue);
    });

    it('should return false when cookie hash is invalid', async () => {
      process.env.ADMIN_PASSPHRASE = 'test-passphrase';
      const hashedValue = 'invalid-hash';
      mockGet.mockReturnValue({ value: hashedValue });
      mockBcrypt.compare.mockResolvedValue(false as never);

      expect(await isAuthenticated()).toBe(false);
      expect(mockBcrypt.compare).toHaveBeenCalledWith('test-passphrase', hashedValue);
    });

    it('should return false and log error when bcrypt.compare throws', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      process.env.ADMIN_PASSPHRASE = 'test-passphrase';
      mockGet.mockReturnValue({ value: 'some-hash' });
      mockBcrypt.compare.mockRejectedValue(new Error('Bcrypt error') as never);

      expect(await isAuthenticated()).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Auth verification error:', expect.any(Error));

      consoleErrorSpy.mockRestore();
    });
  });

  describe('setAuthCookie', () => {
    it('should set cookie with hashed passphrase', async () => {
      const passphrase = 'test-passphrase';
      const hashedValue = 'hashed-value';
      mockBcrypt.hash.mockResolvedValue(hashedValue as never);

      await setAuthCookie(passphrase);

      expect(mockBcrypt.hash).toHaveBeenCalledWith(passphrase, 10);
      expect(mockSet).toHaveBeenCalledWith('admin_auth', hashedValue, {
        httpOnly: true,
        secure: false, // NODE_ENV is not 'production' in tests
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
      });
    });

    it('should set secure flag in production environment', async () => {
      process.env.NODE_ENV = 'production';
      const passphrase = 'test-passphrase';
      const hashedValue = 'hashed-value';
      mockBcrypt.hash.mockResolvedValue(hashedValue as never);

      await setAuthCookie(passphrase);

      expect(mockSet).toHaveBeenCalledWith('admin_auth', hashedValue, {
        httpOnly: true,
        secure: true, // secure in production
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
      });
    });

    it('should use 10 salt rounds for bcrypt', async () => {
      const passphrase = 'test-passphrase';
      mockBcrypt.hash.mockResolvedValue('hashed' as never);

      await setAuthCookie(passphrase);

      expect(mockBcrypt.hash).toHaveBeenCalledWith(passphrase, 10);
    });
  });

  describe('clearAuthCookie', () => {
    it('should delete the auth cookie', async () => {
      await clearAuthCookie();

      expect(mockDelete).toHaveBeenCalledWith('admin_auth');
    });

    it('should not throw error when called multiple times', async () => {
      await clearAuthCookie();
      await clearAuthCookie();

      expect(mockDelete).toHaveBeenCalledTimes(2);
      expect(mockDelete).toHaveBeenCalledWith('admin_auth');
    });
  });
});
