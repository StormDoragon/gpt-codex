import { NextResponse, type NextRequest } from 'next/server';

/**
 * Per-request Content-Security-Policy with a nonce.
 *
 * Scripts only run if they carry this request's nonce (or were created by one
 * that does, via 'strict-dynamic'), so a script injected into the page by an
 * attacker is blocked. Next.js reads the nonce from the request's CSP header
 * and stamps it onto its own inline scripts, which is why the policy is set on
 * the request as well as the response, and why pages must render per request.
 */
export function middleware(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const development = process.env.NODE_ENV === 'development';

  const policy = [
    `default-src 'self'`,
    // Dev tooling (React refresh) needs eval; production never does.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development ? " 'unsafe-eval'" : ''}`,
    // React renders style="..." attributes, which need 'unsafe-inline'. Styles cannot run code.
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob:`,
    `font-src 'self'`,
    `connect-src 'self'${development ? ' ws: wss:' : ''}`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
  ].join('; ');

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', policy);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', policy);
  return response;
}

export const config = {
  // Everything except static assets, which carry no HTML to protect.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg).*)'],
};
