import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
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
      items?: { id: number; quantity: number }[];
      billing?: Record<string, string>;
      payment_method?: string;
    };

    const rawItems = Array.isArray(body.items) ? body.items : [];
    const items = rawItems
      .map((entry) => ({
        id: Number.parseInt(String(entry.id), 10),
        quantity: Math.min(Math.max(1, Number.parseInt(String(entry.quantity), 10) || 1), 99),
      }))
      .filter((entry) => Number.isFinite(entry.id) && entry.id > 0);

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
              product_id: item.id,
              quantity: item.quantity,
            })),
          }),
          signal: controller.signal,
        });

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

        res.json({
          ok: true,
          orderId: orderJson.id,
          orderNumber: orderJson.number || String(orderJson.id || ''),
          status: orderJson.status || 'pending',
          paymentUrl: orderJson.payment_url || `${storeOrigin}/pagamento/`,
        });
        return;
      }

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
        server429CooldownUntil = Date.now() + retrySec * 1000;
        res.setHeader('Retry-After', String(retrySec));
        res.status(429).json({
          error: `WooCommerce rate limit (HTTP 429). Retry in ${retrySec}s.`,
          retryAfterSeconds: retrySec,
        });
        return;
      }

      let cartToken = cartInitRes.headers.get('cart-token') || '';
      let nonce = cartInitRes.headers.get('nonce') || '';

      if (!cartInitRes.ok || !nonce) {
        res.status(502).json({
          error: 'Unable to initialize WooCommerce checkout session.',
        });
        return;
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
          body: JSON.stringify({ id: item.id, quantity: item.quantity }),
          signal: controller.signal,
        });

        const refreshedNonce = addRes.headers.get('nonce');
        const refreshedToken = addRes.headers.get('cart-token');
        if (refreshedNonce) nonce = refreshedNonce;
        if (refreshedToken) cartToken = refreshedToken;

        if (!addRes.ok) {
          const errPayload = (await addRes.json().catch(() => ({}))) as {
            message?: string;
          };
          res.status(addRes.status).json({
            error:
              errPayload.message ||
              `Failed to add product #${item.id} to WooCommerce cart (HTTP ${addRes.status}).`,
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

      const checkoutPayload = (await checkoutRes.json().catch(() => ({}))) as {
        order_id?: number;
        order_number?: string;
        status?: string;
        message?: string;
        payment_result?: { redirect_url?: string };
      };

      if (!checkoutRes.ok) {
        res.status(checkoutRes.status).json({
          error:
            checkoutPayload.message ||
            `WooCommerce checkout error (HTTP ${checkoutRes.status}).`,
        });
        return;
      }

      res.json({
        ok: true,
        orderId: checkoutPayload.order_id,
        orderNumber:
          checkoutPayload.order_number || String(checkoutPayload.order_id || ''),
        status: checkoutPayload.status || 'processing',
        paymentUrl: checkoutPayload.payment_result?.redirect_url || null,
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
