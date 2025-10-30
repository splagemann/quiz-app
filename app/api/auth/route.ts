// Authentication API endpoint
import { NextRequest, NextResponse } from 'next/server';
import { verifyPassphrase, setAuthCookie, clearAuthCookie } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { passphrase } = await request.json();

    if (!passphrase) {
      return NextResponse.json(
        { error: 'Passphrase is required' },
        { status: 400 }
      );
    }

    if (verifyPassphrase(passphrase)) {
      await setAuthCookie(passphrase);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: 'Invalid passphrase' },
      { status: 401 }
    );
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    await clearAuthCookie();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    );
  }
}
