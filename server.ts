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
const CACHE_TTL_MS = 60 * 1000;

interface CacheEntry {
  ts: number;
  data: unknown;
}

const proxyCache = new Map<string, CacheEntry>();

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

async function fetchUpstreamJson(
  url: string,
  authHeader?: string
): Promise<{ status: number; data: unknown }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);

  try {
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    if (authHeader) {
      headers.Authorization = authHeader;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers,
      signal: controller.signal,
    });

    const contentType = response.headers.get('content-type') || '';
    const rawText = await response.text();
    if (!contentType.toLowerCase().includes('application/json')) {
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
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.json(cached.data);
    return;
  }

  try {
    const result = await fetchUpstreamJson(upstreamUrl, authHeader);
    if (result.status >= 200 && result.status < 300) {
      proxyCache.set(cacheKey, { ts: Date.now(), data: result.data });
      res.setHeader('Cache-Control', 'public, max-age=60');
      res.status(result.status).json(result.data);
      return;
    }

    res.status(result.status).json({
      error: `WooCommerce upstream error (HTTP ${result.status})`,
    });
  } catch (err) {
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
