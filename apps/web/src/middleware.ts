import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/forgot-password', '/reset-password'];

function decodeJwt(token: string): { alg?: string; typ?: string } | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    return JSON.parse(atob(parts[0].replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
}

function isJwt(token: string): boolean {
  const header = decodeJwt(token);
  return typeof header?.alg === 'string' && header?.typ === 'JWT';
}

function jwtRole(token: string): string | undefined {
  const parts = token.split('.');
  if (parts.length !== 3) return undefined;
  try {
    return JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))?.role;
  } catch {
    return undefined;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = request.cookies.get('mgh-access-token')?.value;

  if (!token || !isJwt(token)) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (pathname === '/' && jwtRole(token) === 'OWNER') {
    return NextResponse.redirect(new URL('/owner-overview', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
