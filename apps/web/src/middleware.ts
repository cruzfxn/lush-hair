import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');

  const password = process.env.STAGING_PASSWORD;
  if (!password) return response;

  const authorization = request.headers.get('authorization');
  const expected = `Basic ${btoa(`staging:${password}`)}`;
  if (authorization === expected) return response;

  return new NextResponse('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Private staging", charset="UTF-8"',
      'X-Robots-Tag': 'noindex, nofollow, noarchive',
    },
  });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
