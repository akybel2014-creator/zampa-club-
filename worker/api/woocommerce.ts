import type { WorkerEnv } from '../types';

const DEFAULT_STORE_URL = 'https://zampaclub.it';
const UPSTREAM_TIMEOUT_MS = 15000;

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept',
  'Access-Control-Max-Age': '86400',
};

function jsonResponse(
  body: unknown,
  status = 200,
  cacheControl = 'no-store'
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': cacheControl,
      'X-Content-Type-Options': 'nosniff',
      ...CORS_HEADERS,
    },
  });
}

function isPrivateOrBlockedHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (
    lower === 'localhost' ||
    lower.endsWith('.localhost') ||
    lower.endsWith('.local') ||
    lower === 'metadata.google.internal'
  ) {
    return true;
  }

  // IPv4 private/loopback/link-local checks
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(lower)) {
    const parts = lower.split('.').map((n) => Number.parseInt(n, 10));
    const [a, b] = parts;
    if (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168)
    ) {
      return true;
    }
  }

  // IPv6 loopback/private checks
  const stripped = lower.replace(/^\[|\]$/g, '');
  if (
    stripped === '::1' ||
    stripped === '::' ||
    stripped.startsWith('fc') ||
    stripped.startsWith('fd') ||
    stripped.startsWith('fe80:')
  ) {
    return true;
  }

  return false;
}

function resolveStoreOrigin(rawStoreUrl?: string): string {
  const candidate = (rawStoreUrl || DEFAULT_STORE_URL).trim();
  const parsed = new URL(candidate);
  if (parsed.protocol !== 'https:') {
    throw new Error('WP_STORE_URL must use https protocol');
  }
  if (isPrivateOrBlockedHost(parsed.hostname)) {
    throw new Error('WP_STORE_URL host is not permitted');
  }
  return parsed.origin;
}

function resolveSubPath(requestUrl: URL): string {
  const segments = requestUrl.pathname
    .replace(/^\/api\/woocommerce\/?/, '')
    .split('/')
    .map((s) => s.trim())
    .filter(Boolean);

  return segments.join('/');
}

function isAllowedWooPath(subPath: string): boolean {
  if (subPath === 'health') return true;
  if (subPath === 'products') return true;
  if (subPath === 'products/categories') return true;
  if (/^products\/\d+$/.test(subPath)) return true;
  if (/^products\/\d+\/variations$/.test(subPath)) return true;
  return false;
}

function encodeBasicAuth(key: string, secret: string): string {
  const raw = `${key}:${secret}`;
  const bytes = new TextEncoder().encode(raw);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return `Basic ${btoa(binary)}`;
}

function extractSafeSnippet(rawText: string, maxLen = 140): string {
  if (!rawText) return '';
  const trimmed = rawText.trim();
  const looksLikeHtml = /^<!doctype\s+html|^<html[\s>]/i.test(trimmed);
  const cleaned = trimmed
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b(ck|cs|sk|pk)_[a-zA-Z0-9]{10,}\b/gi, '[REDACTED]')
    .replace(/\b(Bearer|Basic)\s+[A-Za-z0-9+/=._-]+/gi, '$1 [REDACTED]');

  if (!cleaned && looksLikeHtml) return '[HTML document]';
  const prefix = looksLikeHtml ? '[HTML] ' : '';
  const full = `${prefix}${cleaned}`.trim();
  return full.length <= maxLen ? full : `${full.slice(0, maxLen).trimEnd()}…`;
}

function buildSafeUpstreamSearchParams(
  incomingParams: URLSearchParams,
  isV3: boolean,
  subPath: string
): URLSearchParams {
  const out = new URLSearchParams();
  const blockedParams = new Set([
    'consumer_key',
    'consumer_secret',
    'key',
    'secret',
    'token',
    'password',
    'auth',
  ]);

  incomingParams.forEach((value, key) => {
    const lowerKey = key.toLowerCase();
    if (blockedParams.has(lowerKey)) return;
    if (!isV3 && lowerKey === 'status') return;
    if (!isV3 && lowerKey === 'hide_empty') return;
    out.set(key, value);
  });

  if (out.has('per_page')) {
    const parsed = Number.parseInt(out.get('per_page') || '100', 10);
    const clamped = Number.isFinite(parsed) && parsed >= 1 ? Math.min(parsed, 100) : 100;
    out.set('per_page', String(clamped));
  } else if (subPath === 'products' || subPath === 'products/categories') {
    out.set('per_page', '100');
  }

  return out;
}

