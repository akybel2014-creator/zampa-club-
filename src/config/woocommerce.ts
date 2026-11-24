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

/**
 * Recommended WordPress PHP snippet (via WPCode plugin) to support
 * adding multiple product/variation IDs with quantities via URL:
 * https://zampaclub.it/pagamento/?add-to-cart=ID1:QTY1,ID2:QTY2
 */
export const WPCODE_MULTI_CART_PHP_SNIPPET = `add_action('wp_loaded', function() {
  if (empty($_REQUEST['add-to-cart'])) return;
  $raw = sanitize_text_field($_REQUEST['add-to-cart']);
  if (strpos($raw, ',') === false && strpos($raw, ':') === false) return;
  $items = explode(',', $raw);
  foreach ($items as $item) {
    $parts = explode(':', trim($item));
    $id = absint($parts[0]);
    $qty = isset($parts[1]) ? max(1, absint($parts[1])) : 1;
    if ($id > 0) WC()->cart->add_to_cart($id, $qty);
  }
  wp_safe_redirect(wc_get_checkout_url());
  exit;
}, 15);`;
