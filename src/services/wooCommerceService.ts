import { isWooCommerceConfigured, WOOCOMMERCE_CONFIG } from '../config/woocommerce';
import { MEGA_CATEGORIES, STATIC_WOO_CATEGORIES } from '../data/categories';
import { MOCK_PRODUCTS } from '../data/mockProducts';
import {
  CartItem,
  MacroCategorySlug,
  MegaCategory,
  MegaCategoryColumn,
  Product,
  ProductVariation,
  WooCategory,
} from '../types/shop';

export interface CatalogFetchResult {
  products: Product[];
  source: 'woocommerce' | 'fallback';
  message?: string;
}

export interface CategoriesFetchResult {
  categories: WooCategory[];
  source: 'woocommerce' | 'fallback';
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
  if (s.includes('travel') || s.includes('carrier') || s.includes('viagg') || s.includes('trasp')) {
    return 'Luggage';
  }
  if (s.includes('groom') || s.includes('care') || s.includes('cur') || s.includes('toelett')) {
    return 'Sparkles';
  }
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
  if (s.includes('new') || s.includes('novit')) return 'Star';
  return 'Dog';
}

function mapCategorySlug(categories: { slug: string; name: string }[]): {
  slug: MacroCategorySlug;
  label: string;
} {
  const first = categories[0];
  if (!first) return { slug: 'dogs', label: 'All Pets' };
  return {
    slug: first.slug,
    label: decodeHtmlEntities(first.name),
  };
}

function parsePrice(val: string | undefined): number {
  const num = parseFloat((val || '').replace(',', '.'));
  return Number.isFinite(num) && num > 0 ? num : 0;
}

