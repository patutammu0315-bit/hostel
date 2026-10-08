import { NextRequest, NextResponse } from 'next/server';
import { validateAdminCredentials, createSessionToken, AUTH_COOKIE_NAME } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required.' },
        { status: 400 }
      );
    }

    const isValid = validateAdminCredentials(username, password);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid admin username or password.' },
        { status: 401 }
      );
    }

    const token = await createSessionToken(username);

    const response = NextResponse.json({
      success: true,
      user: { username, role: 'admin' },
    });

    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (err: any) {
    console.error('[Auth Login Error]', err?.message);
    return NextResponse.json({ error: 'Authentication failed.' }, { status: 500 });
  }
}
