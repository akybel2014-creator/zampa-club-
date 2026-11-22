import { isWooCommerceConfigured, WOOCOMMERCE_CONFIG } from '../config/woocommerce';
import { MOCK_PRODUCTS } from '../data/mockProducts';
import { CartItem, MacroCategorySlug, Product, ProductVariation } from '../types/shop';

export interface CatalogFetchResult {
  products: Product[];
  source: 'woocommerce' | 'fallback';
  message?: string;
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

function mapCategorySlug(categories: { slug: string; name: string }[]): {
  slug: MacroCategorySlug;
  label: string;
} {
  for (const cat of categories) {
    const s = `${cat.slug} ${cat.name}`.toLowerCase();
    if (s.includes('gatt') || s.includes('cat')) {
      return { slug: 'gatti', label: cat.name || 'Gatti' };
    }
    if (s.includes('viagg') || s.includes('trasp') || s.includes('travel')) {
      return { slug: 'viaggio-trasporto', label: cat.name || 'Viaggio & Trasporto' };
    }
    if (s.includes('cur') || s.includes('toelett') || s.includes('groom')) {
      return { slug: 'cura-toelettatura', label: cat.name || 'Cura & Toelettatura' };
    }
    if (s.includes('tech') || s.includes('smart') || s.includes('wifi')) {
      return { slug: 'smart-pet-tech', label: cat.name || 'Smart Pet Tech' };
    }
    if (
      s.includes('piccol') ||
      s.includes('conigl') ||
      s.includes('roditor') ||
      s.includes('uccell')
    ) {
      return { slug: 'piccoli-animali', label: cat.name || 'Piccoli Animali' };
    }
    if (s.includes('can') || s.includes('dog')) {
      return { slug: 'cani', label: cat.name || 'Cani' };
    }
  }
  const first = categories[0];
  return { slug: 'cani', label: first?.name || 'Cani' };
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

  const mappedCat = mapCategorySlug(wp.categories || []);

  let variations: ProductVariation[];

  if (fetchedVariations && fetchedVariations.length > 0) {
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
        label: labelParts.length > 0 ? labelParts.join(' · ') : `Variante #${v.id}`,
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
    name: wp.name,
    brand: 'Zampa Club',
    categorySlug: mappedCat.slug,
    categoryLabel: mappedCat.label,
    subcategories: (wp.categories || []).map((c) => c.name),
    price: minVariationPrice || effectivePrice,
    regular_price: matchingVar.regular_price ?? effectiveRegular,
    rating: parseFloat(wp.average_rating || '4.8') || 4.8,
    reviews_count: wp.rating_count || 0,
    sales_count: wp.total_sales || 0,
    short_description:
      stripHtml(wp.short_description || '') ||
      stripHtml(wp.description || '').slice(0, 140) ||
      'Prodotto selezionato su Zampa Club.',
    description:
      stripHtml(wp.description || '') ||
      stripHtml(wp.short_description || '') ||
      'Accessorio per animali domestici disponibile su Zampa Club.',
    specs: [
      { label: 'ID WooCommerce', value: `#${wp.id}` },
      { label: 'Categorie', value: (wp.categories || []).map((c) => c.name).join(', ') || 'Pet' },
      { label: 'Spedizione', value: 'Tracciata in tutta Italia' },
    ],
    images:
      uniqueImages.length > 0
        ? uniqueImages
        : ['/src/assets/images/prod_cuccia_nuvola_1795364644235.jpg'],
    variations,
    default_variation_id: variations[0].variation_id,
  };
}

/**
 * Recupera i prodotti reali tramite:
 * GET https://zampaclub.it/wp-json/wc/v3/products?per_page=20&status=publish
 * con autenticazione consumer_key e consumer_secret come query params.
 * Se le chiavi API non sono ancora inserite o la richiesta fallisce, utilizza
 * automaticamente il catalogo curato di fallback.
 */
export async function fetchCatalogProducts(): Promise<CatalogFetchResult> {
  if (!isWooCommerceConfigured()) {
    return {
      products: MOCK_PRODUCTS,
      source: 'fallback',
      message: 'Catalogo locale attivo (inserisci Consumer Key e Secret in src/config/woocommerce.ts).',
    };
  }

  try {
    const baseUrl = WOOCOMMERCE_CONFIG.WP_STORE_URL.replace(/\/+$/, '');
    const endpoint = new URL(`${baseUrl}/wp-json/wc/v3/products`);
    endpoint.searchParams.set('per_page', '20');
    endpoint.searchParams.set('status', 'publish');
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
    if (!Array.isArray(rawProducts) || rawProducts.length === 0) {
      return {
        products: MOCK_PRODUCTS,
        source: 'fallback',
        message: 'Nessun prodotto pubblicato trovato su WooCommerce.',
      };
    }

    // Recupera le varianti reali per i prodotti variabili
    const variationsByProductId = new Map<number, WooApiVariation[]>();
    const variableProducts = rawProducts.filter(
      (p) => (p.type === 'variable' || (p.variations && p.variations.length > 0))
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
    return {
      products: MOCK_PRODUCTS,
      source: 'fallback',
      message: 'Connessione WooCommerce non raggiungibile: attivo fallback locale.',
    };
  }
}

/**
 * Costruisce l'URL di checkout reale verso WooCommerce:
 * https://zampaclub.it/checkout/?add-to-cart=ID1:QTA1,ID2:QTA2
 * usando l'ID della variante selezionata se presente, altrimenti l'ID del prodotto.
 */
export function buildWooCommerceCheckoutUrl(items: CartItem[]): {
  url: string;
  isMultiItem: boolean;
  payloadSummary: { name: string; variationLabel: string; targetId: number; qty: number }[];
} {
  const baseUrl = WOOCOMMERCE_CONFIG.WP_STORE_URL.replace(/\/+$/, '');
  const payloadSummary = items.map((item) => ({
    name: item.product.name,
    variationLabel: item.variation.label,
    targetId: item.variation?.variation_id || item.product.id,
    qty: item.quantity,
  }));

  if (items.length === 0) {
    return {
      url: `${baseUrl}/checkout/`,
      isMultiItem: false,
      payloadSummary,
    };
  }

  const cartParam = payloadSummary
    .map((entry) => `${entry.targetId}:${entry.qty}`)
    .join(',');

  return {
    url: `${baseUrl}/checkout/?add-to-cart=${cartParam}`,
    isMultiItem: items.length > 1,
    payloadSummary,
  };
}
