export interface WooCommerceConfig {
  WP_STORE_URL: string;
  WC_CONSUMER_KEY: string;
  WC_CONSUMER_SECRET: string;
  FREE_SHIPPING_THRESHOLD: number;
  STANDARD_SHIPPING_COST: number;
  CURRENCY_SYMBOL: string;
}

/**
 * Configurazione integrazione WordPress + WooCommerce (con prodotti da CJ Dropshipping).
 *
 * Istruzioni rapide:
 * 1. Sostituisci WP_STORE_URL con il dominio del tuo negozio WordPress (senza slash finale).
 * 2. Su WordPress vai in WooCommerce -> Impostazioni -> Avanzate -> API REST
 *    e genera una chiave con permessi "Solo lettura" (Read).
 * 3. Inserisci Consumer Key e Consumer Secret qui sotto (oppure tramite variabili Vite).
 */
export const WP_STORE_URL =
  import.meta.env.VITE_WP_STORE_URL || 'https://zampaclub.it';
export const WC_CONSUMER_KEY =
  import.meta.env.VITE_WC_CONSUMER_KEY ||
  'ck_6415ed9e4befd8767b6df292f09ddbe14c28155e';
export const WC_CONSUMER_SECRET =
  import.meta.env.VITE_WC_CONSUMER_SECRET ||
  'cs_b51a54fa75005e8216723ffd72256f82408a7c6f';

export const WOOCOMMERCE_CONFIG: WooCommerceConfig = {
  WP_STORE_URL,
  WC_CONSUMER_KEY,
  WC_CONSUMER_SECRET,
  FREE_SHIPPING_THRESHOLD: 39,
  STANDARD_SHIPPING_COST: 4.9,
  CURRENCY_SYMBOL: '€',
};

export function isWooCommerceConfigured(): boolean {
  const { WP_STORE_URL: storeUrl, WC_CONSUMER_KEY: key, WC_CONSUMER_SECRET: secret } =
    WOOCOMMERCE_CONFIG;
  return (
    Boolean(storeUrl) &&
    !storeUrl.includes('tuonegozio-zampaclub.it') &&
    Boolean(key) &&
    !key.includes('INCOLLA_QUI') &&
    !key.includes('INSERISCI') &&
    Boolean(secret) &&
    !secret.includes('INCOLLA_QUI') &&
    !secret.includes('INSERISCI')
  );
}

/**
 * Snippet PHP consigliato su WordPress (via plugin WPCode) per permettere
 * a WooCommerce di aggiungere uno o più ID prodotto/variante con quantità
 * tramite URL: https://zampaclub.it/pagamento/?add-to-cart=ID1:QTA1,ID2:QTA2
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
