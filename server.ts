import 'dotenv/config';
import crypto from 'node:crypto';
import express from 'express';
import type { Request, Response } from 'express';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getCuratedReviewsForProduct } from './src/data/productReviews.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const DEFAULT_STORE_URL = 'https://zampaclub.it';
const CACHE_TTL_MS = 5 * 60 * 1000;
const DEFAULT_429_COOLDOWN_MS = 60 * 1000;

interface CacheEntry {
  ts: number;
  data: unknown;
}

const proxyCache = new Map<string, CacheEntry>();
const inFlightProxyRequests = new Map<
  string,
  Promise<{ status: number; data: unknown; retryAfterSeconds?: number }>
>();
let server429CooldownUntil = 0;

interface CustomerSessionRecord {
  sessionId: string;
  userId?: number;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  petName?: string;
  petType?: string;
  wpCookies: string;
  createdAt: number;
  expiresAt: number;
}

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const SESSION_COOKIE_NAME = 'zampa_session';
const SESSION_SECRET =
  (process.env.SESSION_SECRET || '').trim() || crypto.randomBytes(32).toString('hex');
const customerSessions = new Map<string, CustomerSessionRecord>();

function signSessionId(sessionId: string): string {
  const sig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(sessionId)
    .digest('base64url');
  return `${sessionId}.${sig}`;
}

function verifySignedSessionToken(rawToken: string): string | null {
  const trimmed = rawToken.trim();
  const dotIdx = trimmed.indexOf('.');
  if (dotIdx <= 0) return null;
  const sessionId = trimmed.slice(0, dotIdx);
  const providedSig = trimmed.slice(dotIdx + 1);
  if (!/^[a-f0-9]{32,64}$/i.test(sessionId) || !providedSig) return null;

  const expectedSig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(sessionId)
    .digest('base64url');

  const a = Buffer.from(providedSig, 'utf8');
  const b = Buffer.from(expectedSig, 'utf8');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return null;
  }
  return sessionId;
}

function parseCookieHeader(headerVal: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!headerVal) return out;
  for (const part of headerVal.split(';')) {
    const eqIdx = part.indexOf('=');
    if (eqIdx <= 0) continue;
    const key = part.slice(0, eqIdx).trim();
    const val = part.slice(eqIdx + 1).trim();
    if (key) out[key] = decodeURIComponent(val);
  }
  return out;
}

function getAuthenticatedSession(req: Request): CustomerSessionRecord | null {
  const authHeader = (req.header('authorization') || '').trim();
  let rawToken = '';
  if (authHeader.toLowerCase().startsWith('bearer ')) {
    rawToken = authHeader.slice(7).trim();
  }
  if (!rawToken) {
    const cookies = parseCookieHeader(req.header('cookie'));
    rawToken = cookies[SESSION_COOKIE_NAME] || '';
  }
  if (!rawToken) return null;

  const sessionId = verifySignedSessionToken(rawToken);
  if (!sessionId) return null;

  const record = customerSessions.get(sessionId);
  if (!record) return null;
  if (Date.now() > record.expiresAt) {
    customerSessions.delete(sessionId);
    return null;
  }
  return record;
}

function setCustomerSessionCookie(res: Response, signedToken: string): void {
  const maxAgeSec = Math.floor(SESSION_TTL_MS / 1000);
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(signedToken)}; Path=/; Max-Age=${maxAgeSec}; HttpOnly; Secure; SameSite=None; Partitioned`
  );
}

function clearCustomerSessionCookie(res: Response): void {
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=None; Partitioned`
  );
}

