import { handleWooCommerceRequest } from './api/woocommerce';
import type { WorkerEnv, WorkerExecutionContext } from './types';

const API_CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept',
  'Access-Control-Max-Age': '86400',
};

function jsonNotFound(message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 404,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...API_CORS_HEADERS,
    },
  });
}

export default {
  async fetch(
    request: Request,
    env: WorkerEnv,
    _ctx: WorkerExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);

    if (
      url.pathname === '/api/woocommerce' ||
      url.pathname.startsWith('/api/woocommerce/')
    ) {
      return handleWooCommerceRequest(request, env);
    }

    if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          status: 204,
          headers: {
            Allow: 'GET, OPTIONS',
            ...API_CORS_HEADERS,
          },
        });
      }
      return jsonNotFound('API route not found');
    }

    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response('Static assets binding (ASSETS) is not configured.', {
      status: 500,
    });
  },
};
