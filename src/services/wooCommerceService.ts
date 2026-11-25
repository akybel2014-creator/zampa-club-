import { isWooCommerceConfigured, WOOCOMMERCE_CONFIG } from '../config/woocommerce';
import { HERO_ASSETS } from '../data/storefrontAssets';
import {
  CartItem,
  MacroCategorySlug,
  MegaCategory,
  MegaCategoryColumn,
  MegaSubcategoryNode,
  Product,
  ProductVariation,
  WooCategory,
} from '../types/shop';

export interface CatalogFetchResult {
  products: Product[];
  source: 'woocommerce' | 'error';
  message?: string;
}

export interface CategoriesFetchResult {
  categories: WooCategory[];
  source: 'woocommerce' | 'error';
  message?: string;
}

interface WooApiCategory {
  id: number;
  name: string;
  slug: string;
  parent: number;
  count: number;
  image?: { src?: string } | null;
}

interface WooApiVariation {
  id: number;
  price: string;
  regular_price: string;
  sale_price: string;
  on_sale?: boolean;
  sku: string;
  stock_status?: string;
  attributes: { id: number; name: string; option: string }[];
  image?: { src: string };
}

interface WooStoreApiPrices {
  price?: string;
  regular_price?: string;
  sale_price?: string;
  currency_minor_unit?: number;
}

interface WooStoreApiAttribute {
  name: string;
  terms?: { name: string; slug?: string }[];
  options?: string[];
}

interface WooStoreApiVariation {
  id: number;
  attributes?: { name: string; value?: string; option?: string }[];
}

interface WooApiProduct {
  id: number;
  slug: string;
  name: string;
  type?: string;
  sku?: string;
  price?: string;
  regular_price?: string;
  sale_price?: string;
  prices?: WooStoreApiPrices;
  on_sale?: boolean;
  average_rating?: string;
  rating_count?: number;
  review_count?: number;
  total_sales?: number;
  short_description?: string;
  description?: string;
  images?: { src: string; alt?: string }[];
  categories?: { id: number; name: string; slug: string }[];
  variations?: (number | WooStoreApiVariation)[];
  attributes?: WooStoreApiAttribute[];
}

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const PRODUCTS_CACHE_KEY = 'zampaclub_wc_products_v1';
const CATEGORIES_CACHE_KEY = 'zampaclub_wc_categories_v1';
const VARIATIONS_CACHE_KEY = 'zampaclub_wc_variations_v1';
const COOLDOWN_STORAGE_KEY = 'zampaclub_wc_cooldown_v1';

let memoryProductsCache: { ts: number; data: Product[] } | null = null;
let memoryCategoriesCache: { ts: number; data: WooCategory[] } | null = null;
const memoryVariationsCache = new Map<number, { ts: number; data: ProductVariation[] }>();

let inFlightProductsPromise: Promise<CatalogFetchResult> | null = null;
let inFlightCategoriesPromise: Promise<CategoriesFetchResult> | null = null;
const inFlightVariationPromises = new Map<number, Promise<ProductVariation[] | null>>();
let inFlightCheckoutPromise: Promise<WooCheckoutResult> | null = null;

let rateLimitCooldownUntil = 0;

function readSessionCache<T>(key: string, allowStale = false): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { ts: number; data: T };
    if (!allowStale && Date.now() - parsed.ts > CACHE_TTL_MS) {
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

function writeSessionCache<T>(key: string, data: T): void {
  try {
    sessionStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }));
  } catch {
    // Ignore storage quota errors in restricted iframes
  }
}