function isAllowedSameOriginRequest(req: Request): boolean {
  const hasXhrHeader = req.header('x-requested-with') === 'XMLHttpRequest';
  const origin = (req.header('origin') || '').trim();
  if (!origin) {
    return hasXhrHeader;
  }
  try {
    const originHost = new URL(origin).host.toLowerCase();
    const forwardedHost = (req.header('x-forwarded-host') || '').split(',')[0].trim().toLowerCase();
    const host = (req.header('host') || '').split(',')[0].trim().toLowerCase();
    if (
      (forwardedHost && originHost === forwardedHost) ||
      (host && originHost === host) ||
      originHost === `localhost:${PORT}` ||
      originHost === `127.0.0.1:${PORT}`
    ) {
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

function toPublicCustomerUser(session: CustomerSessionRecord) {
  return {
    id: session.userId,
    email: session.email,
    firstName: session.firstName,
    lastName: session.lastName,
    displayName:
      session.displayName ||
      [session.firstName, session.lastName].filter(Boolean).join(' ') ||
      session.email.split('@')[0],
    petName: session.petName || '',
    petType: session.petType || '',
  };
}

function collectSetCookiePairs(response: globalThis.Response): string[] {
  const headersAny = response.headers as unknown as {
    getSetCookie?: () => string[];
    get: (name: string) => string | null;
  };
  const rawList =
    typeof headersAny.getSetCookie === 'function'
      ? headersAny.getSetCookie()
      : headersAny.get('set-cookie')
        ? [headersAny.get('set-cookie') as string]
        : [];
  const pairs: string[] = [];
  for (const raw of rawList) {
    const firstPart = raw.split(';')[0]?.trim();
    if (firstPart && firstPart.includes('=')) {
      pairs.push(firstPart);
    }
  }
  return pairs;
}

function mergeCookieStrings(...cookieLists: string[][]): string {
  const map = new Map<string, string>();
  for (const list of cookieLists) {
    for (const pair of list) {
      const idx = pair.indexOf('=');
      if (idx > 0) {
        map.set(pair.slice(0, idx).trim(), pair.slice(idx + 1).trim());
      }
    }
  }
  return Array.from(map.entries())
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}

function extractPlainTextHtmlError(html: string): string {
  const match =
    html.match(/<div[^>]*id=["']login_error["'][^>]*>([\s\S]*?)<\/div>/i) ||
    html.match(/<ul[^>]*class=["'][^"']*woocommerce-error[^"']*["'][^>]*>([\s\S]*?)<\/ul>/i);
  const raw = match ? match[1] : '';
  return raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

async function authenticateViaWordPressLogin(
  storeOrigin: string,
  email: string,
  password: string,
  signal: AbortSignal
): Promise<{ ok: boolean; wpCookies: string; error?: string }> {
  const body = new URLSearchParams({
    log: email,
    pwd: password,
    'wp-submit': 'Log In',
    testcookie: '1',
    redirect_to: `${storeOrigin}/mio-account/`,
  });

  const loginRes = await fetch(`${storeOrigin}/wp-login.php`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'text/html,application/xhtml+xml',
      Cookie: 'wordpress_test_cookie=WP%20Cookie%20check',
      'User-Agent': 'ZampaClub-Storefront-Proxy/1.0',
    },
    body: body.toString(),
    redirect: 'manual',
    signal,
  });

  const cookiePairs = collectSetCookiePairs(loginRes);
  const hasLoggedInCookie = cookiePairs.some((c) =>
    c.startsWith('wordpress_logged_in_')
  );

  if (!hasLoggedInCookie) {
    const html = await loginRes.text().catch(() => '');
    const parsedErr = extractPlainTextHtmlError(html);
    return {
      ok: false,
      wpCookies: '',
      error: parsedErr || 'Invalid email or password. Please try again.',
    };
  }

  return {
    ok: true,
    wpCookies: mergeCookieStrings(cookiePairs),
  };
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

  const ipVersion = net.isIP(lower);
  if (ipVersion === 4) {
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
  } else if (ipVersion === 6) {
    if (
      lower === '::1' ||
      lower === '::' ||
      lower.startsWith('fc') ||
      lower.startsWith('fd') ||
      lower.startsWith('fe80:')
    ) {
      return true;
    }
  }

  return false;
}

function resolveStoreBaseUrl(): string {
  const raw = (process.env.WP_STORE_URL || DEFAULT_STORE_URL).trim();
  const parsed = new URL(raw);
  if (parsed.protocol !== 'https:') {
    throw new Error('WP_STORE_URL must use https protocol');
  }
  if (isPrivateOrBlockedHost(parsed.hostname)) {
    throw new Error('WP_STORE_URL host is not permitted');
  }
  return parsed.origin;
}

function getServerWooCredentials(): { key: string; secret: string } | null {
  const key = (process.env.WC_CONSUMER_KEY || '').trim();
  const secret = (process.env.WC_CONSUMER_SECRET || '').trim();
  if (!key || !secret) return null;
  return { key, secret };
}

function clampPerPage(raw: unknown, fallback = '100'): string {
  const n = Number.parseInt(String(raw ?? fallback), 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return String(Math.min(n, 100));
}

function extractSafeUpstreamSnippet(rawText: string, maxLen = 140): string {
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
  return Math.round(DEFAULT_429_COOLDOWN_MS / 1000);
}

async function fetchUpstreamJson(
  url: string,
  authHeader?: string
): Promise<{ status: number; data: unknown; retryAfterSeconds?: number }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 18000);

  try {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'User-Agent': 'ZampaClub-Storefront-Proxy/1.0',
    };
    if (authHeader) {
      headers.Authorization = authHeader;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers,
      signal: controller.signal,
    });

    if (response.status === 429) {
      const retrySec = parseRetryAfterSeconds(response.headers.get('retry-after'));
      server429CooldownUntil = Date.now() + retrySec * 1000;
      return {
        status: 429,
        retryAfterSeconds: retrySec,
        data: {
          error: `WooCommerce rate limit reached (HTTP 429). Please wait ${retrySec}s before retrying.`,
          retryAfterSeconds: retrySec,
        },
      };
    }

    const contentType = response.headers.get('content-type') || '';
    const rawText = await response.text();
    const isJsonContentType =
      contentType.toLowerCase().includes('application/json') ||
      contentType.toLowerCase().includes('+json');
    if (!isJsonContentType) {
      const excerpt = extractSafeUpstreamSnippet(rawText);
      const safePath = (() => {
        try {
          const u = new URL(url);
          return `${u.origin}${u.pathname}`;
        } catch {
          return 'upstream';
        }
      })();
      console.warn('[WooCommerce Server Proxy] Non-JSON upstream response', {
        upstream: safePath,
        status: response.status,
        contentType: contentType.split(';')[0].trim() || 'unknown',
        excerpt: excerpt || '(empty response)',
      });
      return {
        status: response.ok ? 502 : response.status,
        data: {
          error: `Upstream returned non-JSON response (HTTP ${response.status})${
            excerpt ? `: "${excerpt}"` : ''
          }`,
        },
      };
    }

    try {
      const data = JSON.parse(rawText);
      return { status: response.status, data };
    } catch {
      const excerpt = extractSafeUpstreamSnippet(rawText);
      return {
        status: response.ok ? 502 : response.status,
        data: {
          error: `Upstream returned invalid JSON (HTTP ${response.status})${
            excerpt ? `: "${excerpt}"` : ''
          }`,
        },
      };
    }
  } finally {
    clearTimeout(timer);
  }
}

async function handleProxyFetch(
  res: Response,
  cacheKey: string,
  upstreamUrl: string,
  authHeader?: string
): Promise<void> {
  const cached = proxyCache.get(cacheKey);
  if (cached && Date.now() - cached.ts <= CACHE_TTL_MS) {
    res.setHeader('Cache-Control', 'public, max-age=120');
    res.json(cached.data);
    return;
  }

  if (Date.now() < server429CooldownUntil) {
    if (cached) {
      res.setHeader('Cache-Control', 'public, max-age=60');
      res.json(cached.data);
      return;
    }
    const remainingSec = Math.max(
      1,
      Math.ceil((server429CooldownUntil - Date.now()) / 1000)
    );
    res.setHeader('Retry-After', String(remainingSec));
    res.status(429).json({
      error: `WooCommerce rate limit active (HTTP 429). Please wait ${remainingSec}s.`,
      retryAfterSeconds: remainingSec,
    });
    return;
  }

  try {
    let pending = inFlightProxyRequests.get(cacheKey);
    if (!pending) {
      pending = fetchUpstreamJson(upstreamUrl, authHeader).finally(() => {
        inFlightProxyRequests.delete(cacheKey);
      });
      inFlightProxyRequests.set(cacheKey, pending);
    }

    const result = await pending;
    if (result.status >= 200 && result.status < 300) {
      proxyCache.set(cacheKey, { ts: Date.now(), data: result.data });
      res.setHeader('Cache-Control', 'public, max-age=120');
      res.status(result.status).json(result.data);
      return;
    }

    if (cached && (result.status === 429 || result.status >= 500)) {
      res.setHeader('Cache-Control', 'public, max-age=60');
      res.json(cached.data);
      return;
    }

    if (result.retryAfterSeconds) {
      res.setHeader('Retry-After', String(result.retryAfterSeconds));
    }

    const errObj =
      result.data && typeof result.data === 'object'
        ? (result.data as { error?: string; message?: string; retryAfterSeconds?: number })
        : null;
    res.status(result.status).json({
      error:
        errObj?.error ||
        errObj?.message ||
        `WooCommerce upstream error (HTTP ${result.status})`,
      ...(errObj?.retryAfterSeconds ? { retryAfterSeconds: errObj.retryAfterSeconds } : {}),
    });
  } catch (err) {
    if (cached) {
      res.setHeader('Cache-Control', 'public, max-age=60');
      res.json(cached.data);
      return;
    }
    const isTimeout = err instanceof Error && err.name === 'AbortError';
    res.status(isTimeout ? 504 : 502).json({
      error: isTimeout
        ? 'WooCommerce upstream request timed out'
        : 'Unable to reach WooCommerce store',
    });
  }
}

async function startServer(): Promise<void> {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '64kb' }));

  app.use('/api', (req: Request, res: Response, next) => {
    const isAuthOrPrivateMutation =
      req.path.startsWith('/woocommerce/auth') ||
      (req.method === 'POST' && /^\/woocommerce\/products\/\d+\/reviews\/?$/.test(req.path));

    if (isAuthOrPrivateMutation) {
      const origin = (req.header('origin') || '').trim();
      if (origin && isAllowedSameOriginRequest(req)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Vary', 'Origin');
      }
    } else {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Accept, Authorization, X-Requested-With, Cart-Token, Nonce'
    );
    res.setHeader('Access-Control-Expose-Headers', 'Cart-Token, Nonce');
    res.setHeader('Access-Control-Max-Age', '86400');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });

  app.get('/api/woocommerce/health', (_req: Request, res: Response) => {
    try {
      const storeOrigin = resolveStoreBaseUrl();
      const hasCreds = Boolean(getServerWooCredentials());
      res.json({
        ok: true,
        storeOrigin,
        mode: hasCreds ? 'wc-v3-basic-auth' : 'wc-store-public',
      });
    } catch (err) {
      res.status(500).json({
        ok: false,
        error: err instanceof Error ? err.message : 'Invalid store configuration',
      });
    }
  });

  app.get('/api/woocommerce/products', async (req: Request, res: Response) => {
    let storeOrigin: string;
    try {
      storeOrigin = resolveStoreBaseUrl();
    } catch {
      res.status(500).json({ error: 'Invalid WP_STORE_URL configuration' });
      return;
    }

    const perPage = clampPerPage(req.query.per_page, '100');
    const creds = getServerWooCredentials();

    if (creds) {
      const upstream = new URL(`${storeOrigin}/wp-json/wc/v3/products`);
      upstream.searchParams.set('per_page', perPage);
      upstream.searchParams.set('status', 'publish');
      const auth = `Basic ${Buffer.from(`${creds.key}:${creds.secret}`).toString('base64')}`;
      await handleProxyFetch(res, `v3:products:${perPage}`, upstream.toString(), auth);
      return;
    }

    const storeApiUrl = new URL(`${storeOrigin}/wp-json/wc/store/v1/products`);
    storeApiUrl.searchParams.set('per_page', perPage);
    await handleProxyFetch(res, `store:products:${perPage}`, storeApiUrl.toString());
  });

  app.get(
    '/api/woocommerce/products/categories',
    async (req: Request, res: Response) => {
      let storeOrigin: string;
      try {
        storeOrigin = resolveStoreBaseUrl();
      } catch {
        res.status(500).json({ error: 'Invalid WP_STORE_URL configuration' });
        return;
      }

      const perPage = clampPerPage(req.query.per_page, '100');
      const hideEmpty = req.query.hide_empty === 'false' ? 'false' : 'true';
      const creds = getServerWooCredentials();

      if (creds) {
        const upstream = new URL(`${storeOrigin}/wp-json/wc/v3/products/categories`);
        upstream.searchParams.set('per_page', perPage);
        upstream.searchParams.set('hide_empty', hideEmpty);
        const auth = `Basic ${Buffer.from(`${creds.key}:${creds.secret}`).toString('base64')}`;
        await handleProxyFetch(
          res,
          `v3:categories:${perPage}:${hideEmpty}`,
          upstream.toString(),
          auth
        );
        return;
      }

      const storeApiUrl = new URL(`${storeOrigin}/wp-json/wc/store/v1/products/categories`);
      storeApiUrl.searchParams.set('per_page', perPage);
      await handleProxyFetch(
        res,
        `store:categories:${perPage}`,
        storeApiUrl.toString()
      );
    }
  );

  app.get(
    '/api/woocommerce/products/:id/variations',
    async (req: Request, res: Response) => {
      const productId = String(req.params.id || '').trim();
      if (!/^\d+$/.test(productId)) {
        res.status(400).json({ error: 'Invalid product ID' });
        return;
      }

      let storeOrigin: string;
      try {
        storeOrigin = resolveStoreBaseUrl();
      } catch {
        res.status(500).json({ error: 'Invalid WP_STORE_URL configuration' });
        return;
      }

      const perPage = clampPerPage(req.query.per_page, '50');
      const creds = getServerWooCredentials();

      if (creds) {
        const upstream = new URL(
          `${storeOrigin}/wp-json/wc/v3/products/${productId}/variations`
        );
        upstream.searchParams.set('per_page', perPage);
        const auth = `Basic ${Buffer.from(`${creds.key}:${creds.secret}`).toString('base64')}`;
        await handleProxyFetch(
          res,
          `v3:variations:${productId}:${perPage}`,
          upstream.toString(),
          auth
        );
        return;
      }

      const storeProductUrl = `${storeOrigin}/wp-json/wc/store/v1/products/${productId}`;
      await handleProxyFetch(res, `store:product:${productId}`, storeProductUrl);
    }
  );

  const sanitizeHeaderToken = (raw: unknown, maxLen = 2048): string => {
    if (typeof raw !== 'string') return '';
    return raw.replace(/[\r\n]/g, '').trim().slice(0, maxLen);
  };

  const sanitizeCartItemKey = (raw: unknown): string => {
    if (typeof raw !== 'string') return '';
    const trimmed = raw.trim();
    if (!trimmed || trimmed.length > 128) return '';
    return /^[a-zA-Z0-9_-]+$/.test(trimmed) ? trimmed : '';
  };

  interface ServerStoreCartData {
    items?: Array<{ key?: string; id?: number; quantity?: number }>;
    [key: string]: unknown;
  }

  const fetchServerStoreCartSession = async (
    storeOrigin: string,
    incomingToken: string,
    signal: AbortSignal
  ): Promise<{
    status: number;
    cartToken: string;
    nonce: string;
    cart: ServerStoreCartData | null;
    retryAfterSeconds?: number;
    error?: string;
  }> => {
    const response = await fetch(`${storeOrigin}/wp-json/wc/store/v1/cart`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': 'ZampaClub-Storefront-Proxy/1.0',
        ...(incomingToken ? { 'Cart-Token': incomingToken } : {}),
      },
      signal,
    });

    if (response.status === 429) {
      const retrySec = parseRetryAfterSeconds(response.headers.get('retry-after'));
      server429CooldownUntil = Date.now() + retrySec * 1000;
      return {
        status: 429,
        cartToken: incomingToken,
        nonce: '',
        cart: null,
        retryAfterSeconds: retrySec,
        error: `WooCommerce rate limit (HTTP 429). Retry in ${retrySec}s.`,
      };
    }

    const cartToken =
      sanitizeHeaderToken(response.headers.get('cart-token')) || incomingToken;
    const nonce = sanitizeHeaderToken(response.headers.get('nonce'), 128);
    const cart = (await response.json().catch(() => null)) as ServerStoreCartData | null;

    if (!response.ok) {
      return {
        status: response.status,
        cartToken,
        nonce,
        cart: null,
        error:
          cart && typeof cart.message === 'string'
            ? cart.message
            : `Unable to read WooCommerce cart (HTTP ${response.status}).`,
      };
    }

    return { status: 200, cartToken, nonce, cart };
  };

  const callServerStoreCartMutation = async (
    storeOrigin: string,
    endpoint: 'cart/add-item' | 'cart/update-item' | 'cart/remove-item',
    payload: Record<string, unknown>,
    initialToken: string,
    initialNonce: string,
    signal: AbortSignal
  ): Promise<{
    status: number;
    cartToken: string;
    nonce: string;
    cart: ServerStoreCartData | null;
    retryAfterSeconds?: number;
    error?: string;
  }> => {
    let cartToken = initialToken;
    let nonce = initialNonce;

    if (!nonce || !cartToken) {
      const session = await fetchServerStoreCartSession(storeOrigin, cartToken, signal);
      if (session.status !== 200) return session;
      cartToken = session.cartToken;
      nonce = session.nonce;
    }

    const exec = (tok: string, n: string) =>
      fetch(`${storeOrigin}/wp-json/wc/store/v1/${endpoint}`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'ZampaClub-Storefront-Proxy/1.0',
          ...(n ? { Nonce: n } : {}),
          ...(tok ? { 'Cart-Token': tok } : {}),
        },
        body: JSON.stringify(payload),
        signal,
      });

    let response = await exec(cartToken, nonce);

    if (response.status === 401 || response.status === 403) {
      const refreshed = await fetchServerStoreCartSession(storeOrigin, cartToken, signal);
      if (refreshed.status !== 200) return refreshed;
      cartToken = refreshed.cartToken;
      nonce = refreshed.nonce;
      response = await exec(cartToken, nonce);
    }

    if (response.status === 429) {
      const retrySec = parseRetryAfterSeconds(response.headers.get('retry-after'));
      server429CooldownUntil = Date.now() + retrySec * 1000;
      return {
        status: 429,
        cartToken,
        nonce,
        cart: null,
        retryAfterSeconds: retrySec,
        error: `WooCommerce rate limit (HTTP 429). Retry in ${retrySec}s.`,
      };
    }

    const nextToken =
      sanitizeHeaderToken(response.headers.get('cart-token')) || cartToken;
    const nextNonce =
      sanitizeHeaderToken(response.headers.get('nonce'), 128) || nonce;
    const json = (await response.json().catch(() => null)) as ServerStoreCartData | null;

    if (!response.ok) {
      return {
        status: response.status,
        cartToken: nextToken,
        nonce: nextNonce,
        cart: null,
        error:
          json && typeof json.message === 'string'
            ? json.message
            : `WooCommerce cart error (HTTP ${response.status}).`,
      };
    }

    return { status: 200, cartToken: nextToken, nonce: nextNonce, cart: json };
  };

  app.get('/api/woocommerce/cart', async (req: Request, res: Response) => {
    let storeOrigin: string;
    try {
      storeOrigin = resolveStoreBaseUrl();
    } catch {
      res.status(500).json({ error: 'Invalid WP_STORE_URL configuration' });
      return;
    }

    if (Date.now() < server429CooldownUntil) {
      const remainingSec = Math.max(
        1,
        Math.ceil((server429CooldownUntil - Date.now()) / 1000)
      );
      res.setHeader('Retry-After', String(remainingSec));
      res.status(429).json({
        error: `WooCommerce cart is cooling down after rate limit. Try again in ${remainingSec}s.`,
        retryAfterSeconds: remainingSec,
      });
      return;
    }

    const incomingToken = sanitizeHeaderToken(req.header('cart-token'));
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 18000);

    try {
      const session = await fetchServerStoreCartSession(
        storeOrigin,
        incomingToken,
        controller.signal
      );
      if (session.status === 429) {
        res.setHeader('Retry-After', String(session.retryAfterSeconds || 60));
        res.status(429).json({
          error: session.error,
          retryAfterSeconds: session.retryAfterSeconds,
        });
        return;
      }
      if (session.status !== 200) {
        res.status(session.status).json({ error: session.error || 'Unable to sync cart.' });
        return;
      }
      if (session.cartToken) res.setHeader('Cart-Token', session.cartToken);
      if (session.nonce) res.setHeader('Nonce', session.nonce);
      res.setHeader('Cache-Control', 'no-store');
      res.json({
        ok: true,
        cartToken: session.cartToken,
        nonce: session.nonce,
        cart: session.cart,
      });
    } catch (err) {
      const isTimeout = err instanceof Error && err.name === 'AbortError';
      res.status(isTimeout ? 504 : 502).json({
        error: isTimeout
          ? 'WooCommerce cart request timed out.'
          : 'Unable to reach WooCommerce cart API.',
      });
    } finally {
      clearTimeout(timer);
    }
  });

  app.post('/api/woocommerce/cart/add', async (req: Request, res: Response) => {
    let storeOrigin: string;
    try {
      storeOrigin = resolveStoreBaseUrl();
    } catch {
      res.status(500).json({ error: 'Invalid WP_STORE_URL configuration' });
      return;
    }

    if (Date.now() < server429CooldownUntil) {
      const remainingSec = Math.max(
        1,
        Math.ceil((server429CooldownUntil - Date.now()) / 1000)
      );
      res.setHeader('Retry-After', String(remainingSec));
      res.status(429).json({
        error: `WooCommerce cart is cooling down after rate limit. Try again in ${remainingSec}s.`,
        retryAfterSeconds: remainingSec,
      });
      return;
    }

    const body = (req.body || {}) as {
      id?: number;
      product_id?: number;
      variation_id?: number;
      quantity?: number;
    };
    const baseId = Number.parseInt(String(body.id ?? body.product_id ?? ''), 10);
    const variationIdRaw = Number.parseInt(String(body.variation_id ?? ''), 10);
    const variationId =
      Number.isFinite(variationIdRaw) && variationIdRaw > 0 && variationIdRaw !== baseId
        ? variationIdRaw
        : undefined;
    const storeItemId = variationId ?? baseId;
    const quantity = Math.min(Math.max(1, Number.parseInt(String(body.quantity ?? 1), 10) || 1), 99);

    if (!Number.isFinite(storeItemId) || storeItemId <= 0) {
      res.status(400).json({ error: 'Invalid product ID.' });
      return;
    }

    const incomingToken = sanitizeHeaderToken(req.header('cart-token'));
    const incomingNonce = sanitizeHeaderToken(req.header('nonce'), 128);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 18000);

    try {
      const result = await callServerStoreCartMutation(
        storeOrigin,
        'cart/add-item',
        { id: storeItemId, quantity },
        incomingToken,
        incomingNonce,
        controller.signal
      );

      if (result.status === 429) {
        res.setHeader('Retry-After', String(result.retryAfterSeconds || 60));
        res.status(429).json({
          error: result.error,
          retryAfterSeconds: result.retryAfterSeconds,
        });
        return;
      }
      if (result.status !== 200) {
        res.status(result.status).json({ error: result.error || 'Unable to add item to cart.' });
        return;
      }
      if (result.cartToken) res.setHeader('Cart-Token', result.cartToken);
      if (result.nonce) res.setHeader('Nonce', result.nonce);
      res.setHeader('Cache-Control', 'no-store');
      res.json({
        ok: true,
        cartToken: result.cartToken,
        nonce: result.nonce,
        cart: result.cart,
      });
    } catch (err) {
      const isTimeout = err instanceof Error && err.name === 'AbortError';
      res.status(isTimeout ? 504 : 502).json({
        error: isTimeout
          ? 'WooCommerce cart add request timed out.'
          : 'Unable to add item to WooCommerce cart.',
      });
    } finally {
      clearTimeout(timer);
    }
  });

  app.post('/api/woocommerce/cart/update', async (req: Request, res: Response) => {
    let storeOrigin: string;
    try {
      storeOrigin = resolveStoreBaseUrl();
    } catch {
      res.status(500).json({ error: 'Invalid WP_STORE_URL configuration' });
      return;
    }

    if (Date.now() < server429CooldownUntil) {
      const remainingSec = Math.max(
        1,
        Math.ceil((server429CooldownUntil - Date.now()) / 1000)
      );
      res.setHeader('Retry-After', String(remainingSec));
      res.status(429).json({
        error: `WooCommerce cart is cooling down after rate limit. Try again in ${remainingSec}s.`,
        retryAfterSeconds: remainingSec,
      });
      return;
    }

    const body = (req.body || {}) as {
      key?: string;
      id?: number;
      product_id?: number;
      variation_id?: number;
      quantity?: number;
    };
    let itemKey = sanitizeCartItemKey(body.key);
    const baseId = Number.parseInt(String(body.id ?? body.product_id ?? ''), 10);
    const variationIdRaw = Number.parseInt(String(body.variation_id ?? ''), 10);
    const storeItemId =
      Number.isFinite(variationIdRaw) && variationIdRaw > 0 && variationIdRaw !== baseId
        ? variationIdRaw
        : baseId;
    const parsedQty = Number.parseInt(String(body.quantity ?? 1), 10);
    const quantity = Number.isFinite(parsedQty) ? Math.min(Math.max(0, parsedQty), 99) : 1;

    let cartToken = sanitizeHeaderToken(req.header('cart-token'));
    let nonce = sanitizeHeaderToken(req.header('nonce'), 128);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 18000);

    try {
      if (!itemKey && Number.isFinite(storeItemId) && storeItemId > 0) {
        const session = await fetchServerStoreCartSession(
          storeOrigin,
          cartToken,
          controller.signal
        );
        if (session.status !== 200) {
          if (session.retryAfterSeconds) {
            res.setHeader('Retry-After', String(session.retryAfterSeconds));
          }
          res.status(session.status).json({
            error: session.error,
            retryAfterSeconds: session.retryAfterSeconds,
          });
          return;
        }
        cartToken = session.cartToken;
        nonce = session.nonce;
        const found = session.cart?.items?.find((i) => i.id === storeItemId);
        if (found?.key) {
          itemKey = sanitizeCartItemKey(found.key);
        } else if (quantity > 0) {
          const added = await callServerStoreCartMutation(
            storeOrigin,
            'cart/add-item',
            { id: storeItemId, quantity },
            cartToken,
            nonce,
            controller.signal
          );
          if (added.status !== 200) {
            res.status(added.status).json({ error: added.error });
            return;
          }
          if (added.cartToken) res.setHeader('Cart-Token', added.cartToken);
          if (added.nonce) res.setHeader('Nonce', added.nonce);
          res.setHeader('Cache-Control', 'no-store');
          res.json({
            ok: true,
            cartToken: added.cartToken,
            nonce: added.nonce,
            cart: added.cart,
          });
          return;
        } else {
          if (cartToken) res.setHeader('Cart-Token', cartToken);
          if (nonce) res.setHeader('Nonce', nonce);
          res.setHeader('Cache-Control', 'no-store');
          res.json({ ok: true, cartToken, nonce, cart: session.cart });
          return;
        }
      }

      if (!itemKey) {
        res.status(400).json({ error: 'Missing cart item key or product ID.' });
        return;
      }

      const endpoint = quantity <= 0 ? 'cart/remove-item' : 'cart/update-item';
      const payload = quantity <= 0 ? { key: itemKey } : { key: itemKey, quantity };
      const result = await callServerStoreCartMutation(
        storeOrigin,
        endpoint,
        payload,
        cartToken,
        nonce,
        controller.signal
      );

      if (result.status === 429) {
        res.setHeader('Retry-After', String(result.retryAfterSeconds || 60));
        res.status(429).json({
          error: result.error,
          retryAfterSeconds: result.retryAfterSeconds,
        });
        return;
      }
      if (result.status !== 200) {
        res.status(result.status).json({ error: result.error || 'Unable to update cart item.' });
        return;
      }
      if (result.cartToken) res.setHeader('Cart-Token', result.cartToken);
      if (result.nonce) res.setHeader('Nonce', result.nonce);
      res.setHeader('Cache-Control', 'no-store');
      res.json({
        ok: true,
        cartToken: result.cartToken,
        nonce: result.nonce,
        cart: result.cart,
      });
    } catch (err) {
      const isTimeout = err instanceof Error && err.name === 'AbortError';
      res.status(isTimeout ? 504 : 502).json({
        error: isTimeout
          ? 'WooCommerce cart update timed out.'
          : 'Unable to update WooCommerce cart.',
      });
    } finally {
      clearTimeout(timer);
    }
  });

  app.post('/api/woocommerce/cart/remove', async (req: Request, res: Response) => {
    let storeOrigin: string;
    try {
      storeOrigin = resolveStoreBaseUrl();
    } catch {
      res.status(500).json({ error: 'Invalid WP_STORE_URL configuration' });
      return;
    }

    if (Date.now() < server429CooldownUntil) {
      const remainingSec = Math.max(
        1,
        Math.ceil((server429CooldownUntil - Date.now()) / 1000)
      );
      res.setHeader('Retry-After', String(remainingSec));
      res.status(429).json({
        error: `WooCommerce cart is cooling down after rate limit. Try again in ${remainingSec}s.`,
        retryAfterSeconds: remainingSec,
      });
      return;
    }

    const body = (req.body || {}) as {
      key?: string;
      id?: number;
      product_id?: number;
      variation_id?: number;
    };
    let itemKey = sanitizeCartItemKey(body.key);
    const baseId = Number.parseInt(String(body.id ?? body.product_id ?? ''), 10);
    const variationIdRaw = Number.parseInt(String(body.variation_id ?? ''), 10);
    const storeItemId =
      Number.isFinite(variationIdRaw) && variationIdRaw > 0 && variationIdRaw !== baseId
        ? variationIdRaw
        : baseId;

    let cartToken = sanitizeHeaderToken(req.header('cart-token'));
    let nonce = sanitizeHeaderToken(req.header('nonce'), 128);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 18000);

    try {
      if (!itemKey && Number.isFinite(storeItemId) && storeItemId > 0) {
        const session = await fetchServerStoreCartSession(
          storeOrigin,
          cartToken,
          controller.signal
        );
        if (session.status !== 200) {
          if (session.retryAfterSeconds) {
            res.setHeader('Retry-After', String(session.retryAfterSeconds));
          }
          res.status(session.status).json({
            error: session.error,
            retryAfterSeconds: session.retryAfterSeconds,
          });
          return;
        }
        cartToken = session.cartToken;
        nonce = session.nonce;
        const found = session.cart?.items?.find((i) => i.id === storeItemId);
        if (!found?.key) {
          if (cartToken) res.setHeader('Cart-Token', cartToken);
          if (nonce) res.setHeader('Nonce', nonce);
          res.setHeader('Cache-Control', 'no-store');
          res.json({ ok: true, cartToken, nonce, cart: session.cart });
          return;
        }
        itemKey = sanitizeCartItemKey(found.key);
      }

      if (!itemKey) {
        res.status(400).json({ error: 'Missing cart item key or product ID.' });
        return;
      }

      const result = await callServerStoreCartMutation(
        storeOrigin,
        'cart/remove-item',
        { key: itemKey },
        cartToken,
        nonce,
        controller.signal
      );

      if (result.status === 429) {
        res.setHeader('Retry-After', String(result.retryAfterSeconds || 60));
        res.status(429).json({
          error: result.error,
          retryAfterSeconds: result.retryAfterSeconds,
        });
        return;
      }
      if (result.status !== 200) {
        res.status(result.status).json({ error: result.error || 'Unable to remove cart item.' });
        return;
      }
      if (result.cartToken) res.setHeader('Cart-Token', result.cartToken);
      if (result.nonce) res.setHeader('Nonce', result.nonce);
      res.setHeader('Cache-Control', 'no-store');
      res.json({
        ok: true,
        cartToken: result.cartToken,
        nonce: result.nonce,
        cart: result.cart,
      });
    } catch (err) {
      const isTimeout = err instanceof Error && err.name === 'AbortError';
      res.status(isTimeout ? 504 : 502).json({
        error: isTimeout
          ? 'WooCommerce cart remove timed out.'
          : 'Unable to remove item from WooCommerce cart.',
      });
    } finally {
      clearTimeout(timer);
    }
  });

  app.post('/api/woocommerce/checkout', async (req: Request, res: Response) => {
    let storeOrigin: string;
    try {
      storeOrigin = resolveStoreBaseUrl();
    } catch {
      res.status(500).json({ error: 'Invalid WP_STORE_URL configuration' });
      return;
    }

    if (Date.now() < server429CooldownUntil) {
      const remainingSec = Math.max(
        1,
        Math.ceil((server429CooldownUntil - Date.now()) / 1000)
      );
      res.setHeader('Retry-After', String(remainingSec));
      res.status(429).json({
        error: `WooCommerce checkout is cooling down after rate limit. Try again in ${remainingSec}s.`,
        retryAfterSeconds: remainingSec,
      });
      return;
    }

    const body = (req.body || {}) as {
      items?: {
        id?: number;
        product_id?: number;
        variation_id?: number;
        quantity: number;
      }[];
      billing?: Record<string, string>;
      payment_method?: string;
    };

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
      res.status(400).json({ error: 'Cart is empty or contains invalid product IDs.' });
      return;
    }

    const b = body.billing || {};
    const billing = {
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
      res.status(400).json({
        error: 'Please complete all required billing and shipping fields.',
      });
      return;
    }

    const sanitizeSafeStoreUrl = (rawUrl: unknown): string | null => {
      if (typeof rawUrl !== 'string' || !rawUrl.trim()) return null;
      try {
        const parsed = new URL(rawUrl.trim(), storeOrigin);
        if (parsed.protocol !== 'https:') return null;
        if (isPrivateOrBlockedHost(parsed.hostname)) return null;
        return parsed.toString();
      } catch {
        return null;
      }
    };

    const paymentMethod = String(body.payment_method || 'cod').trim() || 'cod';
    const creds = getServerWooCredentials();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 18000);

    try {
      if (creds && paymentMethod !== 'cod') {
        const auth = `Basic ${Buffer.from(`${creds.key}:${creds.secret}`).toString('base64')}`;
        const orderRes = await fetch(`${storeOrigin}/wp-json/wc/v3/orders`, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: auth,
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

        if (orderRes.status === 429) {
          const retrySec = parseRetryAfterSeconds(orderRes.headers.get('retry-after'));
          server429CooldownUntil = Date.now() + retrySec * 1000;
          res.setHeader('Retry-After', String(retrySec));
          res.status(429).json({
            error: `WooCommerce rate limit (HTTP 429). Retry in ${retrySec}s.`,
            retryAfterSeconds: retrySec,
          });
          return;
        }

        const orderJson = (await orderRes.json().catch(() => ({}))) as Record<
          string,
          unknown
        >;
        if (!orderRes.ok) {
          res.status(orderRes.status).json({
            error:
              String(orderJson.message || '') ||
              `Unable to create WooCommerce order (HTTP ${orderRes.status}).`,
          });
          return;
        }

        const orderId = orderJson.id as number | undefined;
        const orderKey = typeof orderJson.order_key === 'string' ? orderJson.order_key : undefined;
        const fallbackOrderPayUrl =
          orderId && orderKey
            ? `${storeOrigin}/pagamento/order-pay/${orderId}/?pay_for_order=true&key=${encodeURIComponent(orderKey)}`
            : `${storeOrigin}/pagamento/`;
        const safePaymentUrl =
          sanitizeSafeStoreUrl(orderJson.payment_url) || fallbackOrderPayUrl;

        res.json({
          ok: true,
          mode: 'wc-v3-orders',
          orderId,
          orderNumber: String(orderJson.number || orderId || ''),
          orderKey,
          status: String(orderJson.status || 'pending'),
          total: typeof orderJson.total === 'string' ? orderJson.total : undefined,
          currency: typeof orderJson.currency === 'string' ? orderJson.currency : undefined,
          payment_url: safePaymentUrl,
          paymentUrl: safePaymentUrl,
          checkoutUrl: safePaymentUrl,
          redirectUrl: safePaymentUrl,
        });
        return;
      }

      const incomingToken = sanitizeHeaderToken(req.header('cart-token'));
      const session = await fetchServerStoreCartSession(
        storeOrigin,
        incomingToken,
        controller.signal
      );

      if (session.status === 429) {
        res.setHeader('Retry-After', String(session.retryAfterSeconds || 60));
        res.status(429).json({
          error: session.error,
          retryAfterSeconds: session.retryAfterSeconds,
        });
        return;
      }

      let cartToken = session.cartToken;
      let nonce = session.nonce;

      if (session.status !== 200 || !nonce) {
        res.status(502).json({
          error: session.error || 'Unable to initialize WooCommerce checkout session.',
        });
        return;
      }

      const existingItemsMap = new Map<number, { key: string; quantity: number }>();
      for (const ci of session.cart?.items || []) {
        if (ci.id && ci.key) {
          existingItemsMap.set(ci.id, { key: ci.key, quantity: ci.quantity || 1 });
        }
      }

      for (const item of items) {
        const existing = existingItemsMap.get(item.storeItemId);
        if (existing && existing.quantity === item.quantity) {
          continue;
        }

        const mutation = existing
          ? await callServerStoreCartMutation(
              storeOrigin,
              'cart/update-item',
              { key: existing.key, quantity: item.quantity },
              cartToken,
              nonce,
              controller.signal
            )
          : await callServerStoreCartMutation(
              storeOrigin,
              'cart/add-item',
              { id: item.storeItemId, quantity: item.quantity },
              cartToken,
              nonce,
              controller.signal
            );

        cartToken = mutation.cartToken || cartToken;
        nonce = mutation.nonce || nonce;

        if (mutation.status === 429) {
          res.setHeader('Retry-After', String(mutation.retryAfterSeconds || 60));
          res.status(429).json({
            error: mutation.error,
            retryAfterSeconds: mutation.retryAfterSeconds,
          });
          return;
        }

        if (mutation.status !== 200) {
          res.status(mutation.status).json({
            error:
              mutation.error ||
              `Failed to sync product #${item.storeItemId} in WooCommerce cart (HTTP ${mutation.status}).`,
          });
          return;
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

      if (checkoutRes.status === 429) {
        const retrySec = parseRetryAfterSeconds(checkoutRes.headers.get('retry-after'));
        server429CooldownUntil = Date.now() + retrySec * 1000;
        res.setHeader('Retry-After', String(retrySec));
        res.status(429).json({
          error: `WooCommerce rate limit (HTTP 429). Retry in ${retrySec}s.`,
          retryAfterSeconds: retrySec,
        });
        return;
      }

      const checkoutPayload = (await checkoutRes.json().catch(() => ({}))) as {
        order_id?: number;
        order_number?: string;
        order_key?: string;
        status?: string;
        message?: string;
        payment_result?: { redirect_url?: string };
      };

      if (!checkoutRes.ok) {
        const baseMsg =
          checkoutPayload.message ||
          `WooCommerce checkout error (HTTP ${checkoutRes.status}).`;
        const hint =
          paymentMethod !== 'cod' && !creds
            ? ' Online card payment URLs require WC_CONSUMER_KEY and WC_CONSUMER_SECRET configured on the server (or select Cash on Delivery).'
            : '';
        res.status(checkoutRes.status).json({
          error: `${baseMsg}${hint}`,
        });
        return;
      }

      const safeRedirectUrl = sanitizeSafeStoreUrl(
        checkoutPayload.payment_result?.redirect_url
      );

      if (cartToken) res.setHeader('Cart-Token', cartToken);
      res.setHeader('Cache-Control', 'no-store');
      res.json({
        ok: true,
        mode: 'wc-store-api',
        cartToken,
        orderId: checkoutPayload.order_id,
        orderNumber:
          checkoutPayload.order_number || String(checkoutPayload.order_id || ''),
        orderKey: checkoutPayload.order_key,
        status: checkoutPayload.status || 'processing',
        payment_url: safeRedirectUrl,
        paymentUrl: safeRedirectUrl,
        checkoutUrl: safeRedirectUrl,
        redirectUrl: safeRedirectUrl,
      });
    } catch (err) {
      const isTimeout = err instanceof Error && err.name === 'AbortError';
      res.status(isTimeout ? 504 : 502).json({
        error: isTimeout
          ? 'WooCommerce checkout request timed out.'
          : 'Unable to complete WooCommerce API checkout.',
      });
    } finally {
      clearTimeout(timer);
    }
  });

  app.get('/api/woocommerce/auth/session', (req: Request, res: Response) => {
    const session = getAuthenticatedSession(req);
    res.setHeader('Cache-Control', 'no-store');
    if (!session) {
      res.json({ authenticated: false, user: null });
      return;
    }
    res.json({
      authenticated: true,
      user: toPublicCustomerUser(session),
    });
  });

  app.post('/api/woocommerce/auth/login', async (req: Request, res: Response) => {
    if (!isAllowedSameOriginRequest(req)) {
      res.status(403).json({ error: 'Invalid request origin.' });
      return;
    }

    let storeOrigin: string;
    try {
      storeOrigin = resolveStoreBaseUrl();
    } catch {
      res.status(500).json({ error: 'Store configuration is invalid.' });
      return;
    }

    const body = (req.body || {}) as { email?: string; password?: string };
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }
    if (!password || password.length < 4) {
      res.status(400).json({ error: 'Please enter your password.' });
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 18000);

    try {
      const loginOutcome = await authenticateViaWordPressLogin(
        storeOrigin,
        email,
        password,
        controller.signal
      );

      if (!loginOutcome.ok) {
        res.status(401).json({
          error: 'Invalid email or password. Please check your credentials and try again.',
        });
        return;
      }

      let userId: number | undefined;
      let firstName = '';
      let lastName = '';
      let petName = '';
      let petType = '';

      const creds = getServerWooCredentials();
      if (creds) {
        const auth = `Basic ${Buffer.from(`${creds.key}:${creds.secret}`).toString('base64')}`;
        const custRes = await fetch(
          `${storeOrigin}/wp-json/wc/v3/customers?email=${encodeURIComponent(email)}`,
          {
            method: 'GET',
            headers: {
              Accept: 'application/json',
              Authorization: auth,
              'User-Agent': 'ZampaClub-Storefront-Proxy/1.0',
            },
            signal: controller.signal,
          }
        ).catch(() => null);

        if (custRes && custRes.ok) {
          const customers = (await custRes.json().catch(() => [])) as Array<{
            id?: number;
            first_name?: string;
            last_name?: string;
            meta_data?: Array<{ key?: string; value?: unknown }>;
          }>;
          const match = Array.isArray(customers) ? customers[0] : undefined;
          if (match) {
            userId = match.id;
            firstName = String(match.first_name || '').trim();
            lastName = String(match.last_name || '').trim();
            const metaPetName = match.meta_data?.find((m) => m.key === 'pet_name')?.value;
            const metaPetType = match.meta_data?.find((m) => m.key === 'pet_type')?.value;
            if (typeof metaPetName === 'string') petName = metaPetName;
            if (typeof metaPetType === 'string') petType = metaPetType;
          }
        }
      }

      const sessionId = crypto.randomBytes(24).toString('hex');
      const now = Date.now();
      const session: CustomerSessionRecord = {
        sessionId,
        userId,
        email,
        firstName,
        lastName,
        displayName:
          [firstName, lastName].filter(Boolean).join(' ') || email.split('@')[0],
        petName,
        petType,
        wpCookies: loginOutcome.wpCookies,
        createdAt: now,
        expiresAt: now + SESSION_TTL_MS,
      };
      customerSessions.set(sessionId, session);

      const signedToken = signSessionId(sessionId);
      setCustomerSessionCookie(res, signedToken);
      res.setHeader('Cache-Control', 'no-store');
      res.json({
        ok: true,
        sessionToken: signedToken,
        user: toPublicCustomerUser(session),
      });
    } catch (err) {
      const isTimeout = err instanceof Error && err.name === 'AbortError';
      res.status(isTimeout ? 504 : 502).json({
        error: isTimeout
          ? 'Sign in timed out. Please try again.'
          : 'Unable to reach the store right now. Please try again.',
      });
    } finally {
      clearTimeout(timer);
    }
  });

  app.post('/api/woocommerce/auth/register', async (req: Request, res: Response) => {
    if (!isAllowedSameOriginRequest(req)) {
      res.status(403).json({ error: 'Invalid request origin.' });
      return;
    }

    let storeOrigin: string;
    try {
      storeOrigin = resolveStoreBaseUrl();
    } catch {
      res.status(500).json({ error: 'Store configuration is invalid.' });
      return;
    }

    const body = (req.body || {}) as {
      email?: string;
      password?: string;
      firstName?: string;
      lastName?: string;
      petName?: string;
      petType?: string;
    };

    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const firstName = String(body.firstName || '').trim().slice(0, 80);
    const lastName = String(body.lastName || '').trim().slice(0, 80);
    const petName = String(body.petName || '').trim().slice(0, 80);
    const petType = String(body.petType || '').trim().slice(0, 40);

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }
    if (!password || password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      return;
    }
    if (!firstName || !lastName) {
      res.status(400).json({ error: 'Please enter your first and last name.' });
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 18000);

    try {
      const creds = getServerWooCredentials();
      let userId: number | undefined;
      let wpCookies = '';

      if (creds) {
        const auth = `Basic ${Buffer.from(`${creds.key}:${creds.secret}`).toString('base64')}`;
        const usernameBase = email
          .split('@')[0]
          .replace(/[^a-zA-Z0-9._-]/g, '')
          .slice(0, 30) || 'zampamember';
        const username = `${usernameBase}_${crypto.randomBytes(2).toString('hex')}`;

        const metaData: Array<{ key: string; value: string }> = [];
        if (petName) metaData.push({ key: 'pet_name', value: petName });
        if (petType) metaData.push({ key: 'pet_type', value: petType });

        const createRes = await fetch(`${storeOrigin}/wp-json/wc/v3/customers`, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: auth,
            'User-Agent': 'ZampaClub-Storefront-Proxy/1.0',
          },
          body: JSON.stringify({
            email,
            first_name: firstName,
            last_name: lastName,
            username,
            password,
            ...(metaData.length > 0 ? { meta_data: metaData } : {}),
          }),
          signal: controller.signal,
        });

        const createJson = (await createRes.json().catch(() => ({}))) as {
          id?: number;
          code?: string;
          message?: string;
        };

        if (!createRes.ok) {
          const msg =
            createJson.code === 'registration-error-email-exists'
              ? 'An account with this email already exists. Please sign in instead.'
              : (createJson.message || 'Unable to create your account.').replace(/<[^>]+>/g, '');
          res.status(createRes.status >= 400 && createRes.status < 500 ? 400 : 502).json({
            error: msg,
          });
          return;
        }

        userId = createJson.id;
        const loginOutcome = await authenticateViaWordPressLogin(
          storeOrigin,
          email,
          password,
          controller.signal
        ).catch(() => ({ ok: false, wpCookies: '' }));
        wpCookies = loginOutcome.wpCookies;
      } else {
        // Fallback: submit native WooCommerce My Account registration form when WC REST v3 keys are not configured
        const accountPageCandidates = [`${storeOrigin}/mio-account/`, `${storeOrigin}/my-account/`];
        let registered = false;
        let lastErrorMsg = '';

        for (const accountUrl of accountPageCandidates) {
          const pageRes = await fetch(accountUrl, {
            method: 'GET',
            headers: {
              Accept: 'text/html',
              'User-Agent': 'ZampaClub-Storefront-Proxy/1.0',
            },
            signal: controller.signal,
          }).catch(() => null);

          if (!pageRes || !pageRes.ok) continue;
          const html = await pageRes.text();
          const nonceMatch = html.match(
            /name=["']woocommerce-register-nonce["'][^>]*value=["']([^"']+)["']/i
          );
          if (!nonceMatch) continue;

          const preCookies = collectSetCookiePairs(pageRes);
          const refererMatch = html.match(
            /name=["']_wp_http_referer["'][^>]*value=["']([^"']+)["']/i
          );

          const formParams = new URLSearchParams({
            email,
            password,
            'woocommerce-register-nonce': nonceMatch[1],
            _wp_http_referer: refererMatch ? refererMatch[1] : new URL(accountUrl).pathname,
            register: 'Register',
          });

          const regRes = await fetch(accountUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              Accept: 'text/html',
              Origin: storeOrigin,
              Referer: accountUrl,
              ...(preCookies.length > 0 ? { Cookie: mergeCookieStrings(preCookies) } : {}),
              'User-Agent': 'ZampaClub-Storefront-Proxy/1.0',
            },
            body: formParams.toString(),
            redirect: 'manual',
            signal: controller.signal,
          });

          const regCookies = collectSetCookiePairs(regRes);
          if (regCookies.some((c) => c.startsWith('wordpress_logged_in_'))) {
            wpCookies = mergeCookieStrings(preCookies, regCookies);
            registered = true;
            break;
          }

          const regHtml = await regRes.text().catch(() => '');
          lastErrorMsg = extractPlainTextHtmlError(regHtml);
          if (lastErrorMsg) break;
        }

        if (!registered) {
          res.status(400).json({
            error:
              lastErrorMsg ||
              'Unable to complete registration. Please check your details or sign in if you already have an account.',
          });
          return;
        }
      }

      const sessionId = crypto.randomBytes(24).toString('hex');
      const now = Date.now();
      const session: CustomerSessionRecord = {
        sessionId,
        userId,
        email,
        firstName,
        lastName,
        displayName: `${firstName} ${lastName}`.trim(),
        petName,
        petType,
        wpCookies,
        createdAt: now,
        expiresAt: now + SESSION_TTL_MS,
      };
      customerSessions.set(sessionId, session);

      const signedToken = signSessionId(sessionId);
      setCustomerSessionCookie(res, signedToken);
      res.setHeader('Cache-Control', 'no-store');
      res.status(201).json({
        ok: true,
        sessionToken: signedToken,
        user: toPublicCustomerUser(session),
      });
    } catch (err) {
      const isTimeout = err instanceof Error && err.name === 'AbortError';
      res.status(isTimeout ? 504 : 502).json({
        error: isTimeout
          ? 'Registration timed out. Please try again.'
          : 'Unable to create your account right now. Please try again.',
      });
    } finally {
      clearTimeout(timer);
    }
  });

  app.post('/api/woocommerce/auth/logout', (req: Request, res: Response) => {
    if (!isAllowedSameOriginRequest(req)) {
      res.status(403).json({ error: 'Invalid request origin.' });
      return;
    }

    const session = getAuthenticatedSession(req);
    if (session) {
      customerSessions.delete(session.sessionId);
    }
    clearCustomerSessionCookie(res);
    res.setHeader('Cache-Control', 'no-store');
    res.json({ ok: true });
  });

  app.post('/api/woocommerce/auth/pet-profile', async (req: Request, res: Response) => {
    if (!isAllowedSameOriginRequest(req)) {
      res.status(403).json({ error: 'Invalid request origin.' });
      return;
    }

    const session = getAuthenticatedSession(req);
    if (!session) {
      res.status(401).json({ error: 'Please sign in to save your pet profile.' });
      return;
    }

    const body = (req.body || {}) as { petName?: string; petType?: string };
    session.petName = String(body.petName || '').trim().slice(0, 80);
    session.petType = String(body.petType || '').trim().slice(0, 40);

    const creds = getServerWooCredentials();
    if (creds && session.userId) {
      try {
        const storeOrigin = resolveStoreBaseUrl();
        const auth = `Basic ${Buffer.from(`${creds.key}:${creds.secret}`).toString('base64')}`;
        await fetch(`${storeOrigin}/wp-json/wc/v3/customers/${session.userId}`, {
          method: 'PUT',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: auth,
            'User-Agent': 'ZampaClub-Storefront-Proxy/1.0',
          },
          body: JSON.stringify({
            meta_data: [
              { key: 'pet_name', value: session.petName },
              { key: 'pet_type', value: session.petType },
            ],
          }),
        });
      } catch {
        // Non-blocking metadata sync
      }
    }

    res.setHeader('Cache-Control', 'no-store');
    res.json({ ok: true, user: toPublicCustomerUser(session) });
  });

  app.get('/api/woocommerce/products/:id/reviews', async (req: Request, res: Response) => {
    const productIdStr = String(req.params.id || '').trim();
    if (!/^\d+$/.test(productIdStr)) {
      res.status(400).json({ error: 'Invalid product ID.' });
      return;
    }
    const productId = Number.parseInt(productIdStr, 10);
    const curatedReviews = getCuratedReviewsForProduct(productId);

    let storeOrigin: string;
    try {
      storeOrigin = resolveStoreBaseUrl();
    } catch {
      if (curatedReviews.length > 0) {
        res.json(curatedReviews);
        return;
      }
      res.status(500).json({ error: 'Store configuration is invalid.' });
      return;
    }

    const creds = getServerWooCredentials();
    const upstreamUrl = creds
      ? (() => {
          const u = new URL(`${storeOrigin}/wp-json/wc/v3/products/reviews`);
          u.searchParams.set('product', productIdStr);
          u.searchParams.set('per_page', '25');
          u.searchParams.set('status', 'approved');
          return u.toString();
        })()
      : (() => {
          const u = new URL(`${storeOrigin}/wp-json/wc/store/v1/products/reviews`);
          u.searchParams.set('product_id', productIdStr);
          u.searchParams.set('per_page', '25');
          return u.toString();
        })();

    const cacheKey = creds ? `v3:reviews:${productIdStr}` : `store:reviews:${productIdStr}`;
    const authHeader = creds
      ? `Basic ${Buffer.from(`${creds.key}:${creds.secret}`).toString('base64')}`
      : undefined;

    const cached = proxyCache.get(cacheKey);
    if (cached && Date.now() - cached.ts <= CACHE_TTL_MS && Array.isArray(cached.data)) {
      res.setHeader('Cache-Control', 'public, max-age=120');
      res.json(cached.data);
      return;
    }

    let upstreamList: Array<Record<string, unknown>> = [];
    if (Date.now() >= server429CooldownUntil) {
      try {
        const result = await fetchUpstreamJson(upstreamUrl, authHeader);
        if (result.status >= 200 && result.status < 300 && Array.isArray(result.data)) {
          upstreamList = result.data as Array<Record<string, unknown>>;
        } else if (curatedReviews.length === 0) {
          if (cached) {
            res.json(cached.data);
            return;
          }
          res.status(result.status).json(result.data);
          return;
        }
      } catch {
        if (curatedReviews.length === 0) {
          if (cached) {
            res.json(cached.data);
            return;
          }
          res.status(502).json({ error: 'Unable to reach WooCommerce store' });
          return;
        }
      }
    }

    const seenKeys = new Set(
      upstreamList.map((r) => {
        const reviewer = String(r.reviewer || '').trim().toLowerCase();
        const body = String(r.review || '').replace(/<[^>]+>/g, ' ').trim().slice(0, 32).toLowerCase();
        return `${reviewer}::${body}`;
      })
    );

    const curatedFormatted = curatedReviews
      .filter((c) => {
        const key = `${c.reviewer.trim().toLowerCase()}::${c.review.trim().slice(0, 32).toLowerCase()}`;
        return !seenKeys.has(key);
      })
      .map((c) => ({
        id: c.id,
        reviewer: c.reviewer,
        title: c.title,
        rating: c.rating,
        review: c.review,
        date_created: c.dateCreated,
        verified: Boolean(c.verified),
      }));

    const merged = [...upstreamList, ...curatedFormatted];
    proxyCache.set(cacheKey, { ts: Date.now(), data: merged });
    res.setHeader('Cache-Control', 'public, max-age=120');
    res.json(merged);
  });

  app.post('/api/woocommerce/products/:id/reviews', async (req: Request, res: Response) => {
    if (!isAllowedSameOriginRequest(req)) {
      res.status(403).json({ error: 'Invalid request origin.' });
      return;
    }

    const session = getAuthenticatedSession(req);
    if (!session) {
      res.status(401).json({ error: 'Please sign in to submit a product review.' });
      return;
    }

    const productIdStr = String(req.params.id || '').trim();
    const productId = Number.parseInt(productIdStr, 10);
    if (!/^\d+$/.test(productIdStr) || !Number.isFinite(productId) || productId <= 0) {
      res.status(400).json({ error: 'Invalid product ID.' });
      return;
    }

    const body = (req.body || {}) as { rating?: number; review?: string };
    const rating = Number.parseInt(String(body.rating ?? 5), 10);
    const reviewText = String(body.review || '').trim();

    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      res.status(400).json({ error: 'Please select a star rating between 1 and 5.' });
      return;
    }
    if (!reviewText || reviewText.length < 4 || reviewText.length > 2000) {
      res.status(400).json({ error: 'Please write a review between 4 and 2,000 characters.' });
      return;
    }

    let storeOrigin: string;
    try {
      storeOrigin = resolveStoreBaseUrl();
    } catch {
      res.status(500).json({ error: 'Store configuration is invalid.' });
      return;
    }

    const reviewerName =
      session.displayName ||
      [session.firstName, session.lastName].filter(Boolean).join(' ') ||
      session.email.split('@')[0];

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 18000);

    try {
      const creds = getServerWooCredentials();

      if (creds) {
        const auth = `Basic ${Buffer.from(`${creds.key}:${creds.secret}`).toString('base64')}`;
        const reviewRes = await fetch(`${storeOrigin}/wp-json/wc/v3/products/reviews`, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: auth,
            'User-Agent': 'ZampaClub-Storefront-Proxy/1.0',
          },
          body: JSON.stringify({
            product_id: productId,
            review: reviewText,
            reviewer: reviewerName,
            reviewer_email: session.email,
            rating,
          }),
          signal: controller.signal,
        });

        const reviewJson = (await reviewRes.json().catch(() => ({}))) as Record<
          string,
          unknown
        >;

        if (!reviewRes.ok) {
          res.status(reviewRes.status).json({
            error:
              typeof reviewJson.message === 'string'
                ? reviewJson.message.replace(/<[^>]+>/g, '')
                : 'Unable to submit your review right now.',
          });
          return;
        }

        proxyCache.delete(`v3:reviews:${productIdStr}`);
        proxyCache.delete(`store:reviews:${productIdStr}`);

        res.status(201).json({
          ok: true,
          review: {
            id: typeof reviewJson.id === 'number' ? reviewJson.id : Date.now(),
            reviewer: reviewerName,
            rating,
            review: reviewText,
            dateCreated: new Date().toISOString(),
            verified: Boolean(reviewJson.verified),
          },
        });
        return;
      }

      if (!session.wpCookies) {
        res.status(401).json({
          error: 'Your session has expired. Please sign in again to submit a review.',
        });
        return;
      }

      const commentForm = new URLSearchParams({
        comment_post_ID: productIdStr,
        comment: reviewText,
        rating: String(rating),
        comment_parent: '0',
      });

      const wpPostRes = await fetch(`${storeOrigin}/wp-comments-post.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'text/html',
          Cookie: session.wpCookies,
          Origin: storeOrigin,
          'User-Agent': 'ZampaClub-Storefront-Proxy/1.0',
        },
        body: commentForm.toString(),
        redirect: 'manual',
        signal: controller.signal,
      });

      if (wpPostRes.status >= 400) {
        const html = await wpPostRes.text().catch(() => '');
        const msg = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        res.status(wpPostRes.status === 409 ? 409 : 400).json({
          error:
            msg.slice(0, 180) ||
            'Unable to submit your review. Please make sure you have not already posted an identical review.',
        });
        return;
      }

      proxyCache.delete(`v3:reviews:${productIdStr}`);
      proxyCache.delete(`store:reviews:${productIdStr}`);

      res.status(201).json({
        ok: true,
        review: {
          id: Date.now(),
          reviewer: reviewerName,
          rating,
          review: reviewText,
          dateCreated: new Date().toISOString(),
          verified: false,
        },
      });
    } catch (err) {
      const isTimeout = err instanceof Error && err.name === 'AbortError';
      res.status(isTimeout ? 504 : 502).json({
        error: isTimeout
          ? 'Review submission timed out. Please try again.'
          : 'Unable to submit your review right now.',
      });
    } finally {
      clearTimeout(timer);
    }
  });

  app.use('/api/*', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'API route not found' });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir, { index: false }));
    app.get('*', (_req: Request, res: Response) => {
      const indexHtml = path.join(distDir, 'index.html');
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(404).send('Build output not found. Run npm run build.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Zampa Club server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
