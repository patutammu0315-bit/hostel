import { SignJWT, jwtVerify } from 'jose';
import { NextRequest, NextResponse } from 'next/server';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'hostel_daily_count_secure_fallback_secret_key_2026_xyz'
);

export const AUTH_COOKIE_NAME = 'hostel_admin_session';

export interface AdminSession {
  username: string;
  role: 'admin';
  iat: number;
  exp: number;
}

/**
 * Creates a signed JWT session token valid for 7 days
 */
export async function createSessionToken(username: string): Promise<string> {
  return new SignJWT({ username, role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

/**
 * Verifies a JWT session token
 */
export async function verifySessionToken(token: string): Promise<AdminSession | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as AdminSession;
  } catch {
    return null;
  }
}

/**
 * Constant-time string equality check to mitigate timing attacks
 */
export function timingSafeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Verifies admin credentials against environment variables
 */
export function validateAdminCredentials(username?: string, password?: string): boolean {
  const configuredUser = process.env.ADMIN_USERNAME || 'admin';
  const configuredPass = process.env.ADMIN_PASSWORD || 'HostelAdminPass2026!';

  if (!username || !password) return false;
  return timingSafeCompare(username, configuredUser) && timingSafeCompare(password, configuredPass);
}

/**
 * Extracts and verifies session from NextRequest cookies
 */
export async function getAdminSessionFromRequest(request: NextRequest): Promise<AdminSession | null> {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