function readPersistedVariationsMap(): Record<string, { ts: number; data: ProductVariation[] }> {
  try {
    const raw = sessionStorage.getItem(VARIATIONS_CACHE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, { ts: number; data: ProductVariation[] }>;
  } catch {
    return {};
  }
}

function writePersistedVariation(productId: number, variations: ProductVariation[]): void {
  const entry = { ts: Date.now(), data: variations };
  memoryVariationsCache.set(productId, entry);
  try {
    const map = readPersistedVariationsMap();
    map[String(productId)] = entry;
    sessionStorage.setItem(VARIATIONS_CACHE_KEY, JSON.stringify(map));
  } catch {
    // Ignore storage quota errors
  }
}

function readCachedVariation(productId: number): ProductVariation[] | null {
  const mem = memoryVariationsCache.get(productId);
  if (mem && Date.now() - mem.ts <= CACHE_TTL_MS) {
    return mem.data;
  }
  const persisted = readPersistedVariationsMap()[String(productId)];
  if (persisted && Date.now() - persisted.ts <= CACHE_TTL_MS) {
    memoryVariationsCache.set(productId, persisted);
    return persisted.data;
  }
  return null;
}

export function getRateLimitRemainingSeconds(): number {
  let until = rateLimitCooldownUntil;
  if (!until) {
    try {
      const raw = sessionStorage.getItem(COOLDOWN_STORAGE_KEY);
      if (raw) {
        const parsed = Number.parseInt(raw, 10);
        if (Number.isFinite(parsed)) {
          until = parsed;
          rateLimitCooldownUntil = parsed;
        }
      }
    } catch {
      // Ignore
    }
  }
  if (!until || Date.now() >= until) {
    return 0;
  }
  return Math.max(1, Math.ceil((until - Date.now()) / 1000));
}

function setRateLimitCooldown(seconds: number): void {
  const clamped = Math.min(Math.max(seconds, 15), 300);
  rateLimitCooldownUntil = Date.now() + clamped * 1000;
  try {
    sessionStorage.setItem(COOLDOWN_STORAGE_KEY, String(rateLimitCooldownUntil));
  } catch {
    // Ignore
  }
}

export function clearWooCommerceCache(): void {
  memoryProductsCache = null;
  memoryCategoriesCache = null;
  memoryVariationsCache.clear();
  try {
    sessionStorage.removeItem(PRODUCTS_CACHE_KEY);
    sessionStorage.removeItem(CATEGORIES_CACHE_KEY);
    sessionStorage.removeItem(VARIATIONS_CACHE_KEY);
  } catch {
    // Ignore
  }
}

export function getCachedCatalogSnapshot(): {
  products: Product[] | null;
  categories: WooCategory[] | null;
} {
  let products: Product[] | null = null;
  let categories: WooCategory[] | null = null;

  if (memoryProductsCache && Date.now() - memoryProductsCache.ts <= CACHE_TTL_MS) {
    products = memoryProductsCache.data;
  } else {
    const cachedProducts = readSessionCache<Product[]>(PRODUCTS_CACHE_KEY);
    if (cachedProducts && cachedProducts.length > 0) {
      memoryProductsCache = { ts: Date.now(), data: cachedProducts };
      products = cachedProducts;
    }
  }

  if (memoryCategoriesCache && Date.now() - memoryCategoriesCache.ts <= CACHE_TTL_MS) {
    categories = memoryCategoriesCache.data;
  } else {
    const cachedCategories = readSessionCache<WooCategory[]>(CATEGORIES_CACHE_KEY);
    if (cachedCategories && cachedCategories.length > 0) {
      memoryCategoriesCache = { ts: Date.now(), data: cachedCategories };
      categories = cachedCategories;
    }
  }

  return { products, categories };
}

class WooNetworkError extends Error {
  readonly status?: number;
  readonly isCorsOrNetwork: boolean;
  readonly isTimeout: boolean;
  readonly isRateLimited: boolean;
  readonly retryAfterSeconds?: number;

  constructor(
    message: string,
    options: {
      status?: number;
      isCorsOrNetwork?: boolean;
      isTimeout?: boolean;
      isRateLimited?: boolean;
      retryAfterSeconds?: number;
    } = {}
  ) {
    super(message);
    this.name = 'WooNetworkError';
    this.status = options.status;
    this.isCorsOrNetwork = Boolean(options.isCorsOrNetwork);
    this.isTimeout = Boolean(options.isTimeout);
    this.isRateLimited = Boolean(options.isRateLimited);
    this.retryAfterSeconds = options.retryAfterSeconds;
  }
}

function buildProxyEndpoint(
  path: string,
  params: Record<string, string> = {}
): string {
  const base = WOOCOMMERCE_CONFIG.WC_PROXY_URL.replace(/\/+$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const fullPath = `${base}${normalizedPath}`;

  const url = /^https?:\/\//i.test(fullPath)
    ? new URL(fullPath)
    : new URL(
        fullPath,
        typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
      );

  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return url.toString();
}

function buildDevStoreApiFallbackUrl(
  path: string,
  params: Record<string, string> = {}
): string {
  const storeBase = WOOCOMMERCE_CONFIG.WP_STORE_URL.replace(/\/+$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${storeBase}/wp-json/wc/store/v1${normalizedPath}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return url.toString();
}

function sanitizeUrlForDebug(rawUrl: string): string {
  try {
    const parsed = new URL(
      rawUrl,
      typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
    );
    const sensitiveParams = [
      'consumer_key',
      'consumer_secret',
      'key',
      'secret',
      'token',
      'password',
      'auth',
    ];
    for (const param of sensitiveParams) {
      if (parsed.searchParams.has(param)) {
        parsed.searchParams.set(param, '[REDACTED]');
      }
    }
    return parsed.toString();
  } catch {
    return rawUrl.split('?')[0] || 'unknown-url';
  }
}

function extractSafeBodySnippet(rawText: string, maxLen = 140): string {
  if (!rawText) return '';
  const trimmed = rawText.trim();
  const looksLikeHtml = /^<!doctype\s+html|^<html[\s>]/i.test(trimmed);

  let cleaned = trimmed
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  cleaned = cleaned
    .replace(/\b(ck|cs|sk|pk)_[a-zA-Z0-9]{10,}\b/gi, '[REDACTED]')
    .replace(/\b(Bearer|Basic)\s+[A-Za-z0-9+/=._-]+/gi, '$1 [REDACTED]');

  if (!cleaned && looksLikeHtml) {
    return '[HTML document]';
  }

  const prefix = looksLikeHtml ? '[HTML] ' : '';
  const full = `${prefix}${cleaned}`.trim();
  if (full.length <= maxLen) return full;
  return `${full.slice(0, maxLen).trimEnd()}…`;
}

function buildNonJsonErrorMessage(
  url: string,
  status: number,
  contentType: string,
  rawBody: string
): string {
  const safeUrl = sanitizeUrlForDebug(url);
  const shortType = contentType ? contentType.split(';')[0].trim() : 'unknown';
  const excerpt = extractSafeBodySnippet(rawBody);

  console.warn('[WooCommerce Proxy] Non-JSON response received', {
    url: safeUrl,
    status,
    contentType: shortType,
    excerpt: excerpt || '(empty response)',
  });

  return `Proxy endpoint returned non-JSON content (HTTP ${status}, ${shortType}) for ${safeUrl}${
    excerpt ? ` — "${excerpt}"` : ''
  }`;
}

/**
 * Fetches JSON cleanly without 429 amplification or infinite retry loops:
 * - Never retries HTTP 429 (sets a shared cooldown instead).
 * - Never retries CORS/network TypeErrors if offline, timeouts, or 4xx errors.
 * - Allows at most 1 bounded retry on transient 502/503/504 or online mobile hiccup.
 */
async function fetchJsonBounded<T>(
  url: string,
  { timeoutMs = 20000, maxRetries = 1 }: { timeoutMs?: number; maxRetries?: number } = {}
): Promise<T> {
  const remainingCooldown = getRateLimitRemainingSeconds();
  if (remainingCooldown > 0) {
    throw new WooNetworkError(
      `WooCommerce rate limit cooldown active. Please wait ${remainingCooldown}s before retrying.`,
      { status: 429, isRateLimited: true, retryAfterSeconds: remainingCooldown }
    );
  }

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new WooNetworkError(
      'You appear to be offline. Please check your mobile data or Wi-Fi connection and try again.',
      { isCorsOrNetwork: true }
    );
  }

  const boundedRetries = Math.min(Math.max(0, maxRetries), 1);

  for (let attempt = 0; attempt <= boundedRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (response.status === 429) {
        const retryHeader = Number.parseInt(response.headers.get('retry-after') || '', 10);
        const errPayload = (await response.json().catch(() => ({}))) as {
          error?: string;
          retryAfterSeconds?: number;
        };
        const retrySec =
          (Number.isFinite(retryHeader) && retryHeader > 0 ? retryHeader : 0) ||
          errPayload.retryAfterSeconds ||
          60;
        setRateLimitCooldown(retrySec);
        throw new WooNetworkError(
          errPayload.error ||
            `Too many requests to WooCommerce (HTTP 429). Please wait ${retrySec}s before retrying.`,
          { status: 429, isRateLimited: true, retryAfterSeconds: retrySec }
        );
      }

      const isTransientGatewayStatus =
        response.status === 502 ||
        response.status === 503 ||
        response.status === 504;

      if (isTransientGatewayStatus && attempt < boundedRetries) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }

      const contentType = response.headers.get('content-type') || '';
      const rawText = await response.text();
      const lowerContentType = contentType.toLowerCase();
      const isJsonContentType =
        lowerContentType.includes('application/json') ||
        lowerContentType.includes('+json');

      if (!isJsonContentType) {
        throw new WooNetworkError(
          buildNonJsonErrorMessage(url, response.status, contentType, rawText),
          { status: response.status || 502 }
        );
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(rawText);
      } catch {
        throw new WooNetworkError(
          buildNonJsonErrorMessage(url, response.status, contentType, rawText),
          { status: response.status || 502 }
        );
      }

      if (!response.ok) {
        const errBody = parsed as { error?: string; message?: string };
        const serverErrorMsg =
          errBody?.error || errBody?.message || `HTTP ${response.status}`;
        throw new WooNetworkError(serverErrorMsg, { status: response.status });
      }

      return parsed as T;
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof WooNetworkError) {
        throw err;
      }
      if (err instanceof Error && err.name === 'AbortError') {
        throw new WooNetworkError(
          `Request timed out while contacting ${sanitizeUrlForDebug(url)}.`,
          { isTimeout: true }
        );
      }

      const isStillOnline =
        typeof navigator === 'undefined' || navigator.onLine !== false;
      if (attempt < boundedRetries && isStillOnline) {
        await new Promise((resolve) => setTimeout(resolve, 600));
        continue;
      }

      throw new WooNetworkError(
        `Network or CORS error while reaching ${sanitizeUrlForDebug(url)}.`,
        { isCorsOrNetwork: true }
      );
    }
  }

  throw new WooNetworkError('Unable to load WooCommerce data.');
}