export async function handleWooCommerceRequest(
  request: Request,
  env: WorkerEnv
): Promise<Response> {
  try {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          Allow: 'GET, OPTIONS',
          ...CORS_HEADERS,
        },
      });
    }

    if (request.method !== 'GET') {
      return jsonResponse(
        { error: `Method ${request.method} not allowed. Only GET is supported.` },
        405
      );
    }

    const requestUrl = new URL(request.url);
    const subPath = resolveSubPath(requestUrl);

    if (!subPath || !isAllowedWooPath(subPath)) {
      return jsonResponse(
        { error: `Unsupported WooCommerce proxy path: /${subPath}` },
        404
      );
    }

    let storeOrigin: string;
    try {
      storeOrigin = resolveStoreOrigin(env.WP_STORE_URL);
    } catch (err) {
      return jsonResponse(
        {
          error:
            err instanceof Error ? err.message : 'Invalid WP_STORE_URL configuration',
        },
        500
      );
    }

    const consumerKey = (env.WC_CONSUMER_KEY || '').trim();
    const consumerSecret = (env.WC_CONSUMER_SECRET || '').trim();
    const hasServerCreds = Boolean(consumerKey) && Boolean(consumerSecret);

    if (subPath === 'health') {
      return jsonResponse({
        ok: true,
        storeOrigin,
        mode: hasServerCreds ? 'wc-v3-basic-auth' : 'wc-store-public',
      });
    }

    let upstreamUrl: URL;
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'User-Agent': 'ZampaClub-Storefront-Proxy/1.0',
    };

    if (hasServerCreds) {
      upstreamUrl = new URL(`${storeOrigin}/wp-json/wc/v3/${subPath}`);
      upstreamUrl.search = buildSafeUpstreamSearchParams(
        requestUrl.searchParams,
        true,
        subPath
      ).toString();
      headers.Authorization = encodeBasicAuth(consumerKey, consumerSecret);
    } else {
      const variationsMatch = subPath.match(/^products\/(\d+)\/variations$/);
      const storeSubPath = variationsMatch
        ? `products/${variationsMatch[1]}`
        : subPath;
      upstreamUrl = new URL(`${storeOrigin}/wp-json/wc/store/v1/${storeSubPath}`);
      upstreamUrl.search = buildSafeUpstreamSearchParams(
        requestUrl.searchParams,
        false,
        storeSubPath
      ).toString();
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

    try {
      const upstreamRes = await fetch(upstreamUrl.toString(), {
        method: 'GET',
        headers,
        signal: controller.signal,
      });
      clearTimeout(timer);

      const contentType = upstreamRes.headers.get('content-type') || '';
      const rawText = await upstreamRes.text();

      const isJsonContentType =
        contentType.toLowerCase().includes('application/json') ||
        contentType.toLowerCase().includes('+json');

      if (!isJsonContentType) {
        const excerpt = extractSafeSnippet(rawText);
        return jsonResponse(
          {
            error: `WooCommerce upstream returned non-JSON content (HTTP ${upstreamRes.status})${
              excerpt ? `: "${excerpt}"` : ''
            }`,
            upstreamStatus: upstreamRes.status,
          },
          502
        );
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(rawText);
      } catch {
        const excerpt = extractSafeSnippet(rawText);
        return jsonResponse(
          {
            error: `WooCommerce upstream returned invalid JSON (HTTP ${upstreamRes.status})${
              excerpt ? `: "${excerpt}"` : ''
            }`,
            upstreamStatus: upstreamRes.status,
          },
          502
        );
      }

      if (!upstreamRes.ok) {
        const errObj = parsed as { message?: string; code?: string };
        return jsonResponse(
          {
            error:
              errObj?.message ||
              `WooCommerce upstream error (HTTP ${upstreamRes.status})`,
            code: errObj?.code,
            upstreamStatus: upstreamRes.status,
          },
          upstreamRes.status
        );
      }

      return jsonResponse(parsed, upstreamRes.status, 'public, max-age=60');
    } catch (err) {
      clearTimeout(timer);
      const isTimeout = err instanceof Error && err.name === 'AbortError';
      return jsonResponse(
        {
          error: isTimeout
            ? 'WooCommerce upstream request timed out'
            : 'Unable to reach WooCommerce store from Cloudflare Worker',
        },
        isTimeout ? 504 : 502
      );
    }
  } catch {
    return jsonResponse(
      { error: 'Unexpected error in WooCommerce Worker proxy' },
      500
    );
  }
}
