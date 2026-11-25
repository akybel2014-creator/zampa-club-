import { handleWooCommerceRequest } from './api/woocommerce';
import type { WorkerEnv, WorkerExecutionContext } from './types';

function jsonNotFound(message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 404,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
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
