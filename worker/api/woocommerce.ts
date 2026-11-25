import type { WorkerEnv, WorkerExecutionContext } from '../types';

const DEFAULT_STORE_URL = 'https://zampaclub.it';
const UPSTREAM_TIMEOUT_MS = 18000;
const MEMORY_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const DEFAULT_429_COOLDOWN_MS = 60 * 1000;

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept',
  'Access-Control-Max-Age': '86400',
};

interface CachedPayload {
  ts: number;
  status: number;
  data: unknown;
}

interface UpstreamFetchOutcome {
  status: number;
  data: unknown;
  retryAfterSeconds?: number;
}

const isolateMemoryCache = new Map<string, CachedPayload>();
const inFlightUpstreamRequests = new Map<string, Promise<UpstreamFetchOutcome>>();
let upstream429CooldownUntil = 0;

function jsonResponse(
  body: unknown,
  status = 200,
  cacheControl = 'no-store',
  extraHeaders: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': cacheControl,
      'X-Content-Type-Options': 'nosniff',
      ...CORS_HEADERS,
      ...extraHeaders,
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

function isAllowedGetWooPath(subPath: string): boolean {
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

function parseRetryAfterSeconds(headerVal: string | null): number {
  if (!headerVal) return Math.round(DEFAULT_429_COOLDOWN_MS / 1000);
  const asNum = Number.parseInt(headerVal, 10);
  if (Number.isFinite(asNum) && asNum > 0) {
    return Math.min(Math.max(asNum, 15), 300);
  }
  const parsedDate = Date.parse(headerVal);
  if (Number.isFinite(parsedDate)) {
    const diffSec = Math.ceil((parsedDate - Date.now()) / 1000);
    if (diffSec > 0) return Math.min(Math.max(diffSec, 15), 300);
  }
  return Math.round(DEFAULT_429_COOLDOWN_MS / 1000);
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

function getEdgeCache(): Cache | null {
  try {
    if (typeof caches !== 'undefined' && 'default' in caches) {
      return (caches as unknown as { default: Cache }).default;
    }
  } catch {
    // Ignore if Cache API is unavailable in local tests
  }
  return null;
}

async function fetchUpstreamWithCoalescing(
  cacheKey: string,
  upstreamUrl: string,
  headers: Record<string, string>
): Promise<UpstreamFetchOutcome> {
  const existing = inFlightUpstreamRequests.get(cacheKey);
  if (existing) {
    return existing;
  }

  const runPromise = (async (): Promise<UpstreamFetchOutcome> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

    try {
      const upstreamRes = await fetch(upstreamUrl, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (upstreamRes.status === 429) {
        const retrySec = parseRetryAfterSeconds(upstreamRes.headers.get('retry-after'));
        upstream429CooldownUntil = Date.now() + retrySec * 1000;
        return {
          status: 429,
          retryAfterSeconds: retrySec,
          data: {
            error: `WooCommerce rate limit reached (HTTP 429). Please wait ${retrySec}s before retrying.`,
            retryAfterSeconds: retrySec,
          },
        };
      }

      const contentType = upstreamRes.headers.get('content-type') || '';
      const rawText = await upstreamRes.text();

      const isJsonContentType =
        contentType.toLowerCase().includes('application/json') ||
        contentType.toLowerCase().includes('+json');

      if (!isJsonContentType) {
        const excerpt = extractSafeSnippet(rawText);
        return {
          status: 502,
          data: {
            error: `WooCommerce upstream returned non-JSON content (HTTP ${upstreamRes.status})${
              excerpt ? `: "${excerpt}"` : ''
            }`,
            upstreamStatus: upstreamRes.status,
          },
        };
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(rawText);
      } catch {
        const excerpt = extractSafeSnippet(rawText);
        return {
          status: 502,
          data: {
            error: `WooCommerce upstream returned invalid JSON (HTTP ${upstreamRes.status})${
              excerpt ? `: "${excerpt}"` : ''
            }`,
            upstreamStatus: upstreamRes.status,
          },
        };
      }

      if (!upstreamRes.ok) {
        const errObj = parsed as { message?: string; code?: string };
        return {
          status: upstreamRes.status,
          data: {
            error:
              errObj?.message ||
              `WooCommerce upstream error (HTTP ${upstreamRes.status})`,
            code: errObj?.code,
            upstreamStatus: upstreamRes.status,
          },
        };
      }

      isolateMemoryCache.set(cacheKey, {
        ts: Date.now(),
        status: upstreamRes.status,
        data: parsed,
      });

      return {
        status: upstreamRes.status,
        data: parsed,
      };
    } catch (err) {
      clearTimeout(timer);
      const isTimeout = err instanceof Error && err.name === 'AbortError';
      return {
        status: isTimeout ? 504 : 502,
        data: {
          error: isTimeout
            ? 'WooCommerce upstream request timed out'
            : 'Unable to reach WooCommerce store from Cloudflare Worker',
        },
      };
    } finally {
      inFlightUpstreamRequests.delete(cacheKey);
    }
  })();

  inFlightUpstreamRequests.set(cacheKey, runPromise);
  return runPromise;
}

interface CheckoutItemInput {
  id?: number;
  product_id?: number;
  variation_id?: number;
  quantity: number;
}

interface CheckoutBillingInput {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  address_1: string;
  city: string;
  postcode: string;
  country: string;
  state?: string;
}

interface CheckoutRequestBody {
  items?: CheckoutItemInput[];
  billing?: Partial<CheckoutBillingInput>;
  payment_method?: string;
}

function sanitizeSafeStoreRedirectUrl(
  rawUrl: unknown,
  storeOrigin: string
): string | null {
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) return null;
  try {
    const parsed = new URL(rawUrl.trim(), storeOrigin);
    if (parsed.protocol !== 'https:') return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

async function handleApiCheckout(
  request: Request,
  env: WorkerEnv,
  storeOrigin: string
): Promise<Response> {
  if (Date.now() < upstream429CooldownUntil) {
    const remainingSec = Math.max(
      1,
      Math.ceil((upstream429CooldownUntil - Date.now()) / 1000)
    );
    return jsonResponse(
      {
        error: `WooCommerce checkout is cooling down after rate limit. Try again in ${remainingSec}s.`,
        retryAfterSeconds: remainingSec,
      },
      429,
      'no-store',
      { 'Retry-After': String(remainingSec) }
    );
  }

  let body: CheckoutRequestBody;
  try {
    body = (await request.json()) as CheckoutRequestBody;
  } catch {
    return jsonResponse({ error: 'Invalid JSON checkout payload.' }, 400);
  }

  const rawItems = Array.isArray(body.items) ? body.items : [];
  const items = rawItems
    .map((entry) => {
      const productId = Number.parseInt(
        String(entry.product_id ?? entry.id ?? ''),
        10
      );
      const variationIdRaw = Number.parseInt(String(entry.variation_id ?? ''), 10);
      const variationId =
        Number.isFinite(variationIdRaw) && variationIdRaw > 0 && variationIdRaw !== productId
          ? variationIdRaw
          : undefined;
      const storeItemId = variationId ?? productId;
      return {
        productId,
        variationId,
        storeItemId,
        quantity: Math.min(Math.max(1, Number.parseInt(String(entry.quantity), 10) || 1), 99),
      };
    })
    .filter((entry) => Number.isFinite(entry.productId) && entry.productId > 0);

  if (items.length === 0) {
    return jsonResponse({ error: 'Cart is empty or contains invalid product IDs.' }, 400);
  }

  const b = body.billing || {};
  const billing: CheckoutBillingInput = {
    first_name: String(b.first_name || '').trim(),
    last_name: String(b.last_name || '').trim(),
    email: String(b.email || '').trim(),
    phone: String(b.phone || '').trim(),
    address_1: String(b.address_1 || '').trim(),
    city: String(b.city || '').trim(),
    postcode: String(b.postcode || '').trim(),
    country: String(b.country || 'US').trim().toUpperCase(),
    state: String(b.state || '').trim(),
  };

  if (
    !billing.first_name ||
    !billing.last_name ||
    !billing.email ||
    !billing.address_1 ||
    !billing.city ||
    !billing.postcode
  ) {
    return jsonResponse(
      { error: 'Please complete all required billing and shipping fields.' },
      400
    );
  }

  const paymentMethod = String(body.payment_method || 'cod').trim() || 'cod';
  const consumerKey = (env.WC_CONSUMER_KEY || '').trim();
  const consumerSecret = (env.WC_CONSUMER_SECRET || '').trim();
  const hasServerCreds = Boolean(consumerKey) && Boolean(consumerSecret);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    // When REST v3 credentials are configured on Worker env and online payment is requested,
    // create a real WooCommerce order and return its payment_url so the user completes payment on zampaclub.it.
    if (hasServerCreds && paymentMethod !== 'cod') {
      const orderRes = await fetch(`${storeOrigin}/wp-json/wc/v3/orders`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: encodeBasicAuth(consumerKey, consumerSecret),
          'User-Agent': 'ZampaClub-Storefront-Proxy/1.0',
        },
        body: JSON.stringify({
          payment_method: paymentMethod,
          set_paid: false,
          billing,
          shipping: {
            first_name: billing.first_name,
            last_name: billing.last_name,
            address_1: billing.address_1,
            city: billing.city,
            postcode: billing.postcode,
            country: billing.country,
            state: billing.state || '',
          },
          line_items: items.map((item) => ({
            product_id: item.productId,
            ...(item.variationId ? { variation_id: item.variationId } : {}),
            quantity: item.quantity,
          })),
        }),
        signal: controller.signal,
      });

      const orderText = await orderRes.text();
      let orderJson: Record<string, unknown> = {};
      try {
        orderJson = JSON.parse(orderText) as Record<string, unknown>;
      } catch {
        // Ignore parse error below
      }

      if (orderRes.status === 429) {
        const retrySec = parseRetryAfterSeconds(orderRes.headers.get('retry-after'));
        upstream429CooldownUntil = Date.now() + retrySec * 1000;
        return jsonResponse(
          { error: `WooCommerce rate limit (HTTP 429). Retry in ${retrySec}s.`, retryAfterSeconds: retrySec },
          429,
          'no-store',
          { 'Retry-After': String(retrySec) }
        );
      }

      if (!orderRes.ok) {
        return jsonResponse(
          {
            error:
              String(orderJson.message || '') ||
              `Unable to create WooCommerce order (HTTP ${orderRes.status}).`,
          },
          orderRes.status
        );
      }

      const orderId = orderJson.id as number | undefined;
      const orderKey = typeof orderJson.order_key === 'string' ? orderJson.order_key : undefined;
      const fallbackOrderPayUrl =
        orderId && orderKey
          ? `${storeOrigin}/pagamento/order-pay/${orderId}/?pay_for_order=true&key=${encodeURIComponent(orderKey)}`
          : `${storeOrigin}/pagamento/`;
      const safePaymentUrl =
        sanitizeSafeStoreRedirectUrl(orderJson.payment_url, storeOrigin) ||
        fallbackOrderPayUrl;

      return jsonResponse({
        ok: true,
        mode: 'wc-v3-orders',
        orderId,
        orderNumber: String(orderJson.number || orderId || ''),
        orderKey,
        status: String(orderJson.status || 'pending'),
        total: typeof orderJson.total === 'string' ? orderJson.total : undefined,
        currency: typeof orderJson.currency === 'string' ? orderJson.currency : undefined,
        paymentUrl: safePaymentUrl,
        checkoutUrl: safePaymentUrl,
        redirectUrl: safePaymentUrl,
      });
    }

    // Store API flow: 1) initialize Cart-Token + Nonce, 2) add items via API, 3) submit /checkout API
    const cartInitRes = await fetch(`${storeOrigin}/wp-json/wc/store/v1/cart`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': 'ZampaClub-Storefront-Proxy/1.0',
      },
      signal: controller.signal,
    });

    if (cartInitRes.status === 429) {
      const retrySec = parseRetryAfterSeconds(cartInitRes.headers.get('retry-after'));
      upstream429CooldownUntil = Date.now() + retrySec * 1000;
      return jsonResponse(
        { error: `WooCommerce rate limit (HTTP 429). Retry in ${retrySec}s.`, retryAfterSeconds: retrySec },
        429,
        'no-store',
        { 'Retry-After': String(retrySec) }
      );
    }

    let cartToken = cartInitRes.headers.get('cart-token') || '';
    let nonce = cartInitRes.headers.get('nonce') || '';

    if (!cartInitRes.ok || !nonce) {
      return jsonResponse(
        { error: 'Unable to initialize WooCommerce checkout session.' },
        502
      );
    }

    for (const item of items) {
      const addRes = await fetch(`${storeOrigin}/wp-json/wc/store/v1/cart/add-item`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'ZampaClub-Storefront-Proxy/1.0',
          Nonce: nonce,
          ...(cartToken ? { 'Cart-Token': cartToken } : {}),
        },
        body: JSON.stringify({
          id: item.storeItemId,
          quantity: item.quantity,
        }),
        signal: controller.signal,
      });

      const refreshedNonce = addRes.headers.get('nonce');
      const refreshedToken = addRes.headers.get('cart-token');
      if (refreshedNonce) nonce = refreshedNonce;
      if (refreshedToken) cartToken = refreshedToken;

      if (addRes.status === 429) {
        const retrySec = parseRetryAfterSeconds(addRes.headers.get('retry-after'));
        upstream429CooldownUntil = Date.now() + retrySec * 1000;
        return jsonResponse(
          { error: `WooCommerce rate limit (HTTP 429). Retry in ${retrySec}s.`, retryAfterSeconds: retrySec },
          429,
          'no-store',
          { 'Retry-After': String(retrySec) }
        );
      }

      if (!addRes.ok) {
        const errPayload = (await addRes.json().catch(() => ({}))) as { message?: string };
        return jsonResponse(
          {
            error:
              errPayload.message ||
              `Failed to add product #${item.storeItemId} to WooCommerce cart (HTTP ${addRes.status}).`,
          },
          addRes.status
        );
      }
    }

    const checkoutRes = await fetch(`${storeOrigin}/wp-json/wc/store/v1/checkout`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'ZampaClub-Storefront-Proxy/1.0',
        Nonce: nonce,
        ...(cartToken ? { 'Cart-Token': cartToken } : {}),
      },
      body: JSON.stringify({
        billing_address: billing,
        shipping_address: {
          first_name: billing.first_name,
          last_name: billing.last_name,
          address_1: billing.address_1,
          city: billing.city,
          postcode: billing.postcode,
          country: billing.country,
          state: billing.state || '',
          phone: billing.phone || '',
        },
        payment_method: paymentMethod,
      }),
      signal: controller.signal,
    });

    const checkoutPayload = (await checkoutRes.json().catch(() => ({}))) as {
      order_id?: number;
      order_number?: string;
      order_key?: string;
      status?: string;
      message?: string;
      payment_result?: {
        payment_status?: string;
        redirect_url?: string;
      };
    };

    if (checkoutRes.status === 429) {
      const retrySec = parseRetryAfterSeconds(checkoutRes.headers.get('retry-after'));
      upstream429CooldownUntil = Date.now() + retrySec * 1000;
      return jsonResponse(
        { error: `WooCommerce rate limit (HTTP 429). Retry in ${retrySec}s.`, retryAfterSeconds: retrySec },
        429,
        'no-store',
        { 'Retry-After': String(retrySec) }
      );
    }

    if (!checkoutRes.ok) {
      const baseMsg =
        checkoutPayload.message ||
        `WooCommerce checkout error (HTTP ${checkoutRes.status}).`;
      const hint =
        paymentMethod !== 'cod' && !hasServerCreds
          ? ' Online card payment URLs require WC_CONSUMER_KEY and WC_CONSUMER_SECRET configured in Worker secrets (or select Cash on Delivery).'
          : '';
      return jsonResponse(
        {
          error: `${baseMsg}${hint}`,
        },
        checkoutRes.status
      );
    }

    const safeRedirectUrl = sanitizeSafeStoreRedirectUrl(
      checkoutPayload.payment_result?.redirect_url,
      storeOrigin
    );

    return jsonResponse({
      ok: true,
      mode: 'wc-store-api',
      orderId: checkoutPayload.order_id,
      orderNumber:
        checkoutPayload.order_number || String(checkoutPayload.order_id || ''),
      orderKey: checkoutPayload.order_key,
      status: checkoutPayload.status || 'processing',
      paymentUrl: safeRedirectUrl,
      checkoutUrl: safeRedirectUrl,
      redirectUrl: safeRedirectUrl,
    });
  } catch (err) {
    const isTimeout = err instanceof Error && err.name === 'AbortError';
    return jsonResponse(
      {
        error: isTimeout
          ? 'WooCommerce checkout request timed out.'
          : 'Unable to complete WooCommerce API checkout.',
      },
      isTimeout ? 504 : 502
    );
  } finally {
    clearTimeout(timer);
  }
}

