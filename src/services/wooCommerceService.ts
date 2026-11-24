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

interface WooApiProduct {
  id: number;
  slug: string;
  name: string;
  type?: string;
  price: string;
  regular_price: string;
  sale_price: string;
  on_sale?: boolean;
  average_rating: string;
  rating_count: number;
  total_sales: number;
  short_description: string;
  description: string;
  images: { src: string; alt?: string }[];
  categories: { id: number; name: string; slug: string }[];
  variations?: number[];
  attributes?: { name: string; options: string[] }[];
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const PRODUCTS_CACHE_KEY = 'zampaclub_wc_products_v1';
const CATEGORIES_CACHE_KEY = 'zampaclub_wc_categories_v1';

let memoryProductsCache: { ts: number; data: Product[] } | null = null;
let memoryCategoriesCache: { ts: number; data: WooCategory[] } | null = null;
const memoryVariationsCache = new Map<number, ProductVariation[]>();

function readSessionCache<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { ts: number; data: T };
    if (Date.now() - parsed.ts > CACHE_TTL_MS) {
      sessionStorage.removeItem(key);
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

export function clearWooCommerceCache(): void {
  memoryProductsCache = null;
  memoryCategoriesCache = null;
  try {
    sessionStorage.removeItem(PRODUCTS_CACHE_KEY);
    sessionStorage.removeItem(CATEGORIES_CACHE_KEY);
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

async function fetchJsonWithRetry<T>(
  url: string,
  { timeoutMs = 20000, maxRetries = 2 }: { timeoutMs?: number; maxRetries?: number } = {}
): Promise<T> {
  let lastError: Error = new Error('Network error');

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timer);

      if ((response.status === 429 || response.status >= 500) && attempt < maxRetries) {
        const delayMs = 1200 * (attempt + 1);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return (await response.json()) as T;
    } catch (err) {
      clearTimeout(timer);
      lastError = err instanceof Error ? err : new Error('Request failed');
      if (attempt < maxRetries) {
        const delayMs = 1000 * (attempt + 1);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
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

function mapWooProductToStoreProduct(wp: WooApiProduct): Product {
  const salePrice = parsePrice(wp.sale_price);
  const currentPrice = parsePrice(wp.price);
  const regularPrice = parsePrice(wp.regular_price);

  const effectivePrice =
    (salePrice > 0 ? salePrice : currentPrice || regularPrice) || 29.9;
  const effectiveRegular =
    regularPrice > effectivePrice ? regularPrice : undefined;

  const cleanCategories = (wp.categories || []).map((c) => ({
    id: c.id,
    name: decodeHtmlEntities(c.name),
    slug: c.slug,
  }));
  const mappedCat = mapCategorySlug(cleanCategories);

  const isVariable = wp.type === 'variable' || (wp.variations && wp.variations.length > 0);
  const firstAttr = wp.attributes?.[0];

  let variations: ProductVariation[];
  let hasVariations = false;

  if (isVariable && firstAttr && firstAttr.options.length > 0) {
    hasVariations = true;
    variations = firstAttr.options.map((opt, idx) => ({
      variation_id: wp.variations?.[idx] || wp.id,
      label: `${decodeHtmlEntities(firstAttr.name)}: ${decodeHtmlEntities(opt)}`,
      size: opt,
      price: effectivePrice,
      regular_price: effectiveRegular,
      sku: `WC-${wp.id}-${idx + 1}`,
      in_stock: true,
    }));
  } else if (isVariable && wp.variations && wp.variations.length > 0) {
    hasVariations = true;
    variations = wp.variations.map((varId, idx) => ({
      variation_id: varId,
      label: `Option ${idx + 1}`,
      price: effectivePrice,
      regular_price: effectiveRegular,
      sku: `WC-${wp.id}-${varId}`,
      in_stock: true,
    }));
  } else {
    hasVariations = false;
    variations = [
      {
        variation_id: wp.id,
        label: 'Standard',
        price: effectivePrice,
        regular_price: effectiveRegular,
        sku: `WC-${wp.id}`,
        in_stock: true,
      },
    ];
  }

  const uniqueImages = Array.from(
    new Set((wp.images || []).map((img) => img.src).filter(Boolean))
  );

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
    reviews_count: wp.rating_count || 0,
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
 * Fetches live product categories exclusively from WooCommerce REST API v3.
 */
export async function fetchWooCategories(
  forceRefresh = false
): Promise<CategoriesFetchResult> {
  if (!isWooCommerceConfigured()) {
    return {
      categories: [],
      source: 'error',
      message: 'WooCommerce API credentials are not configured.',
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

  try {
    const baseUrl = WOOCOMMERCE_CONFIG.WP_STORE_URL.replace(/\/+$/, '');
    const endpoint = new URL(`${baseUrl}/wp-json/wc/v3/products/categories`);
    endpoint.searchParams.set('per_page', '100');
    endpoint.searchParams.set('hide_empty', 'true');
    endpoint.searchParams.set('consumer_key', WOOCOMMERCE_CONFIG.WC_CONSUMER_KEY);
    endpoint.searchParams.set('consumer_secret', WOOCOMMERCE_CONFIG.WC_CONSUMER_SECRET);

    const rawCats = await fetchJsonWithRetry<WooApiCategory[]>(endpoint.toString());
    if (!Array.isArray(rawCats)) {
      throw new Error('Invalid categories response from WooCommerce');
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
    return {
      categories: [],
      source: 'error',
      message:
        err instanceof Error
          ? `Unable to load WooCommerce categories (${err.message}).`
          : 'Unable to load WooCommerce categories.',
    };
  }
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
 * Fetches live published products exclusively from WooCommerce REST API v3.
 * Avoids firing N concurrent /variations requests on initial load to prevent API rate limiting (HTTP 429).
 */
export async function fetchCatalogProducts(
  forceRefresh = false
): Promise<CatalogFetchResult> {
  if (!isWooCommerceConfigured()) {
    return {
      products: [],
      source: 'error',
      message: 'WooCommerce API credentials are not configured.',
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

  try {
    const baseUrl = WOOCOMMERCE_CONFIG.WP_STORE_URL.replace(/\/+$/, '');
    const endpoint = new URL(`${baseUrl}/wp-json/wc/v3/products`);
    endpoint.searchParams.set('per_page', '100');
    endpoint.searchParams.set('status', 'publish');
    endpoint.searchParams.set('consumer_key', WOOCOMMERCE_CONFIG.WC_CONSUMER_KEY);
    endpoint.searchParams.set('consumer_secret', WOOCOMMERCE_CONFIG.WC_CONSUMER_SECRET);

    const rawProducts = await fetchJsonWithRetry<WooApiProduct[]>(endpoint.toString());
    if (!Array.isArray(rawProducts)) {
      throw new Error('Invalid products response from WooCommerce');
    }

    const mapped = rawProducts.map(mapWooProductToStoreProduct);
    memoryProductsCache = { ts: Date.now(), data: mapped };
    writeSessionCache(PRODUCTS_CACHE_KEY, mapped);

    return {
      products: mapped,
      source: 'woocommerce',
    };
  } catch (err) {
    return {
      products: [],
      source: 'error',
      message:
        err instanceof Error
          ? `Unable to load WooCommerce catalog (${err.message}).`
          : 'Unable to load WooCommerce catalog.',
    };
  }
}

/**
 * Lazy-loads live variation details for a single variable product on-demand (e.g. when ProductModal opens).
 */
export async function fetchProductVariations(
  productId: number,
  fallbackPrice: number,
  fallbackRegular?: number
): Promise<ProductVariation[] | null> {
  if (!isWooCommerceConfigured()) return null;

  const cached = memoryVariationsCache.get(productId);
  if (cached) return cached;

  try {
    const baseUrl = WOOCOMMERCE_CONFIG.WP_STORE_URL.replace(/\/+$/, '');
    const endpoint = new URL(`${baseUrl}/wp-json/wc/v3/products/${productId}/variations`);
    endpoint.searchParams.set('per_page', '50');
    endpoint.searchParams.set('consumer_key', WOOCOMMERCE_CONFIG.WC_CONSUMER_KEY);
    endpoint.searchParams.set('consumer_secret', WOOCOMMERCE_CONFIG.WC_CONSUMER_SECRET);

    const rawVars = await fetchJsonWithRetry<WooApiVariation[]>(endpoint.toString(), {
      timeoutMs: 12000,
      maxRetries: 1,
    });
    if (!Array.isArray(rawVars) || rawVars.length === 0) return null;

    const mapped = mapVariationList(productId, rawVars, fallbackPrice, fallbackRegular);
    memoryVariationsCache.set(productId, mapped);
    return mapped;
  } catch {
    return null;
  }
}

/**
 * Builds the WooCommerce checkout URL:
 * https://zampaclub.it/pagamento/?add-to-cart=ID1:QTY1,ID2:QTY2
 * Uses variation_id when a variation is selected, otherwise product_id.
 */
export function buildWooCommerceCheckoutUrl(items: CartItem[]): {
  url: string;
  isMultiItem: boolean;
  payloadSummary: { name: string; variationLabel: string; targetId: number; qty: number }[];
} {
  const baseUrl = WOOCOMMERCE_CONFIG.WP_STORE_URL.replace(/\/+$/, '');
  const payloadSummary = items.map((item) => {
    const hasVariationId =
      item.product.hasVariations !== false &&
      Boolean(item.variation?.variation_id) &&
      item.variation.variation_id !== item.product.id;

    return {
      name: item.product.name,
      variationLabel: item.variation.label,
      targetId: hasVariationId ? item.variation.variation_id : item.product.id,
      qty: item.quantity,
    };
  });

  if (items.length === 0) {
    return {
      url: `${baseUrl}/pagamento/`,
      isMultiItem: false,
      payloadSummary,
    };
  }

  const cartParam = payloadSummary
    .map((entry) => `${entry.targetId}:${entry.qty}`)
    .join(',');

  return {
    url: `${baseUrl}/pagamento/?add-to-cart=${cartParam}`,
    isMultiItem: items.length > 1,
    payloadSummary,
  };
}
