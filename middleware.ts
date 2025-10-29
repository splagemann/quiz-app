import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Rewrite /uploads/* to /api/serve-upload/*
  if (request.nextUrl.pathname.startsWith('/uploads/')) {
    const filename = request.nextUrl.pathname.replace('/uploads/', '');
    const url = request.nextUrl.clone();
    url.pathname = `/api/serve-upload/${filename}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/uploads/:path*',
};
