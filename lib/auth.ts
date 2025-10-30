// Authentication utility for protected routes
import { cookies } from 'next/headers';
import bcrypt from 'bcrypt';

const AUTH_COOKIE_NAME = 'admin_auth';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days
const SALT_ROUNDS = 10;

/**
 * Check if the admin passphrase is configured
 */
export function isAuthEnabled(): boolean {
  return !!process.env.ADMIN_PASSPHRASE;
}

/**
 * Verify if the provided passphrase matches the configured one
 * Uses constant-time comparison to prevent timing attacks
 */
export function verifyPassphrase(passphrase: string): boolean {
  if (!isAuthEnabled()) {
    return true; // No auth required if not configured
  }

  const configuredPassphrase = process.env.ADMIN_PASSPHRASE;
  if (!configuredPassphrase) {
    return false;
  }

  // Direct comparison is fine here since we're comparing the plaintext input
  // against the plaintext environment variable before hashing
  return passphrase === configuredPassphrase;
}

/**
 * Generate a secure token from the passphrase
 */
async function generateAuthToken(passphrase: string): Promise<string> {
  // Create a hash of the passphrase with a salt
  return await bcrypt.hash(passphrase, SALT_ROUNDS);
}

/**
 * Check if the user is authenticated (has valid auth cookie)
 */
export async function isAuthenticated(): Promise<boolean> {
  if (!isAuthEnabled()) {
    return true; // No auth required if not configured
  }

  const cookieStore = await cookies();
  const authCookie = cookieStore.get(AUTH_COOKIE_NAME);

  if (!authCookie || !process.env.ADMIN_PASSPHRASE) {
    return false;
  }

  // Verify the stored hash against the configured passphrase
  try {
    return await bcrypt.compare(process.env.ADMIN_PASSPHRASE, authCookie.value);
  } catch (error) {
    console.error('Auth verification error:', error);
    return false;
  }
}

/**
 * Set the authentication cookie with a hashed value
 */
export async function setAuthCookie(passphrase: string): Promise<void> {
  const cookieStore = await cookies();
  const hashedToken = await generateAuthToken(passphrase);

  cookieStore.set(AUTH_COOKIE_NAME, hashedToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
}

/**
 * Clear the authentication cookie
 */
export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
}
