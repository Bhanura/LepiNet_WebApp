import { NextRequest, NextResponse } from 'next/server';

const REQUEST_TIMEOUT_MS = 12000;

function getAllowedSupabaseHost(): string | null {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!baseUrl) return null;

  try {
    return new URL(baseUrl).hostname;
  } catch {
    return null;
  }
}

function isAllowedImageUrl(target: URL, allowedHost: string | null): boolean {
  if (target.protocol !== 'https:') return false;
  if (!allowedHost) return false;
  return target.hostname === allowedHost && target.pathname.includes('/storage/v1/object/');
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      signal: controller.signal,
      cache: 'force-cache',
      headers: {
        // Avoid compressed transfer edge-cases during passthrough.
        'Accept-Encoding': 'identity',
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return new NextResponse('Missing url parameter', { status: 400 });
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(targetUrl);
  } catch {
    return new NextResponse('Invalid url parameter', { status: 400 });
  }

  const allowedHost = getAllowedSupabaseHost();
  if (!isAllowedImageUrl(parsedUrl, allowedHost)) {
    return new NextResponse('URL not allowed', { status: 403 });
  }

  try {
    let upstream = await fetchWithTimeout(parsedUrl.toString(), REQUEST_TIMEOUT_MS);

    // Retry once for transient network or upstream transport failures.
    if (!upstream.ok) {
      upstream = await fetchWithTimeout(parsedUrl.toString(), REQUEST_TIMEOUT_MS);
    }

    if (!upstream.ok) {
      return new NextResponse('Failed to load image', { status: upstream.status || 502 });
    }

    const contentType = upstream.headers.get('content-type') || 'image/jpeg';
    const cacheControl = upstream.headers.get('cache-control') || 'public, max-age=3600';
    const contentLength = upstream.headers.get('content-length');
    const etag = upstream.headers.get('etag');
    const lastModified = upstream.headers.get('last-modified');

    const responseHeaders = new Headers({
      'Content-Type': contentType,
      'Cache-Control': cacheControl,
      'X-Image-Proxy': 'lepinet',
    });

    if (contentLength) responseHeaders.set('Content-Length', contentLength);
    if (etag) responseHeaders.set('ETag', etag);
    if (lastModified) responseHeaders.set('Last-Modified', lastModified);

    return new NextResponse(upstream.body, {
      status: 200,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('image-proxy error:', error);
    return new NextResponse('Image proxy error', { status: 502 });
  }
}