export async function handleWooCommerceRequest(
  request: Request,
  env: WorkerEnv,
  ctx?: WorkerExecutionContext
): Promise<Response> {
  try {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          Allow: 'GET, POST, OPTIONS',
          ...CORS_HEADERS,
        },
      });
    }

    const requestUrl = new URL(request.url);
    const subPath = resolveSubPath(requestUrl);

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

    if (request.method === 'POST') {
      if (subPath === 'checkout') {
        return handleApiCheckout(request, env, storeOrigin);
      }
      return jsonResponse(
        { error: `POST not supported for /${subPath}` },
        404
      );
    }

    if (request.method !== 'GET') {
      return jsonResponse(
        { error: `Method ${request.method} not allowed. Only GET and POST are supported.` },
        405
      );
    }

    if (!subPath || !isAllowedGetWooPath(subPath)) {
      return jsonResponse(
        { error: `Unsupported WooCommerce proxy path: /${subPath}` },
        404
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

    const cacheKey = `${hasServerCreds ? 'v3' : 'store'}:${upstreamUrl.toString()}`;

    // 1) Serve from Worker isolate memory cache when fresh
    const memCached = isolateMemoryCache.get(cacheKey);
    if (memCached && Date.now() - memCached.ts <= MEMORY_CACHE_TTL_MS) {
      return jsonResponse(
        memCached.data,
        memCached.status,
        'public, max-age=120, s-maxage=300'
      );
    }

    // 2) Serve from Cloudflare Edge Cache API if available
    const edgeCache = getEdgeCache();
    const edgeCacheReq = new Request(upstreamUrl.toString(), { method: 'GET' });
    if (edgeCache) {
      const edgeMatch = await edgeCache.match(edgeCacheReq);
      if (edgeMatch) {
        const clonedHeaders = new Headers(edgeMatch.headers);
        Object.entries(CORS_HEADERS).forEach(([k, v]) => clonedHeaders.set(k, v));
        return new Response(edgeMatch.body, {
          status: edgeMatch.status,
          headers: clonedHeaders,
        });
      }
    }

    // 3) Check upstream 429 cooldown circuit breaker (serve stale cache if available)
    if (Date.now() < upstream429CooldownUntil) {
      if (memCached) {
        return jsonResponse(
          memCached.data,
          200,
          'public, max-age=60, s-maxage=120'
        );
      }
      const remainingSec = Math.max(
        1,
        Math.ceil((upstream429CooldownUntil - Date.now()) / 1000)
      );
      return jsonResponse(
        {
          error: `WooCommerce rate limit active (HTTP 429). Please wait ${remainingSec}s.`,
          retryAfterSeconds: remainingSec,
        },
        429,
        'no-store',
        { 'Retry-After': String(remainingSec) }
      );
    }

    const outcome = await fetchUpstreamWithCoalescing(
      cacheKey,
      upstreamUrl.toString(),
      headers
    );

    if (outcome.status >= 200 && outcome.status < 300) {
      const response = jsonResponse(
        outcome.data,
        outcome.status,
        'public, max-age=120, s-maxage=300'
      );
      if (edgeCache && ctx) {
        ctx.waitUntil(edgeCache.put(edgeCacheReq, response.clone()));
      } else if (edgeCache) {
        await edgeCache.put(edgeCacheReq, response.clone());
      }
      return response;
    }

    // On 429 or transient 5xx, return stale isolate cache if we have one instead of failing
    if (memCached && (outcome.status === 429 || outcome.status >= 500)) {
      return jsonResponse(
        memCached.data,
        200,
        'public, max-age=60, s-maxage=120'
      );
    }

    return jsonResponse(
      outcome.data,
      outcome.status,
      'no-store',
      outcome.retryAfterSeconds
        ? { 'Retry-After': String(outcome.retryAfterSeconds) }
        : {}
    );
  } catch {
    return jsonResponse(
      { error: 'Unexpected error in WooCommerce Worker proxy' },
      500
    );
  }
}
