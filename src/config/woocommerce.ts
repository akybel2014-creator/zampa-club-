export interface WooCommerceConfig {
  WP_STORE_URL: string;
  WC_PROXY_URL: string;
  FREE_SHIPPING_THRESHOLD: number;
  STANDARD_SHIPPING_COST: number;
  CURRENCY_SYMBOL: string;
}

/**
 * Configurazione pubblica frontend per Zampa Club.
 * Le credenziali private WooCommerce (WC_CONSUMER_KEY / WC_CONSUMER_SECRET)
 * restano esclusivamente lato server su process.env e non vengono mai esposte al browser.
 */
export const WP_STORE_URL = (
  import.meta.env.VITE_WP_STORE_URL || 'https://zampaclub.it'
).replace(/\/+$/, '');

export const WC_PROXY_URL = (
  import.meta.env.VITE_WC_PROXY_URL || '/api/woocommerce'
).replace(/\/+$/, '');

export const WOOCOMMERCE_CONFIG: WooCommerceConfig = {
  WP_STORE_URL,
  WC_PROXY_URL,
  FREE_SHIPPING_THRESHOLD: 39,
  STANDARD_SHIPPING_COST: 4.9,
  CURRENCY_SYMBOL: '$',
};

export function isWooCommerceConfigured(): boolean {
  return Boolean(WC_PROXY_URL) && Boolean(WP_STORE_URL);
}

export function formatUsd(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
