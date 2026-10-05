import { headers } from 'next/headers';
import { clientIpFrom } from './client-ip';

/** The caller's address for rate limiting and security logs. Server actions and route handlers only. */
export function getClientIp(): string {
  const requestHeaders = headers();
  return clientIpFrom(
    requestHeaders.get('x-forwarded-for'),
    requestHeaders.get('x-real-ip'),
    Number(process.env.TRUSTED_PROXY_HOPS ?? 1),
  );
}