function mapWooProductToStoreProduct(
  wp: WooApiProduct,
  fetchedVariations?: WooApiVariation[]
): Product {
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

  let variations: ProductVariation[];
  let hasVariations = false;

  if (fetchedVariations && fetchedVariations.length > 0) {
    hasVariations = true;
    variations = fetchedVariations.map((v) => {
      const vSale = parsePrice(v.sale_price);
      const vCurr = parsePrice(v.price);
      const vReg = parsePrice(v.regular_price);
      const vEffective = (vSale > 0 ? vSale : vCurr || vReg) || effectivePrice;
      const vRegular = vReg > vEffective ? vReg : effectiveRegular;

      const labelParts = (v.attributes || [])
        .map((a) => `${a.name}: ${a.option}`)
        .filter(Boolean);

      return {
        variation_id: v.id,
        label: labelParts.length > 0 ? labelParts.join(' · ') : `Option #${v.id}`,
        size: v.attributes?.[0]?.option,
        color: v.attributes?.[1]?.option,
        price: vEffective,
        regular_price: vRegular,
        sku: v.sku || `WC-${wp.id}-${v.id}`,
        in_stock: v.stock_status !== 'outofstock',
      };
    });
  } else {
    const firstAttr = wp.attributes?.[0];
    if (firstAttr && firstAttr.options.length > 0 && wp.variations && wp.variations.length > 0) {
      hasVariations = true;
      variations = firstAttr.options.map((opt, idx) => ({
        variation_id: wp.variations?.[idx] || wp.id,
        label: `${firstAttr.name}: ${opt}`,
        size: opt,
        price: effectivePrice,
        regular_price: effectiveRegular,
        sku: `WC-${wp.id}-${idx + 1}`,
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
  }

  const gallery = [
    ...(wp.images || []).map((img) => img.src).filter(Boolean),
    ...(fetchedVariations || [])
      .map((v) => v.image?.src)
      .filter((src): src is string => Boolean(src)),
  ];
  const uniqueImages = Array.from(new Set(gallery));

  const minVariationPrice = Math.min(...variations.map((v) => v.price));
  const matchingVar = variations.find((v) => v.price === minVariationPrice) || variations[0];

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
    price: minVariationPrice || effectivePrice,
    regular_price: matchingVar.regular_price ?? effectiveRegular,
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
    images:
      uniqueImages.length > 0
        ? uniqueImages
        : ['/src/assets/images/prod_cuccia_nuvola_1795364644235.jpg'],
    variations,
    default_variation_id: variations[0].variation_id,
    hasVariations,
  };
}

/**
 * Fetches dynamic product categories from WooCommerce:
 * GET ${WP_STORE_URL}/wp-json/wc/v3/products/categories?per_page=100&hide_empty=true
 * Falls back to static English categories if unconfigured or unreachable.
 */
export async function fetchWooCategories(): Promise<CategoriesFetchResult> {
  if (!isWooCommerceConfigured()) {
    return {
      categories: STATIC_WOO_CATEGORIES,
      source: 'fallback',
    };
  }

  try {
    const baseUrl = WOOCOMMERCE_CONFIG.WP_STORE_URL.replace(/\/+$/, '');
    const endpoint = new URL(`${baseUrl}/wp-json/wc/v3/products/categories`);
    endpoint.searchParams.set('per_page', '100');
    endpoint.searchParams.set('hide_empty', 'true');
    endpoint.searchParams.set('consumer_key', WOOCOMMERCE_CONFIG.WC_CONSUMER_KEY);
    endpoint.searchParams.set('consumer_secret', WOOCOMMERCE_CONFIG.WC_CONSUMER_SECRET);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(endpoint.toString(), {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const rawCats = (await response.json()) as WooApiCategory[];
    if (!Array.isArray(rawCats) || rawCats.length === 0) {
      return {
        categories: STATIC_WOO_CATEGORIES,
        source: 'fallback',
      };
    }

    const mapped: WooCategory[] = rawCats
      .filter((c) => c.slug !== 'uncategorized')
      .map((c) => ({
        id: c.id,
        name: decodeHtmlEntities(c.name),
        slug: c.slug,
        parent: c.parent || 0,
        count: c.count || 0,
        image: c.image?.src || undefined,
      }));

    if (mapped.length === 0) {
      return {
        categories: STATIC_WOO_CATEGORIES,
        source: 'fallback',
      };
    }

    return {
      categories: mapped,
      source: 'woocommerce',
    };
  } catch {
    return {
      categories: STATIC_WOO_CATEGORIES,
      source: 'fallback',
    };
  }
}

/**
 * Builds Mega Menu categories dynamically from WooCommerce categories.
 * If source is fallback, returns the curated static MEGA_CATEGORIES.
 */
export function buildMegaCategoriesFromWoo(
  wooCategories: WooCategory[],
  source: 'woocommerce' | 'fallback',
  products: Product[]
): MegaCategory[] {
  if (source !== 'woocommerce' || wooCategories.length === 0) {
    return MEGA_CATEGORIES;
  }

  const parents = wooCategories.filter((c) => c.parent === 0);
  const topCategories = parents.length > 0 ? parents : wooCategories;

  return topCategories.slice(0, 8).map((cat) => {
    const children = wooCategories.filter((c) => c.parent === cat.id);
    const matchingProducts = products.filter((p) => p.categoryIds.includes(cat.id));

    let columns: MegaCategoryColumn[];

    if (children.length > 0) {
      // Distribute subcategories evenly across up to 3 columns
      const colBuckets: MegaCategoryColumn[] = [
        { heading: 'Collections', links: [] },
        { heading: 'Essentials', links: [] },
        { heading: 'More in ' + cat.name, links: [] },
      ];
      children.forEach((child, idx) => {
        colBuckets[idx % 3].links.push({
          label: `${child.name} (${child.count})`,
          filterTerm: child.name,
          categoryId: child.id,
          categorySlug: child.slug,
        });
      });
      columns = colBuckets.filter((b) => b.links.length > 0);
    } else {
      columns = [
        {
          heading: cat.name,
          links: [
            {
              label: `All ${cat.name} (${cat.count})`,
              filterTerm: cat.name,
              categoryId: cat.id,
              categorySlug: cat.slug,
            },
          ],
        },
        {
          heading: 'Highlights',
          links: matchingProducts.slice(0, 3).map((p) => ({
            label: p.name,
            filterTerm: cat.name,
            categoryId: cat.id,
            categorySlug: cat.slug,
          })),
        },
      ].filter((col) => col.links.length > 0);
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
      featuredProductId: matchingProducts[0]?.id,
    };
  });
}

/**
 * Fetches live products from WooCommerce REST API v3:
 * GET https://zampaclub.it/wp-json/wc/v3/products?per_page=20&status=publish
 * Optionally filters by category ID (?category=...) when provided.
 */
export async function fetchCatalogProducts(
  categoryId?: number
): Promise<CatalogFetchResult> {
  if (!isWooCommerceConfigured()) {
    const filtered = categoryId
      ? MOCK_PRODUCTS.filter((p) => p.categoryIds.includes(categoryId))
      : MOCK_PRODUCTS;
    return {
      products: filtered,
      source: 'fallback',
      message: 'Local catalog active (configure Consumer Key & Secret in src/config/woocommerce.ts).',
    };
  }

  try {
    const baseUrl = WOOCOMMERCE_CONFIG.WP_STORE_URL.replace(/\/+$/, '');
    const endpoint = new URL(`${baseUrl}/wp-json/wc/v3/products`);
    endpoint.searchParams.set('per_page', '20');
    endpoint.searchParams.set('status', 'publish');
    if (categoryId) {
      endpoint.searchParams.set('category', String(categoryId));
    }
    endpoint.searchParams.set('consumer_key', WOOCOMMERCE_CONFIG.WC_CONSUMER_KEY);
    endpoint.searchParams.set('consumer_secret', WOOCOMMERCE_CONFIG.WC_CONSUMER_SECRET);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(endpoint.toString(), {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const rawProducts = (await response.json()) as WooApiProduct[];
    if (!Array.isArray(rawProducts)) {
      throw new Error('Invalid products response');
    }

    if (rawProducts.length === 0) {
      if (categoryId) {
        return {
          products: [],
          source: 'woocommerce',
        };
      }
      return {
        products: MOCK_PRODUCTS,
        source: 'fallback',
        message: 'No published products found on WooCommerce.',
      };
    }

    const variationsByProductId = new Map<number, WooApiVariation[]>();
    const variableProducts = rawProducts.filter(
      (p) => p.type === 'variable' || (p.variations && p.variations.length > 0)
    );

    if (variableProducts.length > 0) {
      await Promise.allSettled(
        variableProducts.map(async (vp) => {
          const varEndpoint = new URL(`${baseUrl}/wp-json/wc/v3/products/${vp.id}/variations`);
          varEndpoint.searchParams.set('per_page', '50');
          varEndpoint.searchParams.set('consumer_key', WOOCOMMERCE_CONFIG.WC_CONSUMER_KEY);
          varEndpoint.searchParams.set('consumer_secret', WOOCOMMERCE_CONFIG.WC_CONSUMER_SECRET);
          const varRes = await fetch(varEndpoint.toString(), {
            method: 'GET',
            headers: { Accept: 'application/json' },
          });
          if (varRes.ok) {
            const vars = (await varRes.json()) as WooApiVariation[];
            if (Array.isArray(vars) && vars.length > 0) {
              variationsByProductId.set(vp.id, vars);
            }
          }
        })
      );
    }

    return {
      products: rawProducts.map((wp) =>
        mapWooProductToStoreProduct(wp, variationsByProductId.get(wp.id))
      ),
      source: 'woocommerce',
    };
  } catch {
    const filtered = categoryId
      ? MOCK_PRODUCTS.filter((p) => p.categoryIds.includes(categoryId))
      : MOCK_PRODUCTS;
    return {
      products: filtered,
      source: 'fallback',
      message: 'WooCommerce API unreachable: local fallback catalog active.',
    };
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