async function fetchWithDevStoreFallback<T>(
  proxyPath: string,
  proxyParams: Record<string, string>,
  devStorePath: string,
  devStoreParams: Record<string, string> = {}
): Promise<T> {
  const proxyUrl = buildProxyEndpoint(proxyPath, proxyParams);
  try {
    return await fetchJsonBounded<T>(proxyUrl, { timeoutMs: 20000, maxRetries: 1 });
  } catch (proxyErr) {
    // Only in local development, allow an unauthenticated public Store API fallback if proxy route is missing (404 / non-JSON HTML)
    const isProxyMissing =
      proxyErr instanceof WooNetworkError && proxyErr.status === 404;
    if (import.meta.env.DEV && isProxyMissing) {
      try {
        const storeUrl = buildDevStoreApiFallbackUrl(devStorePath, devStoreParams);
        return await fetchJsonBounded<T>(storeUrl, { timeoutMs: 20000, maxRetries: 0 });
      } catch {
        throw proxyErr;
      }
    }
    throw proxyErr;
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function inferIconName(slug: string, name: string): MegaCategory['iconName'] {
  const s = `${slug} ${name}`.toLowerCase();
  if (s.includes('cat') || s.includes('gatt')) return 'Cat';
  if (s.includes('travel') || s.includes('carrier') || s.includes('gear') || s.includes('viagg')) {
    return 'Luggage';
  }
  if (s.includes('food') || s.includes('treat') || s.includes('feed')) return 'Sparkles';
  if (s.includes('home') || s.includes('comfort') || s.includes('bed')) return 'Star';
  if (s.includes('tech') || s.includes('smart') || s.includes('wifi')) return 'Cpu';
  if (
    s.includes('small') ||
    s.includes('rabbit') ||
    s.includes('bird') ||
    s.includes('piccol') ||
    s.includes('conigl')
  ) {
    return 'Rabbit';
  }
  if (s.includes('deal') || s.includes('sale') || s.includes('offert')) return 'Tag';
  return 'Dog';
}

const CATEGORY_SORT_PRIORITY: Record<string, number> = {
  dog: 1,
  dogs: 1,
  cani: 1,
  cat: 2,
  cats: 2,
  gatti: 2,
  'home-comfort': 3,
  'travel-gear': 4,
  'travel-carriers': 4,
  'food-treats': 5,
  'grooming-care': 6,
  'smart-pet-tech': 7,
  'small-pets': 8,
};

const SLUG_ALIASES: Record<string, string[]> = {
  dog: ['dog', 'dogs', 'cani'],
  dogs: ['dogs', 'dog', 'cani'],
  cat: ['cat', 'cats', 'gatti'],
  cats: ['cats', 'cat', 'gatti'],
  'travel-carriers': ['travel-carriers', 'travel-gear'],
  'travel-gear': ['travel-gear', 'travel-carriers'],
};

export function sortWooCategories(categories: WooCategory[]): WooCategory[] {
  return [...categories].sort((a, b) => {
    const pa = CATEGORY_SORT_PRIORITY[a.slug.toLowerCase()] ?? 99;
    const pb = CATEGORY_SORT_PRIORITY[b.slug.toLowerCase()] ?? 99;
    if (pa !== pb) return pa - pb;
    return a.name.localeCompare(b.name);
  });
}

export function getDescendantCategoryIds(
  rootId: number,
  categories: WooCategory[]
): Set<number> {
  const ids = new Set<number>([rootId]);
  let added = true;
  while (added) {
    added = false;
    for (const cat of categories) {
      if (cat.parent !== 0 && ids.has(cat.parent) && !ids.has(cat.id)) {
        ids.add(cat.id);
        added = true;
      }
    }
  }
  return ids;
}

export function findCategoryBySlugOrAlias(
  categories: WooCategory[],
  slug: string
): WooCategory | undefined {
  const normalized = slug.toLowerCase();
  const exact = categories.find((c) => c.slug.toLowerCase() === normalized);
  if (exact) return exact;

  const aliases = SLUG_ALIASES[normalized];
  if (aliases) {
    for (const alias of aliases) {
      const match = categories.find((c) => c.slug.toLowerCase() === alias);
      if (match) return match;
    }
  }
  return undefined;
}

function mapCategorySlug(categories: { slug: string; name: string }[]): {
  slug: MacroCategorySlug;
  label: string;
} {
  const first = categories[0];
  if (!first) return { slug: 'all', label: 'All Pets' };
  return {
    slug: first.slug,
    label: decodeHtmlEntities(first.name),
  };
}

function parsePrice(val: string | undefined): number {
  const num = parseFloat((val || '').replace(',', '.'));
  return Number.isFinite(num) && num > 0 ? num : 0;
}

function parseMinorUnitPrice(
  val: string | undefined,
  minorUnit = 2
): number {
  const raw = parseFloat(val || '');
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  return raw / Math.pow(10, minorUnit);
}

function mapVariationList(
  productId: number,
  rawVariations: WooApiVariation[],
  fallbackPrice: number,
  fallbackRegular?: number
): ProductVariation[] {
  return rawVariations.map((v) => {
    const vSale = parsePrice(v.sale_price);
    const vCurr = parsePrice(v.price);
    const vReg = parsePrice(v.regular_price);
    const vEffective = (vSale > 0 ? vSale : vCurr || vReg) || fallbackPrice;
    const vRegular = vReg > vEffective ? vReg : fallbackRegular;

    const labelParts = (v.attributes || [])
      .map((a) => `${decodeHtmlEntities(a.name)}: ${decodeHtmlEntities(a.option)}`)
      .filter(Boolean);

    return {
      variation_id: v.id,
      label: labelParts.length > 0 ? labelParts.join(' · ') : `Option #${v.id}`,
      size: v.attributes?.[0]?.option,
      color: v.attributes?.[1]?.option,
      price: vEffective,
      regular_price: vRegular,
      sku: v.sku || `WC-${productId}-${v.id}`,
      in_stock: v.stock_status !== 'outofstock',
    };
  });
}

function mapStoreVariationsToList(
  productId: number,
  rawVariations: WooStoreApiVariation[],
  fallbackPrice: number,
  fallbackRegular?: number
): ProductVariation[] {
  return rawVariations.map((v, idx) => {
    const attrs = v.attributes || [];
    const labelParts = attrs
      .map((a) => {
        const val = a.value ?? a.option ?? '';
        return val
          ? `${decodeHtmlEntities(a.name)}: ${decodeHtmlEntities(val)}`
          : '';
      })
      .filter(Boolean);

    return {
      variation_id: v.id,
      label: labelParts.length > 0 ? labelParts.join(' · ') : `Option ${idx + 1}`,
      size: attrs[0]?.value ?? attrs[0]?.option,
      color: attrs[1]?.value ?? attrs[1]?.option,
      price: fallbackPrice,
      regular_price: fallbackRegular,
      sku: `WC-${productId}-${v.id}`,
      in_stock: true,
    };
  });
}

function mapWooProductToStoreProduct(wp: WooApiProduct): Product {
  let effectivePrice = 29.9;
  let effectiveRegular: number | undefined;

  if (wp.prices) {
    const minorUnit = wp.prices.currency_minor_unit ?? 2;
    const salePrice = parseMinorUnitPrice(wp.prices.sale_price, minorUnit);
    const currentPrice = parseMinorUnitPrice(wp.prices.price, minorUnit);
    const regularPrice = parseMinorUnitPrice(wp.prices.regular_price, minorUnit);
    effectivePrice =
      (salePrice > 0 ? salePrice : currentPrice || regularPrice) || 29.9;
    effectiveRegular = regularPrice > effectivePrice ? regularPrice : undefined;
  } else {
    const salePrice = parsePrice(wp.sale_price);
    const currentPrice = parsePrice(wp.price);
    const regularPrice = parsePrice(wp.regular_price);
    effectivePrice =
      (salePrice > 0 ? salePrice : currentPrice || regularPrice) || 29.9;
    effectiveRegular = regularPrice > effectivePrice ? regularPrice : undefined;
  }

  const cleanCategories = (wp.categories || []).map((c) => ({
    id: c.id,
    name: decodeHtmlEntities(c.name),
    slug: c.slug,
  }));
  const mappedCat = mapCategorySlug(cleanCategories);

  const isVariable = wp.type === 'variable' || (wp.variations && wp.variations.length > 0);
  const firstAttr = wp.attributes?.[0];
  const firstAttrOptions =
    firstAttr?.options && firstAttr.options.length > 0
      ? firstAttr.options
      : (firstAttr?.terms || []).map((t) => t.name);

  let variations: ProductVariation[];
  let hasVariations = false;

  const rawStoreVars = (wp.variations || []).filter(
    (v): v is WooStoreApiVariation => typeof v === 'object' && v !== null && 'id' in v
  );

  if (rawStoreVars.length > 0) {
    hasVariations = true;
    variations = mapStoreVariationsToList(
      wp.id,
      rawStoreVars,
      effectivePrice,
      effectiveRegular
    );
  } else if (isVariable && firstAttr && firstAttrOptions.length > 0) {
    hasVariations = true;
    variations = firstAttrOptions.map((opt, idx) => {
      const rawVar = wp.variations?.[idx];
      const varId = typeof rawVar === 'number' ? rawVar : wp.id;
      return {
        variation_id: varId,
        label: `${decodeHtmlEntities(firstAttr.name)}: ${decodeHtmlEntities(opt)}`,
        size: opt,
        price: effectivePrice,
        regular_price: effectiveRegular,
        sku: `WC-${wp.id}-${idx + 1}`,
        in_stock: true,
      };
    });
  } else if (isVariable && wp.variations && wp.variations.length > 0) {
    hasVariations = true;
    variations = wp.variations.map((v, idx) => {
      const varId = typeof v === 'number' ? v : v.id;
      return {
        variation_id: varId,
        label: `Option ${idx + 1}`,
        price: effectivePrice,
        regular_price: effectiveRegular,
        sku: `WC-${wp.id}-${varId}`,
        in_stock: true,
      };
    });
  } else {
    hasVariations = false;
    variations = [
      {
        variation_id: wp.id,
        label: 'Standard',
        price: effectivePrice,
        regular_price: effectiveRegular,
        sku: wp.sku || `WC-${wp.id}`,
        in_stock: true,
      },
    ];
  }

  const uniqueImages = Array.from(
    new Set((wp.images || []).map((img) => img.src).filter(Boolean))
  );

  const ratingCount = wp.rating_count ?? wp.review_count ?? 0;

  return {
    id: wp.id,
    slug: wp.slug,
    name: decodeHtmlEntities(wp.name),
    brand: 'Zampa Club',
    categoryIds: cleanCategories.map((c) => c.id),
    categories: cleanCategories,
    categorySlug: mappedCat.slug,
    categoryLabel: mappedCat.label,
    subcategories: cleanCategories.map((c) => c.name),
    price: effectivePrice,
    regular_price: effectiveRegular,
    rating: parseFloat(wp.average_rating || '4.8') || 4.8,
    reviews_count: ratingCount,
    sales_count: wp.total_sales || 0,
    short_description:
      decodeHtmlEntities(stripHtml(wp.short_description || '')) ||
      decodeHtmlEntities(stripHtml(wp.description || '').slice(0, 140)) ||
      'Curated pet product from Zampa Club.',
    description:
      decodeHtmlEntities(stripHtml(wp.description || '')) ||
      decodeHtmlEntities(stripHtml(wp.short_description || '')) ||
      'Premium pet accessory available at Zampa Club.',
    specs: [
      { label: 'Product ID', value: `#${wp.id}` },
      {
        label: 'Categories',
        value: cleanCategories.map((c) => c.name).join(', ') || 'Pets',
      },
      { label: 'Shipping', value: 'Tracked US delivery' },
    ],
    images: uniqueImages.length > 0 ? uniqueImages : [HERO_ASSETS.mainBanner],
    variations,
    default_variation_id: variations[0].variation_id,
    hasVariations,
  };
}

/**
 * Fetches live product categories via configured backend proxy (never exposing consumer_key/secret in browser).
 */
export async function fetchWooCategories(
  forceRefresh = false
): Promise<CategoriesFetchResult> {
  if (!isWooCommerceConfigured()) {
    return {
      categories: [],
      source: 'error',
      message: 'WooCommerce proxy endpoint is not configured.',
    };
  }

  if (!forceRefresh) {
    if (memoryCategoriesCache && Date.now() - memoryCategoriesCache.ts <= CACHE_TTL_MS) {
      return {
        categories: memoryCategoriesCache.data,
        source: 'woocommerce',
      };
    }
    const sessionCached = readSessionCache<WooCategory[]>(CATEGORIES_CACHE_KEY);
    if (sessionCached && sessionCached.length > 0) {
      memoryCategoriesCache = { ts: Date.now(), data: sessionCached };
      return {
        categories: sessionCached,
        source: 'woocommerce',
      };
    }
  }

  // Always coalesce concurrent category requests (even during forceRefresh)
  if (inFlightCategoriesPromise) {
    return inFlightCategoriesPromise;
  }

  const requestPromise = (async (): Promise<CategoriesFetchResult> => {
    try {
      const rawCats = await fetchWithDevStoreFallback<WooApiCategory[]>(
        '/products/categories',
        { per_page: '100', hide_empty: 'true' },
        '/products/categories',
        { per_page: '100' }
      );

      if (!Array.isArray(rawCats)) {
        throw new Error('Invalid categories response from WooCommerce proxy');
      }

      const excludedSlugs = new Set(['uncategorized', 'senza-categoria']);
      const mapped: WooCategory[] = sortWooCategories(
        rawCats
          .filter((c) => !excludedSlugs.has((c.slug || '').toLowerCase()))
          .map((c) => ({
            id: c.id,
            name: decodeHtmlEntities(c.name),
            slug: c.slug,
            parent: c.parent || 0,
            count: c.count || 0,
            image: c.image?.src || undefined,
          }))
      );

      memoryCategoriesCache = { ts: Date.now(), data: mapped };
      writeSessionCache(CATEGORIES_CACHE_KEY, mapped);

      return {
        categories: mapped,
        source: 'woocommerce',
      };
    } catch (err) {
      const staleCats = readSessionCache<WooCategory[]>(CATEGORIES_CACHE_KEY, true);
      if (staleCats && staleCats.length > 0) {
        return {
          categories: staleCats,
          source: 'woocommerce',
        };
      }
      return {
        categories: [],
        source: 'error',
        message:
          err instanceof Error
            ? `Unable to load WooCommerce categories (${err.message}).`
            : 'Unable to load WooCommerce categories.',
      };
    } finally {
      inFlightCategoriesPromise = null;
    }
  })();

  inFlightCategoriesPromise = requestPromise;
  return requestPromise;
}

function buildSubcategoryTree(
  parentId: number,
  allCategories: WooCategory[]
): MegaSubcategoryNode[] {
  return sortWooCategories(
    allCategories.filter((c) => c.parent === parentId)
  ).map((child) => {
    const grandchildren = buildSubcategoryTree(child.id, allCategories);
    return {
      id: child.id,
      name: child.name,
      slug: child.slug,
      count: child.count,
      ...(grandchildren.length > 0 ? { children: grandchildren } : {}),
    };
  });
}

function flattenSubcategoryTree(nodes: MegaSubcategoryNode[]): MegaSubcategoryNode[] {
  const flat: MegaSubcategoryNode[] = [];
  for (const node of nodes) {
    flat.push(node);
    if (node.children && node.children.length > 0) {
      flat.push(...flattenSubcategoryTree(node.children));
    }
  }
  return flat;
}

/**
 * Builds Mega Menu categories dynamically and exclusively from live WooCommerce categories and products.
 */
export function buildMegaCategoriesFromWoo(
  wooCategories: WooCategory[],
  products: Product[]
): MegaCategory[] {
  if (wooCategories.length === 0) {
    return [];
  }

  const parents = sortWooCategories(wooCategories.filter((c) => c.parent === 0));
  const topCategories = parents.length > 0 ? parents : sortWooCategories(wooCategories);

  return topCategories.map((cat) => {
    const subcategoryTree = buildSubcategoryTree(cat.id, wooCategories);
    const allDescendants = flattenSubcategoryTree(subcategoryTree);
    const matchingIds = getDescendantCategoryIds(cat.id, wooCategories);
    const matchingProducts = products.filter((p) =>
      p.categoryIds.some((id) => matchingIds.has(id))
    );

    let columns: MegaCategoryColumn[];

    if (allDescendants.length > 0) {
      columns = [
        {
          heading: 'Subcategories',
          links: [
            {
              label: `All ${cat.name} (${cat.count})`,
              filterTerm: '',
              categoryId: cat.id,
              categorySlug: cat.slug,
            },
            ...allDescendants.map((child) => ({
              label: `${child.name} (${child.count})`,
              filterTerm: child.name,
              categoryId: child.id,
              categorySlug: child.slug,
            })),
          ],
        },
        ...(matchingProducts.length > 0
          ? [
              {
                heading: `Popular in ${cat.name}`,
                links: matchingProducts.slice(0, 4).map((p) => ({
                  label: p.name,
                  filterTerm: '',
                  categoryId: cat.id,
                  categorySlug: cat.slug,
                })),
              },
            ]
          : []),
      ];
    } else {
      columns = [
        {
          heading: cat.name,
          links: [
            {
              label: `All ${cat.name} (${cat.count})`,
              filterTerm: '',
              categoryId: cat.id,
              categorySlug: cat.slug,
            },
          ],
        },
        ...(matchingProducts.length > 0
          ? [
              {
                heading: `Popular in ${cat.name}`,
                links: matchingProducts.slice(0, 4).map((p) => ({
                  label: p.name,
                  filterTerm: '',
                  categoryId: cat.id,
                  categorySlug: cat.slug,
                })),
              },
            ]
          : []),
      ];
    }

    return {
      id: cat.id,
      slug: cat.slug,
      name: cat.name,
      tagline: `${cat.count} ${cat.count === 1 ? 'item' : 'items'} in ${cat.name}`,
      count: cat.count,
      image: cat.image,
      iconName: inferIconName(cat.slug, cat.name),
      columns,
      subcategories: subcategoryTree,
      featuredProductId: matchingProducts[0]?.id,
    };
  });
}

/**
 * Fetches live published products via configured backend proxy.
 * Avoids firing N concurrent /variations requests on initial load to prevent API rate limiting (HTTP 429).
 */
export async function fetchCatalogProducts(
  forceRefresh = false
): Promise<CatalogFetchResult> {
  if (!isWooCommerceConfigured()) {
    return {
      products: [],
      source: 'error',
      message: 'WooCommerce proxy endpoint is not configured.',
    };
  }

  if (!forceRefresh) {
    if (memoryProductsCache && Date.now() - memoryProductsCache.ts <= CACHE_TTL_MS) {
      return {
        products: memoryProductsCache.data,
        source: 'woocommerce',
      };
    }
    const sessionCached = readSessionCache<Product[]>(PRODUCTS_CACHE_KEY);
    if (sessionCached && sessionCached.length > 0) {
      memoryProductsCache = { ts: Date.now(), data: sessionCached };
      return {
        products: sessionCached,
        source: 'woocommerce',
      };
    }
  }

  // Always coalesce concurrent product catalog requests (even during forceRefresh)
  if (inFlightProductsPromise) {
    return inFlightProductsPromise;
  }

  const requestPromise = (async (): Promise<CatalogFetchResult> => {
    try {
      const rawProducts = await fetchWithDevStoreFallback<WooApiProduct[]>(
        '/products',
        { per_page: '100', status: 'publish' },
        '/products',
        { per_page: '100' }
      );

      if (!Array.isArray(rawProducts)) {
        throw new Error('Invalid products response from WooCommerce proxy');
      }

      const mapped = rawProducts.map(mapWooProductToStoreProduct);
      memoryProductsCache = { ts: Date.now(), data: mapped };
      writeSessionCache(PRODUCTS_CACHE_KEY, mapped);

      return {
        products: mapped,
        source: 'woocommerce',
      };
    } catch (err) {
      const staleProducts = readSessionCache<Product[]>(PRODUCTS_CACHE_KEY, true);
      if (staleProducts && staleProducts.length > 0) {
        return {
          products: staleProducts,
          source: 'woocommerce',
        };
      }
      return {
        products: [],
        source: 'error',
        message:
          err instanceof Error
            ? `Unable to load WooCommerce catalog (${err.message}).`
            : 'Unable to load WooCommerce catalog.',
      };
    } finally {
      inFlightProductsPromise = null;
    }
  })();

  inFlightProductsPromise = requestPromise;
  return requestPromise;
}

/**
 * Lazy-loads live variation details for a single variable product on-demand,
 * reusing both memory and sessionStorage cache.
 */
export async function fetchProductVariations(
  productId: number,
  fallbackPrice: number,
  fallbackRegular?: number
): Promise<ProductVariation[] | null> {
  if (!isWooCommerceConfigured()) return null;

  const cached = readCachedVariation(productId);
  if (cached) return cached;

  const existingInFlight = inFlightVariationPromises.get(productId);
  if (existingInFlight) return existingInFlight;

  const requestPromise = (async (): Promise<ProductVariation[] | null> => {
    try {
      const rawPayload = await fetchWithDevStoreFallback<
        WooApiVariation[] | WooApiProduct
      >(
        `/products/${productId}/variations`,
        { per_page: '50' },
        `/products/${productId}`
      );

      let mapped: ProductVariation[] | null = null;
      if (Array.isArray(rawPayload) && rawPayload.length > 0) {
        mapped = mapVariationList(
          productId,
          rawPayload,
          fallbackPrice,
          fallbackRegular
        );
      } else if (
        rawPayload &&
        !Array.isArray(rawPayload) &&
        Array.isArray(rawPayload.variations)
      ) {
        const storeVars = rawPayload.variations.filter(
          (v): v is WooStoreApiVariation => typeof v === 'object' && v !== null && 'id' in v
        );
        if (storeVars.length > 0) {
          mapped = mapStoreVariationsToList(
            productId,
            storeVars,
            fallbackPrice,
            fallbackRegular
          );
        }
      }

      if (mapped && mapped.length > 0) {
        writePersistedVariation(productId, mapped);
      }
      return mapped;
    } catch {
      return null;
    } finally {
      inFlightVariationPromises.delete(productId);
    }
  })();

  inFlightVariationPromises.set(productId, requestPromise);
  return requestPromise;
}

export interface WooCheckoutBilling {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address_1: string;
  city: string;
  postcode: string;
  country: string;
  state?: string;
}

export interface WooCheckoutResult {
  ok: boolean;
  orderId?: number;
  orderNumber?: string;
  status?: string;
  paymentUrl?: string | null;
  error?: string;
}

/**
 * Submits cart items & customer billing details via a targeted POST /api/woocommerce/checkout call.
 * Eliminates ?add-to-cart=... query-string redirects and prevents duplicate concurrent submissions.
 */
export async function submitWooCommerceCheckout(
  items: CartItem[],
  billing: WooCheckoutBilling,
  paymentMethod: 'cod' | 'woocommerce_payments' = 'cod'
): Promise<WooCheckoutResult> {
  if (items.length === 0) {
    return { ok: false, error: 'Your cart is empty.' };
  }

  const remainingCooldown = getRateLimitRemainingSeconds();
  if (remainingCooldown > 0) {
    return {
      ok: false,
      error: `Checkout is cooling down after a WooCommerce rate limit. Please wait ${remainingCooldown}s.`,
    };
  }

  if (inFlightCheckoutPromise) {
    return inFlightCheckoutPromise;
  }

  const lineItems = items.map((item) => {
    const hasVariationId =
      item.product.hasVariations !== false &&
      Boolean(item.variation?.variation_id) &&
      item.variation.variation_id !== item.product.id;
    return {
      id: hasVariationId ? item.variation.variation_id : item.product.id,
      quantity: item.quantity,
    };
  });

  const checkoutUrl = buildProxyEndpoint('/checkout');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);

  inFlightCheckoutPromise = (async (): Promise<WooCheckoutResult> => {
    try {
      const response = await fetch(checkoutUrl, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: lineItems,
          billing,
          payment_method: paymentMethod,
        }),
        signal: controller.signal,
      });

      if (response.status === 429) {
        const errBody = (await response.json().catch(() => ({}))) as {
          error?: string;
          retryAfterSeconds?: number;
        };
        const retrySec = errBody.retryAfterSeconds || 60;
        setRateLimitCooldown(retrySec);
        return {
          ok: false,
          error:
            errBody.error ||
            `Too many requests to WooCommerce (HTTP 429). Please wait ${retrySec}s.`,
        };
      }

      const data = (await response.json().catch(() => ({}))) as WooCheckoutResult;
      if (!response.ok || !data.ok) {
        return {
          ok: false,
          error: data.error || `Checkout failed (HTTP ${response.status}).`,
        };
      }

      return data;
    } catch (err) {
      const isTimeout = err instanceof Error && err.name === 'AbortError';
      return {
        ok: false,
        error: isTimeout
          ? 'Checkout request timed out. Please try again.'
          : 'Network error while submitting checkout.',
      };
    } finally {
      clearTimeout(timer);
      inFlightCheckoutPromise = null;
    }
  })();

  return inFlightCheckoutPromise;
}
