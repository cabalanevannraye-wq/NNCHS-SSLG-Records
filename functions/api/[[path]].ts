interface EdgeEnv {
  BACKEND_ORIGIN?: string;
}

interface PagesContext {
  request: Request;
  env: EdgeEnv;
}

const ALLOWED_ORIGINS = new Set([
  'https://sslgnnchs26.site',
  'https://www.sslgnnchs26.site',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
]);

function resolveCorsHeaders(request: Request): Headers {
  const headers = new Headers();
  const origin = request.headers.get('Origin') || '';
  if (
    origin &&
    (ALLOWED_ORIGINS.has(origin) ||
      origin.endsWith('.sslgnnchs26.site') ||
      origin.endsWith('.pages.dev'))
  ) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Vary', 'Origin');
  }
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  headers.set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  return headers;
}

export const onRequest = async (context: PagesContext): Promise<Response> => {
  const { request, env } = context;
  const corsHeaders = resolveCorsHeaders(request);

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const incomingUrl = new URL(request.url);
  const backendOrigin = (env.BACKEND_ORIGIN || '').trim().replace(/\/+$/, '');

  if (!backendOrigin) {
    if (incomingUrl.pathname === '/api/health' && request.method === 'GET') {
      corsHeaders.set('Content-Type', 'application/json');
      return new Response(
        JSON.stringify({
          status: 'ok',
          mode: 'cloudflare-pages-edge',
          backendConfigured: false,
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    corsHeaders.set('Content-Type', 'application/json');
    return new Response(
      JSON.stringify({
        error: 'Backend origin is not configured on Cloudflare Pages; using client/Drive mode.',
        fallbackSupported: true,
      }),
      { status: 503, headers: corsHeaders }
    );
  }

  const targetUrl = `${backendOrigin}${incomingUrl.pathname}${incomingUrl.search}`;
  const forwardHeaders = new Headers(request.headers);
  forwardHeaders.set('X-Forwarded-Host', incomingUrl.host);
  forwardHeaders.set('X-Forwarded-Proto', incomingUrl.protocol.replace(':', ''));

  const upstreamRes = await fetch(targetUrl, {
    method: request.method,
    headers: forwardHeaders,
    body:
      request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
  });

  const responseHeaders = new Headers(upstreamRes.headers);
  corsHeaders.forEach((value, key) => {
    responseHeaders.set(key, value);
  });

  return new Response(upstreamRes.body, {
    status: upstreamRes.status,
    statusText: upstreamRes.statusText,
    headers: responseHeaders,
  });
};
